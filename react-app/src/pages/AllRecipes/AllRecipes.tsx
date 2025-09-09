import styles from "./Styles.module.scss";
import RecipeList from '@/components/Recipe/RecipeList';
import Search from "@/components/Search/Search";
import { useAllRecipesQuery } from '@/hooks/useRecipeQuery';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRecipes } from "@/hooks/useRecipes";
import { Recipe } from "shared-types";

function AllRecipes() {
  const PAGE_SIZE = 10;
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined); // startAfter id used to fetch next page
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreTimeoutRef = useRef<number | null>(null);
  const [endOfList, setEndOfList] = useState<boolean>(false);

  const { data: pageData, isLoading } = useAllRecipesQuery(PAGE_SIZE, cursor);

  const lastDocId = useMemo(() => {
    return allRecipes.length > 0 ? allRecipes[allRecipes.length - 1].id : undefined;
  }, [allRecipes.length]);

  const oldIds = useMemo(() => {
    return allRecipes.length > 0 ? allRecipes.map(r => r.id) : [];
  }, [allRecipes.length]);

  const oldSlugs = useMemo(() => {
    return allRecipes.length > 0 ? allRecipes.map(r => r.slug) : [];
  }, [allRecipes.length]);

  useEffect(() => {
    if (!pageData) return;

    const { recipes } = pageData as any;
    // append only if we received recipes
    if (pageData && recipes.length > 0) {

      setAllRecipes((prev) => {
        let newRecipes = recipes.filter((r: { id: string }) => !oldIds.includes(r.id));
        newRecipes = recipes.filter((r: { slug: string }) => !oldSlugs.includes(r.slug));
        return [...prev, ...newRecipes];
      });
    }
  }, [pageData, pageData?.recipes?.length, cursor]);

  // cleanup any pending timeout on unmount
  useEffect(() => {
    return () => {
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, []);

  const handleGetMoreRecipes = () => {
    if (loadingMore || isLoading) return;
    // if we don't have a lastDocId (no more pages), do nothing
    if (!lastDocId) return;
    setLoadingMore(true);
    // delay the actual fetch by 3 seconds
    // store timeout id so we can clear it if needed
    loadMoreTimeoutRef.current = window.setTimeout(() => {
      if (lastDocId) {
        setCursor(lastDocId);
      }
      loadMoreTimeoutRef.current = null;
    }, 1000);
  };

  return (
    <div className={styles.AllRecipes}>
      <div className={styles.Heading}>
        <h1 className={styles.Title}>Search for Recipes</h1>

        <Search className={styles.Search} />
      </div>
      <RecipeList className={styles.RecipeList} recipeList={allRecipes} loading={isLoading} noMoreItems={endOfList} onGetMoreRecipes={handleGetMoreRecipes} />
    </div>
  );
}

export default AllRecipes;
