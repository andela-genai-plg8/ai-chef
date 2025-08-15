import React from 'react'
import styles from "./Styles.module.scss"
import { Recipe } from 'shared-types'; // Assuming Recipe type is defined in sharedtypes
import classNames from 'classnames';

export type RecipeCardProps = {
  recipe: Recipe;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  return (
    <div
      className={classNames(styles["RecipeCard"], styles["shadow"], styles["rounded"], styles["border-1"], styles["shadow-lg"])}
      style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        overflow: 'hidden',
        padding: '0rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: 400,
        fontSize: '1.1rem',
        color: '#222',
      }}
    >
      <div style={{
        width: '100%',
        height: '200px',
        backgroundImage: `url(${recipe.image})`,
        backgroundSize: '120%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }} />
      <div style={{ fontWeight: 700, fontSize: '1.15rem', margin: '0.5rem', textAlign: 'center' }}>{recipe.name}</div>
      <div style={{ fontSize: '0.95rem', color: '#555', marginBottom: '0.75rem', textAlign: 'center' }}>
        {recipe.description || 'No description available.'}
      </div>
      <div style={{ fontSize: '0.9rem', color: '#388e3c', fontWeight: 500 }}>
        Prep Time: {recipe.preparationTime} min
      </div>
    </div>
  );
}

export default RecipeCard
