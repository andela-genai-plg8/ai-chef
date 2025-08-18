import React, { CSSProperties, useState } from "react";
import styles from "./Styles.module.scss";
import { useRecipes } from "@/hooks/useRecipes";
import classNames from "classnames";

export type SearchProps = { className?: string; style?: CSSProperties };

const Search: React.FC<SearchProps> = ({ className = "", style = {} }) => {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'inspiration'>('ingredients');
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
      <div className={classNames(styles.HomeTabContainer)}>
        <button
          className={classNames(styles.HomeTabBtnLeft, activeTab === 'ingredients' ? styles.active : styles.inactive)}
          onClick={() => setActiveTab('ingredients')}
        >
          Search by Ingredients
        </button>
        <button
          className={classNames(styles.HomeTabBtnRight, activeTab === 'inspiration' ? styles.active : styles.inactive)}
          onClick={() => setActiveTab('inspiration')}
        >
          Meal Inspiration
        </button>
      </div>

      {activeTab === 'ingredients' && (
        <div className={styles.IngredientsTab}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              className={styles.formControl}
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
              className={styles.searchButton}
              onClick={handleAdd}
              disabled={!ingredient.trim()}
            >
              Add
            </button>
          </div>
          {/* Tag list below search box */}
          {ingredients.length > 0 && (
            <div className={styles.tagRow}>
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
                  className={classNames(styles.HomeTag, styles.searchButton)}
                  onClick={async () => {
                    await useRecipes.getState().findRecipe();
                  }}
                >
                  Search
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'inspiration' && (
        <div>
          <h4>Meal Inspiration</h4>
          <p>Get inspired with new recipes and ideas!</p>
        </div>
      )}
    </div>
  )
}

export default Search
