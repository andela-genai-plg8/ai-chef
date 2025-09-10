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
        backgroundImage: `url("${recipe.image === 'None' ? NO_IMAGE : recipe.image}")`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center'
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
