import * as functions from "firebase-functions";
import { Request, Response } from "express";
import OpenAI from "openai";
import { Recipe } from "shared-types";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { randomUUID } from 'crypto';

export const parseRecipe = functions.https.onRequest(async (req: Request, res: Response) => {
  const recipeText: string = req.body.candidateRecipe || "";

  console.info("Parsing new recipe:\n" + recipeText);

  try {

    const parsedRecipe = await extractRecipe(recipeText);
    parsedRecipe.slug = parsedRecipe.name.toLowerCase().trim() // TODO: extract generating a slug to common function
      .replace(/[^a-z0-9\s-]/g, '')   // remove non-alphanumeric chars
      .replace(/\s+/g, '-')           // replace spaces with hyphens
      .replace(/-+/g, '-');           // collapse multiple hyphens
    const newRecipeId = await addRecipe(parsedRecipe);
    console.info(`ID of new recipe: ${newRecipeId}`);

    let [_, __, vector] = await calculateEmbedding(parsedRecipe);
    await storeEmbedding(parsedRecipe, vector);
    res.json(parsedRecipe);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function extractRecipe(recipeText: string): Promise<Recipe> {

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
    response_format: {
      type: "json_schema", json_schema: {
        name: "parse_recipe_schema",
        strict: false, //true,
        schema
      }
    },
    max_completion_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `Extract structured recipe data from the following text:\n\n${recipeText}`,
      },
    ]
  });

  let parsedRecipe = response.choices[0]?.message?.content;
  return JSON.parse(parsedRecipe || "");
}

async function addRecipe(recipe: Recipe): Promise<string> {

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: process.env.DATABASE_URL,
    });
  }
  const addedDoc = await admin.firestore().collection("recipes").add(recipe);
  return addedDoc.id
}

async function calculateEmbedding(recipe: Recipe): Promise<[string, string, number[]]> {
  let openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  let embeddedText = recipe.ingredients.map((ing: any) => ing.name).join('\n');

  const embeddings = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: embeddedText,
    encoding_format: "float",
  });

  let embedding = embeddings.data[0];
  let vector = embedding.embedding;

  return [recipe.slug ?? "", embeddedText, vector];
}

// TODO: extract duplicate code from bootstrap
async function storeEmbedding(recipe: Recipe, vector: number[]): Promise<any> {
  const COLLECTION = 'ingredients';
  const res = await fetch(`${process.env.QDRANT_URL}/collections/${COLLECTION}/points`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      points: [
        {
          id: randomUUID(),
          payload: recipe,
          vector: {
            small_model: vector,
            large_model: vector,
          },
        },
      ],
    }),
  });

  return await res.json();
}
