import styles from "./Styles.module.scss";
import RecipeList from '@/components/Recipe/RecipeList';
import Search from "@/components/Search/Search";
import TopMenu from "@/components/TopMenu/TopMenu";
import { useAuth } from "@/hooks/useAuth";
import { useAllRecipesQuery } from '@/hooks/useRecipeQuery';
import classNames from "classnames";
import { useState, useEffect, useRef, useMemo } from 'react';
import { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";

export type AllRecipesProps = {
  className?: string;
  style?: CSSProperties;
  personal?: boolean;
};

const AllRecipes: React.FC<AllRecipesProps> = ({ personal = false }) => {
  const PAGE_SIZE = 10;
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined); // startAfter id used to fetch next page
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreTimeoutRef = useRef<number | null>(null);
  const [endOfList, setEndOfList] = useState<boolean>(false);
  const { user } = useAuth();

  const filterByUser = personal && user?.uid ? user.uid : undefined;
  const { data: pageData, isLoading } = useAllRecipesQuery(PAGE_SIZE, cursor, filterByUser);


  const lastDocId = useMemo(() => {
    return allRecipes.length > 0 ? allRecipes[allRecipes.length - 1].id : undefined;
  }, [allRecipes.length, allRecipes?.[allRecipes.length - 1]?.id]);

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

        const combined = [...prev, ...newRecipes].reduce((acc: any, curr: any) => {
          if (!acc.find((item: any) => item.id === curr.id)) {
            acc.push(curr);
          }
          return acc;
        }, []); // remove duplicates
        
        return combined;
      });
    }

    if (lastDocId && recipes.length === 0) {
      setEndOfList(true)
      setTimeout(() => setEndOfList(false), 3000);
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
    if (isLoading) return;
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
        <div className={styles.HeadingContainer}>
          <TopMenu personal={personal} />

          <div className={styles.Title}>
            <h1>Search for Recipes</h1>
          </div>
        </div>

        <Search className={styles.Search} />
      </div>
      {
        filterByUser && !isLoading && allRecipes.length === 0 && <div className={styles.RecipeList}><p>You have not added recipes yet.</p></div>
      }
      <RecipeList className={styles.RecipeList} personal={personal} recipeList={allRecipes} loading={isLoading} noMoreItems={endOfList} onGetMoreRecipes={handleGetMoreRecipes} />
    </div>
  );
}

export default AllRecipes;
