import axios from "axios";
import { addDoc, collection, getDocs, getFirestore } from "firebase/firestore";
import { Recipe } from "shared-types";

import { query, where, doc, getDoc, orderBy, limit as fbLimit, startAfter } from "firebase/firestore";

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
    candidateRecipe
  });

  if (!response.data) {
    throw new Error("Recipe cannot be parsed");
  }

  const parsedRecipe = response.data as Recipe;
  return parsedRecipe;
}


export async function getAllRecipes(): Promise<{ recipes: Recipe[]; lastDocId?: string }> {
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
export async function getRecipesPage(pageSize: number = 10, startAfterId?: string): Promise<{ recipes: Recipe[]; lastDocId?: string }> {
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
export async function getOwnerRecipesPage(ownerId: string, pageSize: number = 10, startAfterId?: string): Promise<{ recipes: Recipe[]; lastDocId?: string }> {
  const db = getFirestore();
  const recipesCollection = collection(db, "recipes");

  console.log("Geting owner's recipes")

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
    q = query(recipesCollection, where("createdBy", "==", ownerId), orderBy('name'), fbLimit(pageSize));
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

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  const db = getFirestore();
  const recipesCollection = collection(db, "recipes");
  const slugQuery = query(recipesCollection, where("slug", "==", slug));
  const snapshot = await getDocs(slugQuery);
  if (snapshot.empty) {
    return null;
  }
  const docData = snapshot.docs[0].data();
  return { slug, ...docData } as Recipe;
}

export async function getOwnRecipeBySlug(userId:string, slug: string): Promise<Recipe | null> {
  const db = getFirestore();
  const recipesCollection = collection(db, `draft-recipes`);
  const slugQuery = query(recipesCollection, where("slug", "==", slug));
  const snapshot = await getDocs(slugQuery);
  if (snapshot.empty) {
    return null;
  }

  const docData = snapshot.docs[0].data();
  return { slug, ...docData } as Recipe;
}

export async function getPromotedRecipes(isPromoted: boolean = true): Promise<Recipe[]> {
  if (!isPromoted) return [];

  const db = getFirestore();
  const recipesCollection = collection(db, "recipes");
  const promotedQuery = query(recipesCollection, where("promoted", "==", true));
  const snapshot = await getDocs(promotedQuery);
  return snapshot.docs.slice(0, 5).map((doc) => {
    const data = doc.data();
    return { slug: data.slug, ...data } as Recipe;
  });
}
