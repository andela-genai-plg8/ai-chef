import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { ChefFactory } from "../providers/ChefFactory";
import { apps, initializeApp, credential, firestore } from "firebase-admin";
import { Recipe } from "shared-types/Recipe";

export const findRecipe = functions.https.onRequest(async (req: Request, res: Response) => {
  const ingredients: string[] = req.body.ingredients || [];
  const tags: string[] = req.body.tags || [];
  let recommendedRecipes: Recipe[] = [];

  if (tags.length > 0) {
    if (!apps.length) {
      initializeApp({
        credential: credential.applicationDefault(),
        databaseURL: process.env.DATABASE_URL,
      });
    }

    // load documents from firebase
    const recipesCollection = firestore().collection("recipes");
    // const recipesSnapshot = await recipesCollection.get();
    // Filter recipes where ingredientTagList contains all or any of the tags
    let querySnapshot;
    if (tags.length > 0) {
      // Firestore does not support "array-contains-any" with more than one value for "contains all"
      // So we fetch recipes that contain any of the tags, then filter for "contains all" in code
      querySnapshot = await recipesCollection
        .where("tags", "array-contains-any", tags)
        .limit(5)
        .get();

      // If you want "contains all", filter in code:
      recommendedRecipes = querySnapshot.docs
        .map((doc) => doc.data() as Recipe);
    }
  }

  try {
    const content = `What can I make with these ingredients: ${JSON.stringify(ingredients)}.
DO NOT introduce yourself. 
CALL THE find_recipe TOOL TO GET RECIPES THAT MATCH THE INGREDIENTS ONLY ONCE.
Respond with only a JSON array of recipes WITHOUT markdown or any explanation.
${recommendedRecipes.length > 0 ? `YOU MUST COMBINE THE result from the find_recipe tool WITH THESE INITIAL RECIPES and pick only the most relevant ones (JSON format): \n${JSON.stringify(recommendedRecipes)}` : ""}`;

    const chef = ChefFactory.getChef({
      name: "Andel",
      specifiedModel: req.body.model || process.env.DEFAULT_MODEL,
      history: [
        {
          role: "user",
          content,
        },
      ],
    });

    let status = "success";
    let recipes = [];
    try {
      const response = await chef.getResponse();
      // Extract JSON array from response, ignoring any unwanted text
      const match = response.match(/\[[\w\W\s\S\r\n]*\]/s);
      const jsonArray = match ? match[0] : "[]";
      recipes = JSON.parse(jsonArray);
    } catch (e) {
      console.log(e)
      status = "error";
    }

    res.json({ recipes, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
