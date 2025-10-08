import axios from "./axiosClient";
// import { addDoc,  } from "firebase/firestore";

import { collection, getDocs, getFirestore, query, where, doc, getDoc, orderBy, or, limit as fbLimit, startAfter, documentId, updateDoc } from "firebase/firestore";
import { Recipe } from "shared-types";
// src/utils/timestamps.ts
// Optionally import admin types if you also need Admin SDK helpers.
// import admin from 'firebase-admin';

/**
 * Type-guard for Firestore Timestamp-like objects (client or admin).
 */
export function isFirestoreTimestampLike(v: unknown): v is { seconds: number; nanoseconds: number; toDate: () => Date } {
  return !!v && typeof v === 'object'
    && 'seconds' in (v as any)
    && 'nanoseconds' in (v as any)
    && typeof (v as any).toDate === 'function';
}

/**
 * Convert a mixed value to a JS Date (null-safe).
 * Accepts:
 * - Date (returned as-is)
 * - number (treated as milliseconds since epoch)
 * - ISO string (new Date(string))
 * - Firestore Timestamp-like (uses .toDate())
 * - null/undefined -> null
 */
export function toDate(value: Date | number | string | any | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (isFirestoreTimestampLike(value)) return value.toDate();
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // fallback: if object exposes toDate (e.g. some custom timestamp)
  if (value && typeof value.toDate === 'function') {
    try {
      const d = value.toDate();
      return d instanceof Date ? d : null;
    } catch {
      return null;
    }
  }
  return null;
}

interface FindRecipeParams {
  ingredients: string[];
}

export async function findRecipe({ ingredients }: FindRecipeParams): Promise<Recipe[]> {
  const response = await axios.post("/api/findRecipe", {
    ingredients,
  });

  if (!response.data) {
    throw new Error("No recipes found");
  }

  return response.data;
}

export async function parseRecipe(candidateRecipe: string): Promise<Recipe> {
  const response = await axios.post("/api/parseRecipe", {
    data: { candidateRecipe }
  });

  if (!response.data) {
    throw new Error("Recipe cannot be parsed");
  }

  const parsedRecipe = response.data as Recipe;
  return parsedRecipe;
}


export async function getAll(): Promise<{ recipes: Recipe[]; lastDocId?: string }> {
  const db = getFirestore();
  const recipesCollection = collection(db, "recipes");
  const snapshot = await getDocs(recipesCollection);
  return {
    recipes: snapshot.docs.map((doc) => {
      const data = doc.data();
      return { slug: data.slug, ...data, id: doc.id } as Recipe;
    }),
    lastDocId: snapshot.docs[snapshot.docs.length - 1]?.id
  };
}

// Cursor-based pagination: returns recipes for the page and the lastDoc id for next page
export async function getPaged(pageSize: number = 10, startAfterId?: string): Promise<{ recipes: Recipe[]; lastDocId?: string }> {
  const db = getFirestore();
  const recipesCollection = collection(db, "recipes");

  let q;
  if (startAfterId) {
    // fetch the document snapshot to use as cursor
    const cursorDoc = await getDoc(doc(db, 'recipes', startAfterId));
    if (!cursorDoc.exists()) {
      // If cursor not found, fall back to first page
      q = query(recipesCollection, orderBy('name'), fbLimit(pageSize));
    } else {
      q = query(recipesCollection, orderBy('name'), startAfter(cursorDoc), fbLimit(pageSize));
    }
  } else {
    q = query(recipesCollection, orderBy('name'), fbLimit(pageSize));
  }

  const snapshot = await getDocs(q);
  const recipes = snapshot.docs.map((d) => {
    const data = d.data();
    return { slug: data.slug, ...data, id: d.id } as Recipe;
  });


  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  const lastDocId = lastDoc ? lastDoc.id : undefined;
  return { recipes, lastDocId };
}

