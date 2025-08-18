import axios from "axios";
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { Recipe } from "shared-types";

import { query, where, doc, getDoc } from "firebase/firestore";

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

export async function getAllRecipes(): Promise<Recipe[]> {
  const db = getFirestore();
  const recipesCollection = collection(db, "recipes");
  const snapshot = await getDocs(recipesCollection);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return { slug: data.slug, ...data } as Recipe;
  });
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

export async function getPromotedRecipes(): Promise<Recipe[]> {
  const db = getFirestore();
  const recipesCollection = collection(db, "recipes");
  const promotedQuery = query(recipesCollection, where("promoted", "==", true));
  const snapshot = await getDocs(promotedQuery);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return { slug: data.slug, ...data } as Recipe;
  });
}
