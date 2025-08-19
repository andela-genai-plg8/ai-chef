import React from 'react';
import styles from "./Styles.module.scss";
import RecipeCard from "./RecipeCard";
import { useRecipes } from '@/hooks/useRecipes';
import { usePromotedRecipesQuery } from '@/hooks/useRecipeQuery';
import { useNavigate } from 'react-router-dom';
import { Recipe } from 'shared-types';
import classNames from 'classnames';

export type RecipeListProps = {
  className?: string; // Optional className for styling
  recipeList?: Recipe[]; // Optional prop for passing a specific recipe list
}

const RecipeList: React.FC<RecipeListProps> = ({ recipeList, className }) => {
  const { data: promotedRecipes, isLoading: isPromotedLoading } = usePromotedRecipesQuery(recipeList === undefined);
  const listToRender = (recipeList === undefined ? promotedRecipes : recipeList) || [];

  console.log(recipeList)

  const navigate = useNavigate();
  return (
    <div className={classNames(styles.RecipeList, className)}>
      {isPromotedLoading && !recipeList ? (
        <div>Loading promoted recipes...</div>
      ) : (
        listToRender.map((recipe, idx) => (
          <div
            key={idx}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/recipe/${recipe.slug}`)}
          >
            <RecipeCard recipe={recipe} />
          </div>
        ))
      )}
    </div>
  );
}

export default RecipeList
