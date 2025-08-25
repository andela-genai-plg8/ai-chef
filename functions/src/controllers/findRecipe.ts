import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { ChefFactory } from "../providers/ChefFactory";

export const findRecipe = functions.https.onRequest(async (req: Request, res: Response) => {
  const ingredients: string[] = req.body.ingredients || [];

  try {
    const chef = ChefFactory.getChef({
      name: "Andel",
      specifiedModel: req.body.model || process.env.DEFAULT_MODEL,
      history: [
        {
          role: "user",
          content: `What can I make with these ingredients: ${ingredients.join(", ")}.
      Without introducing yourself, respond with only a JSON array or recipes.`,
        },
      ],
    });

    let status = "success";
    let recipes = [];
    try {
      recipes = JSON.parse(await chef.getResponse());
    } catch {
      status = "error";
    }

    res.json({ recipes, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
