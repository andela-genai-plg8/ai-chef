import { useQuery } from '@tanstack/react-query';
import { Recipe } from 'shared-types';
import { findRecipe, getAllRecipes, getRecipeBySlug, getPromotedRecipes, getRecipesPage } from '../api/recipes';
import { getDictionary } from '../api/dictionary';
import { getModels } from '@/api/models';

// Keys for React Query cache
// These keys provide deterministic cache identifiers for react-query.
// Keep them serializable so cache lookups and invalidations are stable.
export const recipeKeys = {
  all: ['recipes'] as const,
  allPaged: (pageSize: number, startAfterId?: string) => [...recipeKeys.all, 'pageSize', pageSize, 'startAfter', startAfterId] as const,
  byIngredients: (ingredients: string[]) => [...recipeKeys.all, 'byIngredients', ingredients] as const,
  bySlug: (slug: string) => [...recipeKeys.all, 'bySlug', slug] as const,
  promoted: ['recipes', 'promoted'] as const,
};

// Keys for React Query cache
export const modelKeys = {
  all: ['models'] as const,
  byId: (id: string) => [...modelKeys.all, 'byId', id] as const,
  byProvider: (provider: string) => [...modelKeys.all, 'byProvider', provider] as const,
};

// Keys for React Query cache
export const dictionaryKeys = {
  all: ['dictionary'] as const,
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

/**
 * useAllRecipesQuery
 * - Without arguments, returns all recipes (not paginated).
 * - When `pageSize` is provided (>0), performs cursor-based pagination by
 *   calling `getRecipesPage(pageSize, startAfterId)` and using a paged cache key.
 *
 * Params:
 *  - pageSize?: number - items to fetch per page (when omitted fetches everything)
 *  - startAfterId?: string - optional Firestore document id used as cursor (startAfter)
 */
export function useAllRecipesQuery(pageSize?: number, startAfterId?: string) {
  // If pageSize is provided, use cursor-based pagination
  if (pageSize && pageSize > 0) {
    return useQuery({
      queryKey: recipeKeys.allPaged(pageSize, startAfterId),
      queryFn: () => getRecipesPage(pageSize, startAfterId),
    });
  }

  // otherwise return all recipes
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

export function usePromotedRecipesQuery(isPromoted: boolean = true) {
  return useQuery({
    queryKey: recipeKeys.promoted,
    queryFn: () => getPromotedRecipes(isPromoted),
  });
}

export function useModels(isSupported: boolean = true) {
  return useQuery({
    queryKey: modelKeys.all,
    queryFn: () => getModels(isSupported),
  });
}

export function useDictionary() {
  return useQuery({
    queryKey: dictionaryKeys.all,
    queryFn: () => getDictionary(),
  });
}
