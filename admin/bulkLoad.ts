import * as admin from "firebase-admin";
import * as fs from "fs";

// Path to your Firebase service account key
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const db = admin.firestore();

async function bulkUpload() {
  // Load JSON file
  const rawData = fs.readFileSync("data.json", "utf-8");
  const data: { id: string; [key: string]: any }[] = JSON.parse(rawData);

  const collectionRef = db.collection("myCollection");

  // Firestore batch size limit
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let count = 0;

  for (let i = 0; i < data.length; i++) {
    const doc = data[i];
    const docRef = collectionRef.doc(doc.id);

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
