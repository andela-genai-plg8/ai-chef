import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { ChefFactory } from "../providers/ChefFactory";
import { Recipe } from "shared-types";
import { randomUUID } from "crypto";

/**
 * Job: compute or refresh vector embeddings for recipes and persist a cursor
 * to `jobCursors/computeVector` so subsequent runs resume where they left off.
 *
 * Behavior:
 * - Reads a cursor document to determine where to resume.
 * - Loads a batch of recipes, prepares UUIDs where missing, and delegates
 *   embedding/storage to the configured Chef provider.
 * - Marks recipes as having vectors and persists the last processed id.
 */
async function runComputation() {
  if (!admin.apps.length) {
    const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST || !!process.env.FUNCTIONS_EMULATOR;
    if (usingEmulator) {
      admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-project' });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.DATABASE_URL,
      });
    }
  }

  // Load the persisted cursor that tracks the last processed recipe id.
  const tracker = await admin.firestore().collection("jobCursors").doc("computeVector").get();
  const recipesRef = admin.firestore().collection("recipes");

  let cursor = null;
  if (tracker && tracker.exists) {
    cursor = tracker.data()!.lastProcessedId;
  }
  else {
    // No cursor stored yet: start at the head of the collection if available.
    const first = await recipesRef.limit(1).get();
    if (!first.empty) cursor = first.docs[0].id;
    console.info("No stored cursor; starting from the first document:", cursor);
  }
  // Load a page of recipes. Use a DocumentSnapshot with startAfter(cursorDoc)
  // to avoid Firestore cursor/orderBy mismatch errors.
  let snapshot: admin.firestore.QuerySnapshot<admin.firestore.DocumentData, admin.firestore.DocumentData>;
  if (cursor) {
    try {
      const cursorDocRef = recipesRef.doc(String(cursor));
      const cursorDoc = await cursorDocRef.get();
      if (cursorDoc.exists) {
        snapshot = await recipesRef.startAfter(cursorDoc).limit(20).get();
      } else {
        console.warn('Stored cursor doc not found, falling back to head of collection:', cursor);
        snapshot = await recipesRef.limit(20).get();
      }
    } catch (e) {
      console.error('Error resolving cursor, falling back to head query:', e);
      snapshot = await recipesRef.limit(20).get();
    }
  } else {
    snapshot = await recipesRef.limit(20).get();
  }

  let recipes = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      ref: doc.ref,
      id: data.id || doc.id,
      uuid: data.uuid || randomUUID(),
    };
  }).filter(r => r.ref) as (Recipe & { ref: FirebaseFirestore.DocumentReference; })[];

  // get any recipes whose hasVector field is not true
  const refreshedRecipes = (await recipesRef.where("hasVector", "!=", true).limit(30).get()).docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      ref: doc.ref,
      uuid: data.uuid || randomUUID(),
    };
  }) as (Recipe & { ref: FirebaseFirestore.DocumentReference; })[];

  recipes = [...recipes, ...refreshedRecipes];

  // remove duplicates
  recipes = Array.from(new Map(recipes.map(recipe => [recipe.ref, recipe])).values());
  
  if (recipes.length === 0) {
    console.info("No recipes require embeddings at this time.");
    return;
  }

  recipes = Array.from(new Map(recipes.map(recipe => [recipe.ref, recipe])).values());
  const chef = await ChefFactory.getChef({ name: "Andel", specifiedModel: process.env.DEFAULT_MODEL });
  recipes = await chef.storeEmbeddings(recipes);

  const batch = admin.firestore().batch();
  const currentTime = new Date();
  recipes.forEach((recipe) => {
    const updateData = {
      ...recipe,
      hasVector: true,
      published: recipe.published !== undefined ? recipe.published : false,
      createdBy: recipe.createdBy !== undefined ? recipe.createdBy : "system",
      updatedBy: recipe.updatedBy !== undefined ? recipe.updatedBy : "system",
      updatedAt: recipe.updatedAt !== undefined
      ? recipe.updatedAt
      : (recipe.createdAt !== undefined ? recipe.createdAt : currentTime),
      createdAt: recipe.createdAt !== undefined ? recipe.createdAt : currentTime,
    };
    batch.update(recipe.ref, updateData);
  });
  await batch.commit();

  // Persist the last processed id so future runs resume after the most
  // recently handled document.
  const cursorDocRef = admin.firestore().collection("jobCursors").doc("computeVector");
  await cursorDocRef.set({ lastProcessedId: recipes[recipes.length - 1].id }, { merge: true });
}

// Runs every 5 minutes
export const scheduleComputeVector = functions.scheduler.onSchedule("every 15 minutes", async (context) => {
  await runComputation();
});

// HTTP endpoint to trigger vector computation manually
export const computeVector = functions.https.onRequest(
  { timeoutSeconds: 540 }, // max 540 seconds (9 minutes),
  async (req, res) => {
    await runComputation();
    res.send("Computed vectors for recipes.");
  }
);
