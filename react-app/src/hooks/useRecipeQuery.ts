import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Recipe } from 'shared-types';
import { findRecipe, getAll, getBySlug, getPromotedRecipes, getPaged, getByOwnerPaged, updateRecipe, publishRecipe } from '../api/recipes';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage';
import { getApp, getApps } from 'firebase/app';
import '../firebase';
import { getDictionary } from '../api/dictionary';
import { getModels } from '@/api/models';
import { deleteRecipe } from '@/api/recipes';
import { useAuth } from './useAuth';

// Keys for React Query cache
// These keys provide deterministic cache identifiers for react-query.
// Keep them serializable so cache lookups and invalidations are stable.
export const recipeKeys = {
  all: ['recipes'] as const,
  allPaged: (pageSize: number, startAfterId?: string) => [...recipeKeys.all, 'pageSize', pageSize, 'startAfter', startAfterId] as const,
  byOwner: (ownerId: string, pageSize: number = 20, startAfterId?: string) => [...recipeKeys.all, 'owner', ownerId, 'pageSize', pageSize, 'startAfter', startAfterId] as const,
  byIngredients: (ingredients: string[]) => [...recipeKeys.all, 'byIngredients', ingredients] as const,
  bySlug: (slug: string) => [...recipeKeys.all, 'bySlug', slug] as const,
  byOwnerSlug: (userId: string, slug: string) => [...recipeKeys.all, 'byOwnerSlug', userId, slug] as const,
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
export function useAllRecipesQuery(pageSize?: number, startAfterId?: string, userId?: string) {

  // If pageSize is provided, use cursor-based pagination
  if (pageSize && pageSize > 0) {
    return useQuery({
      queryKey: userId ? recipeKeys.byOwner(userId, pageSize, startAfterId) : recipeKeys.allPaged(pageSize, startAfterId),
      queryFn: () => userId ? getByOwnerPaged(userId, pageSize, startAfterId) : getPaged(pageSize, startAfterId),
    });
  }

  // otherwise return all recipes
  return useQuery({
    queryKey: recipeKeys.all,
    queryFn: getAll,
  });
}

export function useRecipeBySlugQuery(slug: string) {
  return useQuery({
    queryKey: recipeKeys.bySlug(slug),
    queryFn: () => getBySlug(slug),
    enabled: !!slug,
  });
}

// export function useOwnRecipeBySlugQuery(userId: string, slug: string) {
//   return useQuery({
//     queryKey: recipeKeys.byOwnerSlug(userId, slug),
//     queryFn: () => getByOwnerSlug(userId, slug),
//     enabled: !!slug,
//   });
// }

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

/**
 * Mutation hook to update a recipe using the `updateRecipe` API helper.
 * On success it invalidates relevant recipe query caches so UI shows fresh data.
 */
export function useUpdateRecipe() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, recipe }: { id: string; recipe: Recipe }) => {
      return updateRecipe(id, { ...recipe, updatedAt: new Date() });
    },
    onSuccess: (data) => {
      // invalidate general recipe caches so updated recipe is refetched where needed
      qc.invalidateQueries({ queryKey: recipeKeys.all });
      qc.invalidateQueries({ queryKey: recipeKeys.promoted });
      // also invalidate by-slug entry if slug is present
      if (data.id) {
        console.log('Invalidating bySlug for', data.id);
        qc.invalidateQueries({ queryKey: recipeKeys.bySlug(data.id) });
      }
    },
  });
}

/**
 * Uploads a File to Firebase Storage under a recipes/ prefix and returns the download URL.
 * Uses the recipe object to construct a sensible path. This helper is intentionally
 * side-effect free with respect to Firestore; it only uploads the file and returns the URL.
 */
export async function useUploadRecipeImage(file: File, recipe: Recipe): Promise<string> {
  if (!file || !file.name) throw new TypeError('Invalid file provided to uploadRecipeImage');
  if (!getApps().length) throw new Error('Firebase app is not initialized');
  const app = getApp();
  // ensure storageBucket is configured on the Firebase app
  const appOptions: any = (app as any).options || {};
  if (!appOptions.storageBucket) {
    console.error('Firebase app is missing storageBucket configuration:', appOptions);
    throw new Error('Firebase Storage is not configured (missing storageBucket in Firebase config)');
  }
  const storage = getStorage(app);
  const safeName = (recipe?.id || recipe?.slug || recipe?.name || 'recipe').toString().replace(/\s+/g, '_');
  const path = `recipes/${safeName}_${Date.now()}_${String(file.name)}`;
  let sRef;
  try {
    sRef = storageRef(storage, path);
  } catch (err) {
    console.error('Failed to create storage ref', { path, fileName: file.name, appOptions, err });
    throw new Error('Unable to create Firebase Storage reference. See console for details.');
  }
  const uploadTask = uploadBytesResumable(sRef, file);

  await new Promise<void>((resolve, reject) => {
    uploadTask.on('state_changed', () => {
      // could report progress here if needed
    }, (err) => reject(err), () => resolve());
  });

  const url = await getDownloadURL(sRef);
  return url;
}

export function usePublishRecipe() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (recipe: Recipe | null | undefined) => {
      if (!recipe) return;
      return await publishRecipe(recipe);
    },
    onSuccess: (data) => {
      // invalidate general recipe caches so updated recipe is refetched where needed
      qc.invalidateQueries({ queryKey: recipeKeys.bySlug(data.id) });
      // also invalidate by-slug entry if slug is present
      if (data.id) {
        console.log('Invalidating bySlug for', data.id);
        qc.invalidateQueries({ queryKey: recipeKeys.bySlug(data.id) });
      }
    },
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (recipe: Recipe) => {
      return await deleteRecipe(recipe);
    },
    onSuccess: (_data) => {
      console.log('Deleted recipe', _data);
      // invalidate general recipe caches so deleted recipe is removed where needed
      if (user?.uid) {
        qc.invalidateQueries({ queryKey: recipeKeys.byOwner(user.uid, 20) });
      }
      qc.invalidateQueries({ queryKey: recipeKeys.promoted });
    },
  });
}
