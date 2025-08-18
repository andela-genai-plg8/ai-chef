import { useQuery } from '@tanstack/react-query';
import { Recipe } from 'shared-types';
import { findRecipe, getAllRecipes, getRecipeBySlug, getPromotedRecipes } from '../api/recipes';

// Keys for React Query cache
export const recipeKeys = {
  all: ['recipes'] as const,
  byIngredients: (ingredients: string[]) => [...recipeKeys.all, 'byIngredients', ingredients] as const,
  bySlug: (slug: string) => [...recipeKeys.all, 'bySlug', slug] as const,
  promoted: ['recipes', 'promoted'] as const,
};

interface RecipeQueryParams {
  ingredients: string[];
}

export function useRecipeQuery({ ingredients }: RecipeQueryParams) {
  return useQuery({
    queryKey: recipeKeys.byIngredients(ingredients),
    queryFn: () => findRecipe({ ingredients }),
    enabled: ingredients.length >= 2, // Only run query when we have at least 2 ingredients
  });
}

export function useAllRecipesQuery() {
  return useQuery({
    queryKey: recipeKeys.all,
    queryFn: getAllRecipes,
  });
}

export function useRecipeBySlugQuery(slug: string) {
  return useQuery({
    queryKey: recipeKeys.bySlug(slug),
    queryFn: () => getRecipeBySlug(slug),
    enabled: !!slug,
  });
}

export function usePromotedRecipesQuery() {
  return useQuery({
    queryKey: recipeKeys.promoted,
    queryFn: getPromotedRecipes,
  });
}
