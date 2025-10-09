import React, { Fragment, useEffect, useRef } from 'react';
import styles from "./Styles.module.scss";
import RecipeCard from "./RecipeCard";
import { useRecipes } from '@/hooks/useRecipes';
import { usePromotedRecipesQuery } from '@/hooks/useRecipeQuery';
import { useNavigate } from 'react-router-dom';
import { Recipe } from 'shared-types';
import classNames from 'classnames';
import { FaPlus } from 'react-icons/fa';
import { useAuth } from '@/hooks/useAuth';
import { useMediaQuery } from 'react-responsive';

/**
 * Props for RecipeList
 *
 * - `recipeList` optionally supplies an explicit list (falls back to promotedRecipes when omitted).
 * - `limit` can be used to render a fixed number of items.
 * - `loading` toggles the loading indicator shown next to the load-sentinel.
 * - `noMoreItems` prevents rendering the sentinel when there is nothing left to load.
 * - `onGetMoreRecipes` is called when the sentinel becomes visible; the parent is
 *   responsible for guarding duplicate loads (e.g. with a loading flag).
 */
export type RecipeListProps = {
  className?: string;
  recipeList?: Recipe[];
  limit?: number;
  personal?: boolean;
  loading?: boolean;
  noMoreItems?: boolean;
  collapseOnMobile?: boolean;
  onGetMoreRecipes?: () => void;
}

const RecipeList: React.FC<RecipeListProps> = ({ recipeList, personal = false, limit, className, onGetMoreRecipes, loading, noMoreItems, collapseOnMobile = false }) => {
  const { data: promotedRecipes, isLoading: isPromotedLoading } = usePromotedRecipesQuery(recipeList === undefined);
  const items = ((recipeList === undefined ? promotedRecipes : recipeList) || []);
  const listToRender = items.filter((_, index) => limit === undefined || index < limit);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const isMobile = useMediaQuery({ maxWidth: 600 });

  useEffect(() => {
    // If there's no callback or we're still loading the promoted data, do nothing.
    if (!onGetMoreRecipes) return;
    if (isPromotedLoading) return;

    // ensure we don't keep old observers around
    observerRef.current?.disconnect();
    observerRef.current = null;

    const el = loadMoreRef.current;
    const container = containerRef.current;
    if (!el) return;

    // If the immediate container is itself scrollable, use it as the observer root so
    // intersections are computed relative to that scroll area. Otherwise fall back to viewport.
    let root: Element | null = null;
    try {
      if (container) {
        const style = window.getComputedStyle(container);
        const overflowY = style.overflowY;
        const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && container.scrollHeight > container.clientHeight;
        if (isScrollable) root = container;
      }
    } catch (e) {
      root = null; // if getComputedStyle fails, fallback to viewport
    }

    // Create the observer. We call `onGetMoreRecipes` every time the sentinel enters view;
    // the parent component should use a loading flag to prevent duplicate requests.
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          try {
            onGetMoreRecipes();
          } catch (e) {
            // Ignore errors from the callback so the observer remains active.
          }
        }
      });
    }, { root, rootMargin: '0px', threshold: 0 });

    obs.observe(el);
    observerRef.current = obs;

    return () => {
      try { obs.disconnect(); } catch (e) { /* ignore */ }
    };
  }, [listToRender.length, isPromotedLoading, onGetMoreRecipes]);

  const navigate = useNavigate();
  return (
    <div ref={containerRef} className={classNames(styles.RecipeList, className, { [styles.Horizontal]: (collapseOnMobile && isMobile) })}>
      {
        user && personal &&
        <div
          className={styles.RecipeCard}
          key={`add-new-recipe`}
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #ccc', color: '#888', height: 200 }}
          onClick={() => {
            navigate(`/recipes/new`)
          }}
        >
          {/* add a big plus icon */}
          <FaPlus size={48} color="#888" />
          <div>Add New Recipe</div>
        </div>
      }
      {isPromotedLoading && !recipeList ? (
        <div>Loading promoted recipes...</div>
      ) : (
        <Fragment>
          {
            listToRender.map((recipe, idx) => {
              return (

                <div
                  className={styles.RecipeCard}
                  key={`${recipe.id}-${recipe.slug}-${idx}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    if (personal) navigate(`/my/recipe/${recipe.id}`)
                    else navigate(`/recipe/${recipe.slug}`)
                  }}
                >
                  <RecipeCard recipe={recipe} />
                </div>
              );
            })
          }
          {
            (typeof onGetMoreRecipes === 'function' && !noMoreItems && !loading && listToRender.length > 0) &&
            <div className={styles.LoadMore} ref={loadMoreRef}><span>Load more...</span></div>
          }
          {
            (typeof onGetMoreRecipes === 'function' && loading) &&
            <div className={styles.LoadMore}><span>Loading...</span></div>
          }
        </Fragment>
      )}
    </div>
  );
}

export default RecipeList
