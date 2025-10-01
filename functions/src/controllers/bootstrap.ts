import API, { OpenAI } from "openai";
import { Request, Response } from "express";
import * as functions from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import csv from "csv-parser";
import * as admin from "firebase-admin";
import { randomUUID } from 'crypto';

export const bootstrap = functions.https.onRequest(async (req: Request, res: Response) => {


    try {
        let results = await setupFirestore();
        // let vectors = await calcVectors(results.recipes);
        // await setupVectorStore(results.recipes, vectors);
        res.json({ status: "success" });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

async function setupFirestore(): Promise<{ [key: string]: any[] }> {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            databaseURL: process.env.DATABASE_URL,
        });
    }

    const db = getFirestore();

    const BATCH_SIZE = 500; // Firestore max batch size

    const data = [
        {
            name: "recipes",
            func: (recipe: any): any => {
                // Name,Rating,Description,Prep Time,Cook Time,Total Time,Servings,Ingredients,Image URL
                return {
                    slug: recipe["Name"]
                        .toLowerCase().trim()
                        .replace(/[^a-z0-9\s-]/g, '')   // remove non-alphanumeric chars
                        .replace(/\s+/g, '-')           // replace spaces with hyphens
                        .replace(/-+/g, '-'),           // collapse multiple hyphens
                    name: recipe["Name"],
                    description: recipe["Description"],
                    image: recipe["Image URL"],
                    ingredients: recipe["Ingredients"].split('|').map((ing: string) => ({ name: ing, quantity: "?" })),
                    instructions: [
                        {
                            step: 1,
                            instruction: "No instructions provided, sorry!",
                            duration: 1200
                        }
                    ]
                }
            }
        },
        {
            name: "models",
            func: (model: any): any => {
                return {
                    id: model["id"],
                    name: model["name"],
                    title: model["title"],
                    provider: model["provider"],
                    supported: model["supported"],
                    model: model["model"],
                    default: model["default"],
                    max_tokens: model["max_tokens"],
                    temperature: model["temperature"]
                }
            }
        }
    ];
    const allResults: { [key: string]: any[] } = {};

    data.forEach(async (dataCollection) => {
        const snapshot = await db.collection(dataCollection.name).limit(1).get();

        if (!snapshot.empty) {
            console.log(`${dataCollection.name} already exist. Skipping bootstrap.`);
            return [];
        }

        const results: any[] = [];

        await new Promise<void>((resolve, reject) => {
            fs.createReadStream(process.env.RESOURCES_DIR + `/${dataCollection.name}.csv`)
                .pipe(csv())
                .on("data", (data) => results.push(dataCollection.func(data)))
                .on("end", () => {
                    console.log("Parsed", results.length, "rows");
                    resolve();
                })
                .on("error", reject);
        });

        results.splice(200); // TODO: adjust max amount of recipes imported to DB to avoid timeouts
        console.log(`Uploading ${results.length} ${dataCollection.name}...`);
        for (let i = 0; i < results.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const chunk = results.slice(i, i + BATCH_SIZE);

            chunk.forEach((recipe) => {
                const docRef = db.collection(dataCollection.name).doc(); // auto-ID
                batch.set(docRef, recipe);
            });

            await batch.commit();
            console.log(`Uploaded batch ${i / BATCH_SIZE + 1}`);
        }

        console.log("All data uploaded.");
        allResults[dataCollection.name] = results;
    });

    return allResults;
}

async function calcVectors(recipes: any[]) {

    // TODO: consider calculating embeddings once and reusing them on each bootstrap

    let openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    let embeddingsInput: [string, string, number[]][] = [];
    for (let recipe of recipes) {
        let embeddedText = recipe.ingredients.map((ing: any) => ing.name).join('\n');
        let slug = recipe.slug as string;
        embeddingsInput.push([slug, embeddedText, []]);
    }

    const embeddings = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: embeddingsInput.map(e => e[1]),
        encoding_format: "float",
    });

    for (let embedding of embeddings.data) {
        let vector = embedding.embedding;
        let index = embedding.index;
        embeddingsInput[index][2] = vector;
    }

    // fs.writeFileSync("vectors.json", JSON.stringify(embeddingsInput, null, 2));

    return embeddingsInput;
}

async function setupVectorStore(recipes: any[], vectors: any[]) {
    const COLLECTION = 'ingredients';

    // 1. Check if collection exists
    async function collectionExists() {
        const res = await fetch(`${process.env.QDRANT_URL}/collections/${COLLECTION}`);
        return res.status === 200;
    }

    // 2. Create collection if not exists
    async function createCollection() {
        await fetch(`${process.env.QDRANT_URL}/collections/${COLLECTION}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vectors: {
                    small_model: { size: vectors[0][2].length, distance: 'Cosine' },

                    // We create another vector so maybe we will hold more precise embeddings here or some other kind of info,
                    // but for now it's not used and only small vector with embeddings is there.
                    large_model: { size: vectors[0][2].length, distance: 'Cosine' },
                },
                strict: true,
                optimizer_config: {
                    indexing_threshold: 10
                }
            }),
        });
    }

    // 3. Add a record
    async function addRecord(recipe: any, recipe_embedding: number[]) {
        const res = await fetch(`${process.env.QDRANT_URL}/collections/${COLLECTION}/points`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                points: [
                    {
                        id: randomUUID(),
                        payload: recipe,
                        vector: {
                            small_model: recipe_embedding,
                            large_model: recipe_embedding,
                        },
                    },
                ],
            }),
        });

        const data = await res.json();
    }

    const exists = await collectionExists();
    if (!exists) {
        console.log('Creating collection...');
        await createCollection();

        let recipesMap: Record<string, any> = {};
        for (let recipe of recipes) {
            recipesMap[recipe.slug] = recipe;
        }

        // TODO: add records in bulk instead one by one, for better performance
        for (let vector of vectors) {
            await addRecord(recipesMap[vector[0]], vector[2]);
        }

    } else {
        console.log('Collection exists.');
    }

}
