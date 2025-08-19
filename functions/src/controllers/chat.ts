import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { ChefFactory } from "../providers/ChefFactory";
import * as admin from "firebase-admin";
import { Recipe } from "shared-types";

export const chat = functions.https.onRequest(async (req: Request, res: Response) => {
  const context = req.body.context || [];

  try {
    const chef = ChefFactory.getChef({
      name: "Andel",
      specifiedModel: req.body.model,
      history: context.map(({ sender, content }: any) => ({
        role: sender,
        content,
      })),
    });

    const messages = await chef.getResponse();
    const recommendations = chef.getRecipeRecommendations();
    const ingredients = chef.getIngredients();

    if (recommendations.length > 0) {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          databaseURL: process.env.DATABASE_URL,
        });
      }

      // add any recommendation that is not already in firebase firestore to it.
      const existingRecommendations = await getExistingRecommendationsFromFirestore(recommendations.map((rec) => rec.slug!));
      const newRecommendations = recommendations.filter((rec) => !existingRecommendations.includes(rec.slug || ""));
      await addRecommendationsToFirestore(newRecommendations);
    }

    res.json({ messages, recommendations, ingredients, status: "success" });
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