// Cursor-based pagination: returns recipes for the page and the lastDoc id for next page
export async function getByOwnerPaged(ownerId: string, pageSize: number = 10, startAfterId?: string): Promise<{ recipes: Recipe[]; lastDocId?: string }> {
  const db = getFirestore();
  const recipesCollection = collection(db, "recipes");

  let q;
  if (startAfterId) {
    // fetch the document snapshot to use as cursor
    const cursorDoc = await getDoc(doc(db, 'recipes', startAfterId));
    if (!cursorDoc.exists()) {
      // If cursor not found, fall back to first page
      q = query(recipesCollection, where("createdBy", "==", ownerId), orderBy('name'), fbLimit(pageSize));
    } else {
      q = query(recipesCollection, where("createdBy", "==", ownerId), orderBy('name'), startAfter(cursorDoc), fbLimit(pageSize));
    }
  } else {
    // Use equality operator here for single-owner queries
    q = query(
      recipesCollection,
      orderBy("name"),
      where("createdBy", "==", ownerId),
      fbLimit(pageSize)
    );
  }

  const snapshot = await getDocs(q);

  let recipes: Recipe[] = [];
  try {
    recipes = snapshot.docs.map((d) => {
      const data = d.data();
      return { slug: data.slug, ...data, id: d.id, updatedAt: toDate(data.updatedAt), createdAt: toDate(data.createdAt) } as Recipe;
    });
  } catch (e) {
    console.error("Error fetching owner's recipes", e);
  }

  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  const lastDocId = lastDoc ? lastDoc.id : undefined;
  return { recipes, lastDocId };
}

export async function getBySlug(slug: string): Promise<Recipe | null> {
  const db = getFirestore();
  const recipesCollection = collection(db, "recipes");

  // 1) Try direct doc read by id (fast and no index required)
  try {
    const docSnap = await getDoc(doc(db, "recipes", slug));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return { ___id: slug, slug: docSnap.id, ...data, publishedAt: toDate(data.publishedAt), updatedAt: toDate(data.updatedAt), createdAt: toDate(data.createdAt) } as unknown as Recipe;
    }
  } catch (err) {
    // If getDoc failed due to permissions or other reasons, log and continue
    console.warn("getDoc by id failed, will try slug query:", err);
  }

  // 2) Fallback to simple equality query on slug field
  try {
    const slugQuery = query(recipesCollection, where("slug", "==", slug), fbLimit(1));
    const snapshot = await getDocs(slugQuery);
    if (snapshot.empty) return null;
    const docData = snapshot.docs[0].data();
    return { ___id: snapshot.docs[0].id, slug, ...docData, updatedAt: toDate(docData.updatedAt), createdAt: toDate(docData.createdAt) } as unknown as Recipe;
  } catch (err) {
    console.error("getBySlug failed on slug query:", err);
    throw err;
  }
}

// export async function getByOwnerSlug(userId: string, slug: string): Promise<Recipe | null> {
//   const db = getFirestore();
//   const recipesCollection = collection(db, `draft-recipes`);
//   const slugQuery = query(recipesCollection, where("slug", "==", slug));
//   const snapshot = await getDocs(slugQuery);
//   if (snapshot.empty) {
//     return null;
//   }

//   const docData = snapshot.docs[0].data();
//   return { slug, ...docData } as Recipe;
// }

export async function getPromotedRecipes(isPromoted: boolean = true): Promise<Recipe[]> {
  if (!isPromoted) return [];

  const db = getFirestore();
  const recipesCollection = collection(db, "recipes");
  const promotedQuery = query(recipesCollection, where("promoted", "==", true));
  const snapshot = await getDocs(promotedQuery);
  return snapshot.docs.slice(0, 5).map((doc) => {
    const data = doc.data();
    return { slug: data.slug, ...data, updatedAt: toDate(data.updatedAt), createdAt: toDate(data.createdAt) } as Recipe;
  });
}

/**
 * Update a recipe document by id with the provided recipe payload.
 * The function strips the id field from the payload (if present) and updates
 * the Firestore document at `recipes/{id}`.
 */
export async function updateRecipe(id: string, recipe: Recipe): Promise<Recipe> {
  const db = getFirestore();
  const recipeRef = doc(db, 'recipes', id);
  // Avoid writing the id field into the document body
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: ___id, ...payload } = recipe as any;

  // Firestore rejects undefined values. Remove any keys that are undefined
  // but preserve null (explicitly clearing a field).
  const cleanPayload: Record<string, any> = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined)
  );

  try {
    await updateDoc(recipeRef, cleanPayload as any);
    return { ...recipe, id } as Recipe;
  } catch (err) {
    console.error('Failed to update recipe', id, err);
    throw err;
  }
}

export async function publishRecipe(r: Partial<Recipe & { ___id: string }>): Promise<any> {
  const { ___id, ...rest } = r;
  const recipe = { ...rest, id: ___id };
  console.log('Publishing recipe', recipe);

  const response = await axios.post("/api/publishRecipe", {
    recipe,
  });

  console.log(response);

  if (!response.data) {
    throw new Error("No recipe published");
  }

  return response.data;
}
