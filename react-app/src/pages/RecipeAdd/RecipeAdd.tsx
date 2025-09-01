import { useMemo, useRef, useState, useEffect } from 'react';
import styles from "./Styles.module.scss";
import { useNavigate, useParams } from 'react-router-dom';
import ImageGallery from 'react-image-gallery';
import "react-image-gallery/styles/css/image-gallery.css";
import classNames from 'classnames';
import { parseRecipe } from '@/api/recipes';

function RecipeAdd() {
  const location = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'instructions' | 'videos' | 'restaurants'>('instructions');
  const [recipeToParse, setRecipeToParse] = useState('');
  const imageGalleryRef = useRef<HTMLDivElement | null>(null);
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isSticky, setIsSticky] = useState(false);
  const imageGalleryDim = useMemo(() => {
    return imageGalleryRef.current?.getBoundingClientRect() || { height: 400, width: 400 }; // Fallback to 400 if ref is not available
  }, [imageGalleryRef]);

  const ingredientHeight = useMemo(() => {
    return descriptionRef.current?.getBoundingClientRect().height || 400; // Fallback to 400 if ref is not available
  }, [descriptionRef]);

  async function parseRecipeClicked() {
    console.info("'Parse recipe' clicked with recipe: \n" + recipeToParse);
    const parsedRecipe = await parseRecipe(recipeToParse);
    console.info(`New recipe: ${parsedRecipe}`);
    navigate(`/recipe/${parsedRecipe.slug}`);
  }
  async function uploadRecipeClicked() {
    console.info("'Upload recipe' clicked");
  }

  return (
    <div className={styles.RecipePage} ref={pageRef}>
      <div ref={titleRef} className={classNames(styles.Title, { [styles.TitleSticky]: isSticky })}>
        <h1>Add new recipe</h1>
      </div>
      {/* sentinel element just below the title to detect when it scrolls out of view */}
      {/* <div ref={sentinelRef} style={{ height: 1, width: '100%' }} /> */}
      <div className={styles.TopColumns}>
        <div className={styles.LeftColumn}>
          <textarea placeholder='Paste the recipe here' value={recipeToParse} onChange={(e) => setRecipeToParse(e.target.value)}></textarea>
          <button onClick={parseRecipeClicked}>Parse recipe</button>
        </div>
      </div>
      <div className={styles.TopColumns}>
        <div className={styles.LeftColumn}>
          <div className={classNames(styles.Section, styles.Ingredients)} style={{ marginBottom: 0, height: (imageGalleryDim.height - ingredientHeight) } }>
            <h2>Ingredients</h2>
            <ul className={styles.IngredientList}>
              
            </ul>
          </div>
        </div>
        <div className={styles.RightColumn}>
          <div className={styles.ImageGallery} ref={imageGalleryRef}>
            
          </div>
        </div>
      </div>

      <div className={styles.TabsContainer}>
        <div className={styles.TabsRow}>
          <button
            className={activeTab === 'instructions' ? styles.ActiveTab : styles.Tab}
            onClick={() => setActiveTab('instructions')}
          >Instructions</button>          
        </div>
        <div className={styles.TabContent}>
          {activeTab === 'instructions' && (
            <div className={styles.Section} style={{ marginTop: 0 }}>
              <h2>Instructions</h2>
              <ol className={styles.InstructionsList}>

              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecipeAdd;
