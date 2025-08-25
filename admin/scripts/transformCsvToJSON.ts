#!/usr/bin/env ts-node
/*
Transforms a CSV of recipes into JSON with smart coercion.
Produces a token dictionary mapping normalized ingredient words -> integer ids.

Usage:
  ts-node TransformCsvToJSON.ts --input data/recipes.csv --output data/recipes.json --pretty

Options:
  --input  | -i   Input CSV path (required)
  --output | -o   Output JSON path (optional, defaults next to CSV)
  --delimiter | -d  Delimiter char, default ','
  --pretty        Pretty print JSON
  --utf8NoBom     Write UTF8 without BOM (default true)
*/
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { Recipe } from "sharedtypes";

// Use CommonJS requires so the script can run under ts-node in CommonJS mode
const fs: typeof import("fs") = require("fs");
const path: typeof import("path") = require("path");

type AnyObj = { [k: string]: any };

function usageAndExit(msg?: string): never {
  if (msg) console.error(msg);
  console.error("Usage: ts-node TransformCsvToJSON.ts --input <csv> [--output <json>] [--pretty]");
  process.exit(msg ? 2 : 1);
}

// --- CLI parsing (very small) ---
const argv = process.argv.slice(2);
let inputCsv = "";
let outputJson = "";
let delimiter = ",";
let pretty = false;
let utf8NoBom = true;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  switch (a) {
    case "--input":
    case "-i":
      inputCsv = argv[++i] || "";
      break;
    case "--output":
    case "-o":
      outputJson = argv[++i] || "";
      break;
    case "--delimiter":
    case "-d":
      delimiter = argv[++i] || ",";
      break;
    case "--pretty":
      pretty = true;
      break;
    case "--utf8NoBom":
      utf8NoBom = true;
      break;
    default:
      if (a.startsWith("--")) {
        usageAndExit(`Unknown option: ${a}`);
      } else if (!inputCsv) {
        inputCsv = a;
      } else if (!outputJson) {
        outputJson = a;
      } else {
        // ignore
      }
  }
}

if (!inputCsv) usageAndExit("Missing input CSV");

if (!fs.existsSync(inputCsv) || !fs.statSync(inputCsv).isFile()) {
  usageAndExit(`Input CSV file not found: ${inputCsv}`);
}

const inputDir = path.dirname(inputCsv) || process.cwd();
if (!outputJson) {
  const defaultName = path.basename(inputCsv, path.extname(inputCsv)) + ".json";
  outputJson = path.join(inputDir, defaultName);
} else {
  const outDir = path.dirname(outputJson);
  if (!outDir || outDir === ".") {
    outputJson = path.join(inputDir, outputJson);
  } else {
    outputJson = path.resolve(outputJson);
  }
}

let outParent = path.dirname(outputJson);
if (!outParent) outParent = inputDir;
if (!fs.existsSync(outParent)) fs.mkdirSync(outParent, { recursive: true });

