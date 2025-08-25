import * as admin from "firebase-admin";
import * as fs from "fs";
import "dotenv/config";

// Path to your Firebase service account key
const serviceAccount = require("../serviceAccountKey.json");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const db = admin.firestore();

async function bulkUpload() {
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

  const collectionRef = db.collection("recipes");

  // Firestore batch size limit
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let count = 0;

  const toProcess = typeof limit === 'number' ? data.slice(0, limit) : data;
  for (let i = 0; i < toProcess.length; i++) {
    const doc = toProcess[i];
    const docRef = collectionRef.doc(doc.slug);

    batch.set(docRef, doc);
    count++;

    // Commit batch every 500 writes
    if (count % BATCH_SIZE === 0) {
      await batch.commit();
      console.log(`Committed ${count} documents...`);
      batch = db.batch();
    }
  }

  // Commit remaining docs
  if (count % BATCH_SIZE !== 0) {
    await batch.commit();
    console.log(`Committed remaining ${count % BATCH_SIZE} documents`);
  }

  console.log(`✅ Finished uploading ${count} documents.`);
}

bulkUpload().catch(console.error);
