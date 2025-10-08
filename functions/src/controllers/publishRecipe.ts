import { Recipe } from "shared-types";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { ChefFactory } from "../providers/ChefFactory";

export const publishRecipe = functions.https.onRequest(
  // { timeoutSeconds: 540 }, // max 540 seconds (9 minutes),
  async (req: Request, res: Response) => {

    try {
      // extract recipe from body
      const recipe: Recipe = req.body?.recipe;
      if (!recipe) {
        res.status(400).json({ error: 'Missing recipe in request body' });
        return;
      }

      try {
        // perform a similarity search to see if a similar recipe already exists
        const chef = ChefFactory.getChef({ name: "Andel", specifiedModel: process.env.DEFAULT_MODEL });
        const similarRecipes = await chef.findSimilarRecipes(recipe);

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

        // update the recipe to be published
        const db = admin.firestore();
        const recipeRef = db.collection('recipes').doc(recipe.id);

        // TODO: in the future, link similar recipes together
        if (similarRecipes.duplicates.length > 0) {
          // merge existing related entries with newly discovered distinct similar recipes
          const distinct = Array.isArray(similarRecipes.distinct) ? similarRecipes.distinct : (similarRecipes.distinct ? [similarRecipes.distinct] : []);
          const existingRelated = Array.isArray((recipe as any).related) ? (recipe as any).related : [];
          const combined = Array.from(new Set([...existingRelated, ...distinct]));

          await recipeRef.set({
            ...recipe,
            published: false,
            publishedAt: new Date(),
            updatedAt: new Date(),
            related: combined,
          }, { merge: true });

          res.status(200).json({ message: 'Similar recipes found, not publishing.', similarRecipes, status: false, queued: true, id: recipe.id });
          return;
        } else {
          const distinct = Array.isArray(similarRecipes.distinct) ? similarRecipes.distinct : (similarRecipes.distinct ? [similarRecipes.distinct] : []);
          const existingRelated = Array.isArray((recipe as any).related) ? (recipe as any).related : [];
          const combined = Array.from(new Set([...existingRelated, ...distinct]));

          await recipeRef.set({
            ...recipe,
            published: true,
            publishedAt: new Date(),
            updatedAt: new Date(),
            related: combined,
          }, { merge: true });

          res.json({ status: true, message: 'Recipe published successfully', id: recipe.id });
        }

      } catch (err) {
        console.error('Error finding similar recipes', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: errorMessage });
      }

      return;
    } catch (err: any) {
      console.error('parseRecipe error', err);
      res.status(500).json({ error: err?.message || String(err) });
      return;
    }
  });
