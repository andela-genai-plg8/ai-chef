import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { ChefFactory } from "../providers/ChefFactory";
import * as admin from "firebase-admin";
import { Recipe } from "shared-types";
import OpenAI from "openai";
import busboy from "busboy";

export const chat = functions.https.onRequest(async (req: Request, res: Response) => {
  const history = req.body.context || [];
  const specifiedModel = req.body.model;
  const authorizationToken = req.headers.authorization? req.headers.authorization.split(" ")[1] : null;

  try {
    const chef = ChefFactory.getChef({
      name: "Andel",
      specifiedModel,
      history,
    });

    const messages = await chef.getResponse({ authorizationToken });
    const recommendations = chef.getRecipeRecommendations();
    const ingredients = chef.getIngredients();
    const latestHistory = chef.getLatestHistory();
    const hasRecipeRecommendations = chef.getHasRecipeRecommendations();

    if (recommendations.length > 0) {
      if (!admin.apps.length) {
        const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST || !!process.env.FUNCTIONS_EMULATOR;
        if (usingEmulator) {
          // When running with the Firestore emulator, avoid calling
          // admin.credential.applicationDefault() which triggers a network
          // token fetch. Initialize using a minimal config.
          admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-project' });
        } else {
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            databaseURL: process.env.DATABASE_URL,
          });
        }
      }

      // add any recommendation that is not already in firebase firestore to it.
      const existingRecommendations = await getExistingRecommendationsFromFirestore(recommendations.map((rec) => rec.slug!));
      const newRecommendations = recommendations.filter((rec) => !existingRecommendations.includes(rec.slug || ""));
      await addRecommendationsToFirestore(newRecommendations);
    }

    res.json({ messages, recommendations, ingredients, history: latestHistory, hasRecipeRecommendations, status: "success" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }

  async function getExistingRecommendationsFromFirestore(recipeNames: string[]): Promise<string[]> {
    const snapshot = await admin.firestore().collection("recipes").where("slug", "in", recipeNames).get();
    return snapshot.docs.map((doc) => doc.get("slug"));
  }

  async function addRecommendationsToFirestore(newRecommendations: Recipe[]) {
    const batch = admin.firestore().batch();
    newRecommendations.forEach((rec) => {
      const docRef = admin.firestore().collection("recipes").doc();
      batch.set(docRef, rec);
    });
    await batch.commit();
  }
});

export const speechToText = functions.https.onRequest((req: Request, res: Response) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  if (!req.headers["content-type"]?.startsWith("multipart/form-data")) {
    res.status(400).send("Expected multipart/form-data");
    return;
  }

  const bb = busboy({ headers: req.headers });
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  let handled = false;

  bb.on("file", async (_fieldname, file, info) => {
    if (handled) {
      // Only accept first file
      file.resume();
      return;
    }
    handled = true;

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of file) {
        chunks.push(chunk as Buffer);
      }
      // Create a File-like object (supported by OpenAI SDK)
      const buffer = Buffer.concat(chunks);
      const f = new File([buffer], info.filename, { type: "audio/webm" });      

      // send to OpenAI for transcription
      const resp = await client.audio.transcriptions.create({
        file: f,
        model: "gpt-4o-mini-transcribe",
      });

      res.json({ speechMessage: resp.text });
    } catch (err: any) {
      console.error("OpenAI STT error", err);
      res.status(500).send("Speech-to-text failed: " + err.message);
    }
  });

  bb.on("error", (err) => {
    console.error("Busboy error", err);
    if (!res.headersSent) {
      res.status(400).send("Malformed form data");
    }
  });

  // Important: end busboy with rawBody in Gen1 functions
  bb.end(Buffer.from((req as any).rawBody));
});
