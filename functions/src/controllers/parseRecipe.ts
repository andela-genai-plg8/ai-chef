import * as functions from "firebase-functions";
import { Request, Response } from "express";
import OpenAI from "openai";

export const parseRecipe = functions.https.onRequest(async (req: Request, res: Response) => {
  const recipeText: string = req.body.candidateRecipe || "";

  console.info("Parsing new recipe:\n" + recipeText);

  try {
    let openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    
    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        preparationTime: { type: 'string', description: "Estimated preparation time. Optional, skip if not provided." },
        servings: { type: 'string', description: "Estimated amount of servings. Optional, skip if not provided." },
        calories: { type: 'string', description: "Estimated calories per serving. Optional, skip if not provided." },
        ingredients: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              quantity: { type: 'string', description: "Quantity of the ingredient. Skip if the quantity cannot be expressed as a measure." },
            },
            required: ['name'],
          },
        },
        instructions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              instruction: { type: 'string' },
              duration: {
                type: 'integer',
                description: 'In seconds. Skip if unknown.',
              },
            },
            required: ['instruction'],
          },
        },
      },
      required: ['name', 'description', 'ingredients', 'instructions'],
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format:{ type: "json_schema", json_schema: {
        name: "parse_recipe_schema",
        strict: false, //true,
        schema
      } },
      max_completion_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Extract structured recipe data from the following text:\n\n${recipeText}`,
        },
      ]
    });

    let parsedRecipe = response.choices[0]?.message?.content;
    res.json(JSON.parse(parsedRecipe ?? ""));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