async function mapWordsToTokens({ words, useModel = false }: { words: string[]; useModel?: boolean }): Promise<any> {
  const wordString = `${JSON.stringify([
    ...new Set(
      words
        .join(" ")
        .replace(/[^\w]+/g, " ")
        .split(" ")
    ),
  ])}`;

  const aiInputPath = path.join(outParent, "aiInput.json");
  fs.writeFileSync(aiInputPath, wordString, { encoding: "utf8" });

  // Build a prompt asking the model to return JSON array of {word:isIngredient}
  const systemPrompt = `You are an expert linguistic processing API designed for the Mistral-Nemo model. Your task is to process an array of words through a precise multi-step transformation and return a structured JSON response.

Follow these steps exactly:

1. Filter for Nouns: Analyze the input array and create a temporary list containing only words that are nouns. Discard all non-nouns (e.g., verbs, adjectives, adverbs) and numbers (e.g., 01, 1, 20, 300).
2. Ensure Singular and Plural Pairs: Process the noun list from Step 1. For each noun, ensure both singular and plural forms are included:
   - If a plural word (e.g., "cats") is present, add its singular form ("cat").
   - If a singular word (e.g., "house") is present, add its plural form ("houses").
   - Handle irregular plurals (e.g., "goose" adds "geese").
   - Handle compound words (e.g., "watermelon" adds "watermelons").
3. Format JSON Output: Convert the processed list from Step 2 into a raw JSON array of objects, each with exactly two keys:
   - "word": The word from the final list.
   - "singular": The singular form of that word.

Constraints:
- Output only a single, raw JSON array.
- Exclude explanatory text, markdown formatting (e.g., \`\`\`json), or any characters outside the JSON array.
- Base the final output solely on words remaining after Step 2.

Example Workflow:
Input: ["cats", "beautiful", "goose", "01", "20"]
- Step 1: Temporary list = ["cats", "goose"] (discards "beautiful", "01", "20").
- Step 2: Adds "cat" (from "cats"), adds "geese" (from "goose"); final list = ["cats", "cat", "goose", "geese"].
- Step 3: Output = [{"word":"cats","singular":"cat"},{"word":"cat","singular":"cat"},{"word":"goose","singular":"goose"},{"word":"geese","singular":"goose"}].`;

  const userPrompt = `Words: ${wordString}`;

  try {
    let txt = "[]";

    if (useModel) {
      // prefer Ollama if available either via env endpoint or installed library
      const hasOllamaEnv = !!process.env.OLLAMA_API_URL;
      let hasOllamaLib = false;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require.resolve("ollama");
        hasOllamaLib = true;
      } catch {}

      if (process.env.GEMINI_KEY) {
        try {
          console.log(`Calling Gemini API with model: ${process.env.MODEL_NAME}`);
          const client = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });
          const res = await client.models.generateContent({
            model: process.env.MODEL_NAME || "gemini-2.5-flash",
            contents: [
              { role: "user", parts: [{ text: systemPrompt }] },
              { role: "user", parts: [{ text: userPrompt }] },
            ],
          });
          txt = res.text || "[]";
        } catch (e) {
          console.warn("Gemini call failed:", e);
          txt = "[]";
        }
      } else if (hasOllamaEnv || hasOllamaLib) {
        try {
          console.log(`Calling Ollama API with model: ${process.env.MODEL_NAME || "mistral-nemo:latest"}`);
          const modelName = process.env.MODEL_NAME || "mistral-nemo:latest";
          // Use ollama library if available, else fall back to HTTP via the lib's API
          // dynamically require the ollama library if installed
          let ollamaClient: any = undefined;
          if (hasOllamaLib) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              ollamaClient = require("ollama");
            } catch (e) {
              ollamaClient = undefined;
            }
          }

          try {
            if (ollamaClient && typeof ollamaClient.chat === "function") {
              const ollamaRes = await ollamaClient.chat({
                model: modelName,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
              });
              txt = ollamaRes?.message?.content ?? (typeof ollamaRes === "string" ? ollamaRes : JSON.stringify(ollamaRes));
            } else if (process.env.OLLAMA_API_URL) {
              const res = await fetch(process.env.OLLAMA_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: modelName, prompt: systemPrompt + "\n" + userPrompt, max_tokens: 2048 }),
              });
              txt = await res.text();
            } else {
              throw new Error("No Ollama client or API URL available");
            }
          } catch (libErr) {
            // If library call fails, try HTTP via fetch to OLLAMA_API_URL
            if (process.env.OLLAMA_API_URL) {
              const res = await fetch(process.env.OLLAMA_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: modelName, prompt: systemPrompt + "\n" + userPrompt, max_tokens: 2048 }),
              });
              txt = await res.text();
            } else {
              throw libErr;
            }
          }
        } catch (e) {
          console.warn("Ollama call failed, falling back if possible:", e);
          txt = "[]";
        }
      } else {
        console.warn("No model configured (OLLAMA_API_URL or GEMINI_KEY); skipping model step");
        txt = "[]";
      }
    }

    const aiOutputPath = path.join(outParent, "aiOutput.json");
    fs.writeFileSync(aiOutputPath, txt, { encoding: "utf8" });

    // try parse full response as JSON first
    let parsed: any = null;
    try {
      parsed = JSON.parse(txt);
    } catch {
      // try to extract first JSON substring
      const m = txt.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          parsed = null;
        }
      }
    }

    if (!Array.isArray(parsed)) {
      console.warn("Model response could not be parsed as JSON array; skipping filtering");
      throw new Error("Failed to filter tokens with Ollama");
    }

    // load the existing dictionary
    const tokenDictPath = path.join(outParent, "tokenDictionary.json");
    let existingDictContents = "{}";
    try {
      existingDictContents = fs.readFileSync(tokenDictPath, { encoding: "utf8" });
    } catch {
      // If reading fails, use an empty object
    }
    const existingDict: { [word: string]: { word: string; singular: string; id: number } } = JSON.parse(existingDictContents);
    // remove the non-nouns
    parsed = parsed
      // .filter((item: any) => item.isNoun)
      .sort((a, b) => a.singular.localeCompare(b.singular));

    const ids = Object.values(existingDict).map((item) => item.id);
    let newId = Math.max(...ids, 0) + 1;

    parsed = Object.values(
      parsed.reduce(
        (acc: any, item: any) => {
          if (existingDict[item.word]) {
            acc[item.word] = { ...item, id: existingDict[item.word].id };
          } else {
            // assign an id that is not in the ids array
            while (ids.includes(newId)) {
              newId++;
            }

            acc[item.word] = { ...item, id: newId };
            ids.push(newId);
          }

          return acc;
        },
        { ...existingDict }
      )
    );

    // .map((item, id) => ({ ...item, isSingular: item.singular === item.word, id }));

    const wordMap = parsed.reduce((acc: any, item: any) => {
      acc[item.word] = { ...item };
      if (item.word !== item.singular) {
        // find the id of its singular
        let singular = parsed.find((i: { word: string; singular: string }) => i.word === item.singular);
        if (singular) {
          acc[item.word].id = singular.id;
        }
      }

      return acc;
    }, {});

    fs.writeFileSync(tokenDictPath, pretty ? JSON.stringify(wordMap, null, 2) : JSON.stringify(wordMap), { encoding: "utf8" });
    return wordMap;
  } catch (err) {
    console.warn("Error calling Ollama:", err);
    throw new Error("Failed to filter tokens with Ollama");
  }
}

