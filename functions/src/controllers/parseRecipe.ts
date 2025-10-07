import OpenAI from "openai";
import { Recipe } from "shared-types";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { Request, Response } from "express";

export const parseRecipe = functions.https.onRequest(async (req: Request, res: Response) => {
  console.log("parseRecipe called");

  try {
    // Accept both body.data.candidateRecipe (client uses { data: { candidateRecipe } })
    // and direct body.candidateRecipe for flexibility.
    const recipeText: string = (req.body?.data?.candidateRecipe) || req.body?.candidateRecipe || "";

    // Verify Firebase ID token from Authorization header: "Bearer <idToken>"
    const authHeader = (req.headers.authorization || req.headers.Authorization) as string | undefined;
    if (!authHeader) {
      res.status(401).json({ error: 'Missing Authorization header' });
      return;
    }

    const tokenMatch = authHeader.match(/Bearer\s+(.*)/i);
    const idToken = tokenMatch ? tokenMatch[1] : authHeader;

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

    let uid = "";
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch (err) {
      console.warn('Failed to verify ID token', err);
      res.status(401).json({ error: 'Invalid or expired auth token' });
      return;
    }

    const parsedRecipe = await extractRecipe(recipeText);
    parsedRecipe.slug = parsedRecipe.name.toLowerCase().trim() // TODO: extract generating a slug to common function
      .replace(/[^a-z0-9\\s-]/g, '')   // remove non-alphanumeric chars
      .replace(/\\s+/g, '-')           // replace spaces with hyphens
      .replace(/-+/g, '-');           // collapse multiple hyphens

    const newRecipeId = await addRecipe(parsedRecipe, uid || "");
    console.info(`ID of new recipe: ${newRecipeId}`);

    res.json({ ...parsedRecipe, id: newRecipeId, slug: newRecipeId });
    return;
  } catch (err: any) {
    console.error('parseRecipe error', err);
    res.status(500).json({ error: err?.message || String(err) });
    return;
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

async function addRecipe(recipe: Recipe, createdBy: string): Promise<string> {

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

  if (!createdBy) createdBy = "admin";
  const createdAt = new Date();
  const addedDoc = await admin.firestore().collection("recipes").add({ ...recipe, tagged: false, published: false, createdBy, updatedBy: createdBy, createdAt, updatedAt: createdAt, hasVectors: false });

  return addedDoc.id
}

// async function calculateEmbedding(recipe: Recipe): Promise<[string, string, number[]]> {
//   let openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
//   });

//   let embeddedText = recipe.ingredients.map((ing: any) => ing.name).join('\n');

//   const embeddings = await openai.embeddings.create({
//     model: "text-embedding-3-small",
//     input: embeddedText,
//     encoding_format: "float",
//   });

//   let embedding = embeddings.data[0];
//   let vector = embedding.embedding;

//   return [recipe.slug ?? "", embeddedText, vector];
// }

// // TODO: extract duplicate code from bootstrap
// async function storeEmbedding(recipe: Recipe, vector: number[]): Promise<any> {
//   const COLLECTION = 'ingredients';
//   const res = await fetch(`${process.env.QDRANT_URL}/collections/${COLLECTION}/points`, {
//     method: 'PUT',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       points: [
//         {
//           id: randomUUID(),
//           payload: recipe,
//           vector: {
//             small_model: vector,
//             large_model: vector,
//           },
//         },
//       ],
//     }),
//   });

//   return await res.json();
// }
