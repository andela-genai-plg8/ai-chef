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
    navigate(`/my/recipes/${parsedRecipe.slug}`);
  }
  async function uploadRecipeClicked() {
    console.info("'Upload recipe' clicked");
  }

  return (
    <div className={styles.AddRecipe} ref={pageRef}>
      <div ref={titleRef} className={classNames(styles.Title, { [styles.TitleSticky]: isSticky })}>
        <h1>Add new recipe</h1>
      </div>
      <div className={styles["container-fluid"]}>
        <textarea className={styles.RecipeTextarea} placeholder='Paste the recipe here' value={recipeToParse} onChange={(e) => setRecipeToParse(e.target.value)}></textarea>
        <button disabled={!recipeToParse} className={styles.ParseButton} onClick={parseRecipeClicked}>Parse recipe</button>
      </div>      
    </div>
  );
}

export default RecipeAdd;
