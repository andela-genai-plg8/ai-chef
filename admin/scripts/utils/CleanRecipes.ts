import { GoogleGenAI } from "@google/genai";
import { Recipe } from "sharedtypes";
import "dotenv/config";

type CleanOptions = {
  batchSize?: number;
  apiKey?: string;
  model?: string;
  // If true, we'll log progress to console
  verbose?: boolean;
};

export default class CleanRecipes {
  /**
   * Clean an array of recipes by sending them to Gemini in batches.
   * Returns the cleaned recipes in the same order and shape.
   */
  public static async *clean(recipes: Recipe[], options: CleanOptions = {}): AsyncGenerator<Recipe[], void, unknown> {
    const batchSize = options.batchSize || 100;
    const model = options.model || process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const apiKey = options.apiKey || process.env.GEMINI_KEY;
    const verbose = !!options.verbose;

    console.log(`Cleaning ${recipes.length} recipes in batches of ${batchSize} using model ${apiKey} ${model}`);

    if (!apiKey) {
      if (verbose) console.warn("No Gemini API key provided, yielding original recipe batches");
      // yield original batches
      for (let i = 0; i < recipes.length; i += batchSize) {
        yield recipes.slice(i, i + batchSize);
      }
      return;
    }

    const client = new GoogleGenAI({ apiKey });

    for (let i = 0; i < recipes.length; i += batchSize) {
      const batch = recipes.slice(i, i + batchSize);
      if (verbose) console.log(`Cleaning batch ${Math.floor(i / batchSize) + 1} (${batch.length} recipes) with model ${model}`);
      try {
        const cleaned = await this.cleanBatchWithGemini(client, batch, model);
        let cleanedArr: Recipe[];
        if (!Array.isArray(cleaned)) {
          if (verbose) console.warn("Gemini returned unexpected shape for a batch; yielding original items for that batch");
          cleanedArr = batch;
        } else {
          if (cleaned.length === batch.length) {
            cleanedArr = cleaned as Recipe[];
          } else {
            // best-effort: pair indices
            cleanedArr = batch.map((orig, idx) => (cleaned[idx] as Recipe) ?? orig);
          }
        }
        yield cleanedArr;
      } catch (e) {
        console.warn("Error cleaning a Gemini batch, yielding original items:", e);
        yield batch;
      }
    }
  }

  private static async cleanBatchWithGemini(client: GoogleGenAI, batch: Recipe[], model: string): Promise<Recipe[] | null> {
    // System prompt: ask Gemini to output a raw JSON array of recipes with the same schema
    const systemInstruction = `You are a professional chef and strict JSON validator.
Your only task is to return a corrected array of recipe objects that conforms exactly to this schema:
${this.sampleSchema()}

OUTPUT REQUIREMENT:
- Return ONLY a single raw JSON array.
- Do NOT use markdown formatting, code fences, commentary, or explanations.
- The response must be valid JSON and nothing else.

PROCESSING RULES:
1. Preserve the input order unless exact duplicates exist (remove those duplicates).
2. Correct spelling, grammar, and punctuation in all fields.
3. Standardize formatting for consistency (e.g., ingredient lists, step instructions).
4. Add missing optional fields if logically inferable. You may augment incomplete information using reliable internet knowledge (e.g., common recipe descriptions, standard prep times, or typical ingredients).
5. If an image value is missing, null or not a valid URL, YOU MUST set it to https://missing-image.com/.
6. Do not add or remove fields outside of the schema.
7. Ensure the final output is fully valid JSON and matches the schema exactly.`;

    const userPrompt = `Input: ${JSON.stringify(batch)}\n\nReturn only the cleaned array of recipes.`;

    const res = await client.models.generateContent({
      model,
      // systemInstruction: {
      //   role: "user",
      //   parts: [{ text: systemInstruction }],
      // },
      config: {
        systemInstruction,
      },
      contents: [
        // { role: "system_instruction", parts: [{ text: systemInstruction }] },
        { role: "user", parts: [{ text: userPrompt }] },
      ],
    });

    const txt = (res as any).text ?? "";

    // Attempt to parse robustly
    const parsed = this.parseJsonArray(txt);
    if (!parsed) return null;

    return parsed as Recipe[];
  }

  private static parseJsonArray(txt: string): any[] | null {
    if (!txt || typeof txt !== "string") return null;
    // try direct parse
    try {
      const parsed = JSON.parse(txt);
      if (Array.isArray(parsed)) return parsed;
    } catch {}

    // try to extract first JSON array substring
    const m = txt.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (m) {
      try {
        const p = JSON.parse(m[0]);
        if (Array.isArray(p)) return p;
      } catch {}
    }

    // try to repair common single-quoted JSON
    const singleQuoted = txt.replace(/'/g, '"');
    try {
      const p2 = JSON.parse(singleQuoted);
      if (Array.isArray(p2)) return p2;
    } catch {}

    return null;
  }

  private static sampleSchema(): string {
    return JSON.stringify(
      {
        name: "string eg. the name of the recipe",
        slug: "string eg. the-slug-of-the-recipe",
        description: "string|null eg. a brief description of the recipe",
        image: "string a valid url eg. https://example.com/image.jpg",
        otherImages: ["string eg. https://example.com/other-image.jpg"],
        preparationTime: "number|null eg. 30",
        servings: "number|string|null eg. 4",
        calories: "number|string|null eg. 500",
        ingredients: [
          {
            name: "string eg. the name of the ingredient",
            quantity: "number|string eg. 1",
            unit: "string|null eg. cups",
          },
        ],
        ingredientList: ["string eg. the name of the ingredient"],
        ingredientListTokens: [123],
        instructions: [
          {
            step: 1,
            instruction: "string eg. the instruction for the step",
            duration: "number|null eg. 60",
          },
        ],
      },
      null,
      2
    );
  }
}
