import React from 'react'
import styles from "./Styles.module.scss"
import { Recipe } from 'shared-types'; // Assuming Recipe type is defined in sharedtypes
import classNames from 'classnames';

export type RecipeCardProps = {
  recipe: Recipe;
  className?: string;
}

const NO_IMAGE = "https://media.istockphoto.com/id/1147544807/pl/wektor/obraz-miniatury-grafika-wektorowa.jpg?s=1024x1024&w=is&k=20&c=MxGOCjKYwJGcmDVb-KMdj_y_IhQEs7KfMB1BXbhRZRc=";
const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, className }) => {
  return (
    <div
      className={classNames(styles.RecipeCard, className || "")}
    >
      <div style={{
        backgroundImage: `url("${recipe.image === 'None' ? NO_IMAGE : recipe.image}")`,
      }} className={styles.RecipeCardImage}
      />
      <div className={styles.RecipeCardName}>{recipe.name}</div>
      <div className={styles.RecipeCardDesc}>
        {recipe.description || 'No description available.'}
      </div>
      <div className={styles.RecipeCardPrep}>
        {recipe.preparationTime && `Prep Time: ${recipe.preparationTime} min`}
      </div>
    </div>
  );
}

export default RecipeCard
