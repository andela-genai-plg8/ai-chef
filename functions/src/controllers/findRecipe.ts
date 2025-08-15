import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { ChefFactory } from "../providers/ChefFactory";

export const findRecipe = functions.https.onRequest(async (req: Request, res: Response) => {
  const ingredients: string[] = req.body.ingredients || [];

  try {
    const chef = ChefFactory.getChef("Andel", req.body.model || process.env.DEFAULT_MODEL, [
      {
        role: "user",
        content: `What can I make with these ingredients: ${ingredients.join(", ")}.
      Without introducing yourself, respond with only a JSON array or recipes that look like this: [<recipe>, <recipe>] where <recipe> is a JSON object representing the recipe and it looks like this:
      {
        "name": "<recipe name>",
        "image": "<nice image URL>",
        "ingredients": [{
          "name": "<ingredient name>",
          "quantity": "<ingredient quantity>"
        }],
        "instructions": [{
          "step": 1,
          "instruction": "<cooking instruction>",
          "duration": <cooking duration in seconds>
        }]
      }

      Make SURE that only that the JSON response can be parsed by JSON.parse() and that it is a valid JSON array of recipes.`,
      },
    ]);

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
