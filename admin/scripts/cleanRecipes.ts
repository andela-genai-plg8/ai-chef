import * as admin from "firebase-admin";
import * as fs from "fs";
import CleanRecipes from "./utils/CleanRecipes";
import "dotenv/config";

// Path to your Firebase service account key
const serviceAccount = require("../serviceAccountKey.json");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const db = admin.firestore();

async function cleanRecipes() {
  // CLI args: --input | -i for JSON path, --limit for max documents (optional)
  const argv = process.argv.slice(2);
  let inputPath = "data.json";
  let limit: number | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input" || a === "-i") {
      inputPath = argv[++i] || inputPath;
    } else if (a === "--limit") {
      const v = argv[++i];
      if (v) limit = parseInt(v, 10);
    }
  }

  // Load JSON file
  if (!fs.existsSync(inputPath)) throw new Error(`Input JSON not found: ${inputPath}`);
  const rawData = fs.readFileSync(inputPath, "utf-8");
  const data: { slug: string; [key: string]: any }[] = JSON.parse(rawData);

  console.log(`Loaded ${data.length} recipes from ${inputPath} ${process.env.GEMINI_KEY}`);

  // Clean via Gemini (uses process.env.GEMINI_KEY by default)
  const toProcess = typeof limit === 'number' ? data.slice(0, limit) : data;
  const cleanedAll: any[] = [];
  let batchNum = 1;
  for await (const batch of CleanRecipes.clean(toProcess as any, { batchSize: 200, verbose: true })) {
    cleanedAll.push(...batch);
    console.log(`Received cleaned batch (${batch.length} items). Total so far: ${cleanedAll.length}`);

    // write per-batch file: cleaned.1.json, cleaned.2.json, ...
    try {
      const batchOutPath = inputPath.replace(/\.json$/, "") + `.cleaned.${batchNum}.json`;
      fs.writeFileSync(batchOutPath, JSON.stringify(batch, null, 2), { encoding: "utf8" });
      console.log(`Wrote batch file ${batchOutPath}`);
    } catch (e) {
      console.warn(`Failed to write batch file for batch ${batchNum}:`, e);
    }

    batchNum++;
  }

  const outPath = inputPath.replace(/\.json$/, "") + ".cleaned.all.json";
  fs.writeFileSync(outPath, JSON.stringify(cleanedAll, null, 2), { encoding: "utf8" });
  console.log(`Wrote cleaned recipes to ${outPath} (${cleanedAll.length} items)`);
}

cleanRecipes().catch(console.error);
