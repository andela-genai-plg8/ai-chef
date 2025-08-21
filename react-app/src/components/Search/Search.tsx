import React, { CSSProperties, useState } from "react";
import styles from "./Styles.module.scss";
import { useRecipes } from "@/hooks/useRecipes";
import classNames from "classnames";
import RecipeList from "../Recipe/RecipeList";

export type SearchProps = {
  showResults?: boolean;
  className?: string;
  style?: CSSProperties
};

const Search: React.FC<SearchProps> = ({ showResults = false, className = "", style = {} }) => {
  const [ingredient, setIngredient] = useState('');
  const { ingredients, addIngredient, removeIngredientAt } = useRecipes();

  const handleAdd = () => {
    if (ingredient.trim() && !ingredients.includes(ingredient.trim())) {
      addIngredient(ingredient.trim());
      setIngredient('');
    }
  };

  const handleRemoveTag = (idx: number) => {
    // Remove ingredient by index from the zustand store
    removeIngredientAt(idx);
  };

  return (
    <div className={classNames(styles.Search, className)} style={style}>
      <div className={styles.IngredientsTab}>
        <div className={styles.InputGroup}>
          <input
            type="text"
            className={styles.FormControl}
            placeholder="Enter an ingredient"
            value={ingredient}
            onChange={e => setIngredient(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && ingredient.trim()) {
                handleAdd();
              }
            }}
          />
          <button
            className={styles.SearchButton}
            onClick={handleAdd}
            disabled={!ingredient.trim()}
          >
            Add
          </button>
        </div>

        {/* Tag list below search box */}
        {ingredients.length > 0 && (
          <div className={styles.TagRow}>
            <div className={styles.HomeTagList}>
              {ingredients.map((ing, idx) => (
                <span
                  key={idx}
                  className={styles.HomeTag}
                >
                  {ing}
                  <button
                    type="button"
                    className={styles.HomeTagClose}
                    aria-label="Remove"
                    onClick={() => handleRemoveTag(idx)}
                  />
                </span>
              ))}
            </div>
            {ingredients.length >= 2 && (
              <button
                className={classNames(styles.HomeTag, styles.SearchButton)}
                onClick={async () => {
                  await useRecipes.getState().findRecipe();
                }}
              >
                Search
              </button>
            )}
          </div>
        )}

        {showResults && (<RecipeList recipeList={useRecipes.getState().searchedRecipes} />)}
      </div>
    </div>
  );
};

export default Search;
