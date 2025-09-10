import { create } from "zustand";
import axios from "axios";
import { IngredientName, Recipe } from "shared-types";
import useChat from "./useChat";
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { useAppState } from "./useAppState";

type RecipesState = {
  recipes: Recipe[];
  searchedRecipes: Recipe[];
  ingredients: IngredientName[];
  addIngredient: (ingredient: IngredientName) => void;
  addIngredients: (ingredients: IngredientName[]) => void;
  setIngredients: (ingredients: IngredientName[]) => void;
  findRecipe: () => Promise<Recipe[] | undefined>;
  removeIngredient: (ingredient: string) => void;
  removeIngredientAt: (index: number) => void;
  getAllRecipes: () => Promise<Recipe[] | undefined>;
  setSearchedRecipes: (recipes: Recipe[]) => void;
};

export const useRecipes = create<RecipesState>(
  (set, get): RecipesState => ({
    recipes: [],
    searchedRecipes: [],
    ingredients: [],
    addIngredient: (ingredient: IngredientName): void =>
      set((state) => ({
        ingredients: [...state.ingredients, ingredient],
      })),
    addIngredients: (ingredients: IngredientName[]): void =>
      set((state) => ({
        ingredients: [...state.ingredients, ...ingredients],
      })),
    setIngredients: (ingredients: IngredientName[]): void => set({ ingredients }),
    removeIngredient: (ingredient: string) => {
      set((state) => ({
        ingredients: state.ingredients.filter((ing) => ing !== ingredient),
      }));
    },
    removeIngredientAt: (index: number) => {
      set((state) => ({
        ingredients: state.ingredients.filter((_, i) => i !== index),
      }));
    },
    findRecipe: async (): Promise<Recipe[] | undefined> => {
      const { ingredients } = get();
      const words = useAppState.getState().words;
      const tags = ingredients.map((ing) => {
        const ings = ing.toLowerCase();
        return words[ings] ? words[ings] : null;
      }).filter(f => f !== null);

      console.log("Tags:", tags);
      try {
        const response = await axios.post("/api/findRecipe", {
          ingredients,
          tags
        });
        const recipes = response.data as Recipe[];
        set((state) => ({ ...state, recipes }));

        return recipes;
      } catch (error) {
        console.error("Error finding recipe:", error);
        return undefined;
      }
    },
    getAllRecipes: async (): Promise<Recipe[] | undefined> => {
      try {
        const db = getFirestore();
        const recipesCollection = collection(db, "recipes");
        const recipesSnapshot = await getDocs(recipesCollection);
        const recipes = recipesSnapshot.docs.map((doc) => doc.data() as Recipe);
        set((state) => ({ ...state, recipes }));

        return recipes;
      } catch (error) {
        console.error("Error getting all recipes:", error);
        return undefined;
      }
    },
    setSearchedRecipes: (searchedRecipes) => set({ searchedRecipes }),
  })
);

useRecipes.subscribe(({ searchedRecipes }) => {
  console.log("Searched recipes updated:", searchedRecipes);
});
