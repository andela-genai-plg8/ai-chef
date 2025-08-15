import React from 'react';
import styles from "./Styles.module.scss";
import RecipeCard from "./RecipeCard";
import { useRecipes } from '@/utils/useRecipes';
import { useNavigate } from 'react-router-dom';

export type RecipeListProps = {}

const RecipeList: React.FC<RecipeListProps> = () => {
  const { recipes } = useRecipes();
  const navigate = useNavigate();

  return (
    <div className={styles["RecipeList"]}>
      {recipes.map((recipe, idx) => (
        <div
          key={idx}
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/recipe/${recipe.name}`)}
        >
          <RecipeCard recipe={recipe} />
        </div>
      ))}
    </div>
  );
}

export default RecipeList
