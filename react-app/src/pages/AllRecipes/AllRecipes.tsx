
import { useEffect, useState } from 'react';
import styles from "./Styles.module.scss";
import RecipeList from '@/components/Recipe/RecipeList';
import { useRecipes } from '@/utils/useRecipes';

function AllRecipes() {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'inspiration'>('ingredients');
  const [ingredient, setIngredient] = useState('');
  const { ingredients, recipes, addIngredient, removeIngredientAt, getAllRecipes } = useRecipes();


  useEffect(() => {
    if (recipes.length === 0) {
      getAllRecipes();
    }
  }, []);

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
    <div className="container-fluid">
      <div className={`btn-group ${styles["home-tab-container"]}`}>
        <button
          className={`btn btn-sm tab-btn ${styles["home-tab-btn-left"]} ${activeTab === 'ingredients' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setActiveTab('ingredients')}
        >
          Search by Ingredients
        </button>
        <button
          className={`btn btn-sm tab-btn ${styles["home-tab-btn-right"]} ${activeTab === 'inspiration' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setActiveTab('inspiration')}
        >
          Meal Inspiration
        </button>
      </div>

      {activeTab === 'ingredients' && (
        <div>
          <div className="input-group mb-3">
            <input
              type="text"
              className="form-control"
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
              className="btn btn-success"
              onClick={handleAdd}
              disabled={!ingredient.trim()}
            >
              Add
            </button>
          </div>
          {/* Tag list below search box */}
          {ingredients.length > 0 && (
            <div className="mb-3 d-flex align-items-center">
              <div className={styles["home-tag-list"]}>
                {ingredients.map((ing, idx) => (
                  <span
                    key={idx}
                    className={`badge bg-primary text-light d-flex align-items-center ${styles["home-tag"]}`}
                  >
                    {ing}
                    <button
                      type="button"
                      className={`btn-close btn-close-white ms-2 ${styles["home-tag-close"]}`}
                      aria-label="Remove"
                      onClick={() => handleRemoveTag(idx)}
                    />
                  </span>
                ))}
              </div>
              {ingredients.length >= 2 && (
                <button
                  className={`btn btn-success ms-3 ${styles["home-tag"]}`}
                  style={{ height: '2.5rem', borderRadius: '20px', fontWeight: 600 }}
                  onClick={async () => {
                    await useRecipes.getState().findRecipe();
                  }}
                >
                  Search
                </button>
              )}
            </div>
          )}

          <RecipeList />
        </div>
      )}

      {activeTab === 'inspiration' && (
        <div>
          <h4>Meal Inspiration</h4>
          <p>Get inspired with new recipes and ideas!</p>
        </div>
      )}
    </div>
  );
}

export default AllRecipes;