// create a function that accepts a recipe and the tokenDictionary
function mapRecipeTokens(recipe: Recipe, tokenDictionary: { [key: string]: { id: number } }): Recipe {
  const dictionaryKeys = Object.keys(tokenDictionary);
  const recipeIngredients = recipe.ingredientList.reduce((acc, curr) => {
    return `${acc} ${curr}`;
  }, "");

  const foundWords = dictionaryKeys.filter((key) => recipeIngredients.includes(key));

  const ingredientListTokens: number[] = [];

  for (const w of foundWords) {
    const tok = tokenDictionary[w];
    if (tok && !ingredientListTokens.includes(tok.id)) {
      ingredientListTokens.push(tok.id);
    }
  }

  // ingredientListTokens = recipe.ingredientList.reduce<number[]>((acc, ingredient: string) => {
  //   const tokenId = tokenDictionary[ingredient]?.id;
  //   if (tokenId) return [...acc, tokenId];

  //   return acc;
  // }, []);

  return {
    ...recipe,
    ingredientListTokens,
  };
}

// --- Small CSV parser that handles quoted fields ---
function parseCSV(text: string, delim = ","): AnyObj[] {
  // Split lines, but keep CRLF handling
  const rows: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nxt = text[i + 1];
    if (ch === '"') {
      // handle escaped double quotes
      if (inQuotes && nxt === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === "\r" && nxt === "\n") {
      rows.push(cur);
      cur = "";
      i++;
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      rows.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  // push remainder
  if (cur.length > 0) rows.push(cur);

  const out: AnyObj[] = [];
  if (rows.length === 0) return out;
  // split header
  const header = splitCSVLine(rows[0], delim);
  for (let r = 1; r < rows.length; r++) {
    const fields = splitCSVLine(rows[r], delim);
    // pad
    while (fields.length < header.length) fields.push("");
    const obj: AnyObj = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = fields[c];
    }
    out.push(obj);
  }
  return out;
}

function splitCSVLine(line: string, delim = ","): string[] {
  const res: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const nxt = line[i + 1];
    if (ch === '"') {
      if (inQuotes && nxt === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === delim) {
      res.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  res.push(cur);
  return res.map((s) => s.trim());
}

const raw = fs.readFileSync(inputCsv, "utf8");
const rows = parseCSV(raw, delimiter);
console.log(`Read ${rows.length} rows from ${inputCsv} (delimiter='${delimiter}')`);

// --- Helpers ported from PowerShell script ---
function convertValueSmart(val: any): any {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === "") return "";
  // nested JSON
  if (s.startsWith("{") || s.startsWith("[")) {
    try {
      return JSON.parse(s);
    } catch {
      /* fallthrough */
    }
  }
  const low = s.toLowerCase();
  if (low === "true" || low === "false") return low === "true";
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
  const dt = Date.parse(s);
  if (!isNaN(dt)) return new Date(dt).toISOString();
  return s;
}

function slugify(s?: string): string | null {
  if (!s) return null;
  let slug = s.toLowerCase().trim();
  slug = slug.replace(/[^a-z0-9]+/g, "-");
  slug = slug.replace(/^-+|-+$/g, "");
  return slug;
}

function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const s = timeStr.toLowerCase();
  let total = 0;
  const hrMatches = s.match(/(\d+)\s*hr/g);
  if (hrMatches) {
    for (const m of hrMatches) {
      const n = m.match(/(\d+)/);
      if (n) total += parseInt(n[1], 10) * 60;
    }
  }
  const minMatches = s.match(/(\d+)\s*min/g);
  if (minMatches) {
    for (const m of minMatches) {
      const n = m.match(/(\d+)/);
      if (n) total += parseInt(n[1], 10);
    }
  }
  if (total > 0) return total;
  const num = s.match(/(\d+)/);
  if (num) return parseInt(num[1], 10);
  return null;
}

function parseIngredientString(s?: string): { name: string; quantity: any; unit: string | null } | null {
  if (!s) return null;
  const str = s.trim();
  const pattern = /^(?<qty>\d+\s\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)(?:\s*(?<unit>[a-zA-Z]+))?\s+(?<rest>.+)$/;
  const m = str.match(pattern);
  if (m && m.groups) {
    const qty = m.groups["qty"];
    const unit = m.groups["unit"] || null;
    const name = m.groups["rest"].trim();
    let qtyValue: any = qty;
    if (/^-?\d+(?:\.\d+)?$/.test(qty)) qtyValue = parseFloat(qty);
    return { name, quantity: qtyValue, unit };
  }
  const pattern2 = /^(?<qty>\d+\/\d+)(?:\s*(?<unit>[a-zA-Z]+))?\s+(?<rest>.+)$/;
  const m2 = str.match(pattern2);
  if (m2 && m2.groups) {
    const unitVal2 = m2.groups["unit"] || null;
    return { name: m2.groups["rest"].trim(), quantity: m2.groups["qty"], unit: unitVal2 };
  }
  return { name: str, quantity: "", unit: null };
}

function parseDirectionsToSteps(dir?: string): Array<{ step: number; instruction: string; duration: number | null }> {
  if (!dir) return [];
  let parts: string[] = [];
  if (/\r?\n/.test(dir)) {
    parts = dir
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    parts = dir
      .split(/(?<=[\.\!\?])\s+(?=[A-Z])/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const steps: Array<{ step: number; instruction: string; duration: number | null }> = [];
  let i = 1;
  for (const p of parts) {
    let dur: number | null = null;
    const dm = p.match(/(?<n>\d+)\s*(?:minutes|minute|min|mins)/);
    if (dm && dm.groups && dm.groups["n"]) dur = parseInt(dm.groups["n"], 10);
    steps.push({ step: i, instruction: p, duration: dur });
    i++;
  }
  return steps;
}

let result: any[] = [];
const allWords: { [name: string]: boolean } = {};
for (const r of rows) {
  const name: string = String(r["recipe_name"] || "");
  const slug = slugify(name);
  const image: string = String(r["img_src"] || "");
  const otherImages: string[] = [];

  const prepMins = parseTimeToMinutes(String(r["prep_time"] || ""));
  const cookMins = parseTimeToMinutes(String(r["cook_time"] || ""));
  const totalMins = parseTimeToMinutes(String(r["total_time"] || ""));
  let preparationTime: number | null = null;
  if (totalMins) preparationTime = totalMins;
  else if (prepMins || cookMins) preparationTime = Number(prepMins || 0) + Number(cookMins || 0);

  let servings: any = null;
  if (r["servings"]) servings = convertValueSmart(r["servings"]);

  let calories: number | null = null;
  if (r["nutrition"]) {
    const mcal = String(r["nutrition"]).match(/Calories[^0-9]*?(\d{1,4})/);
    if (mcal) calories = parseInt(mcal[1], 10);
  }

  // ingredients
  let ingredientsRaw: string[] = [];
  if (r["ingredients"]) {
    ingredientsRaw = String(r["ingredients"])
      .split(/,\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const ingredients: any[] = [];
  const ingredientList: string[] = [];
  for (const ir of ingredientsRaw) {
    const parsed = parseIngredientString(ir);
    if (parsed) {
      ingredients.push(parsed);
      ingredientList.push(parsed.name);
      allWords[parsed.name] = true;
    }
  }

  const instructions = parseDirectionsToSteps(String(r["directions"] || ""));

  const recipe = {
    name,
    slug,
    description: null,
    image,
    otherImages,
    preparationTime,
    servings,
    calories,
    ingredients,
    ingredientList,
    ingredientListTokens: [],
    instructions,
  };

  result.push(recipe);
}

const json = pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);

if (utf8NoBom) {
  // Node's writeFileSync writes UTF-8 without BOM by default
  fs.writeFileSync(outputJson, json, { encoding: "utf8" });
} else {
  fs.writeFileSync(outputJson, json, { encoding: "utf8" });
}
console.log(`Wrote JSON: ${outputJson}`);

// const tokenDictPath = path.join(outParent, "tokenDictionary.json");
(async () => {
  let wordToTokens = {};

  wordToTokens = await mapWordsToTokens({ words: Object.keys(allWords), useModel: true });

  result = result.map((rec) => mapRecipeTokens(rec, wordToTokens as { [key: string]: { id: number } }));

  // Also rewrite recipes JSON to reflect updated ingredientTokens
  const updatedJson = pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);
  fs.writeFileSync(outputJson, updatedJson, { encoding: "utf8" });
  console.log(`Updated JSON (filtered tokens): ${outputJson}`);
})();
