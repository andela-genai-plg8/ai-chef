import { useRef, useState } from 'react';
import styles from "./Styles.module.scss";
import { useNavigate } from 'react-router-dom';
import "react-image-gallery/styles/css/image-gallery.css";
import classNames from 'classnames';
import { parseRecipe } from '@/api/recipes';
import TopMenu from '@/components/TopMenu/TopMenu';

function RecipeAdd() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'instructions' | 'videos' | 'restaurants'>('instructions');
  const [recipeToParse, setRecipeToParse] = useState('');
  const pageRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const [isSticky, setIsSticky] = useState(false);


  async function parseRecipeClicked() {
    console.info("'Parse recipe' clicked with recipe: \n" + recipeToParse);
    const parsedRecipe = await parseRecipe(recipeToParse);
    console.log("Parsed recipe:", parsedRecipe);
    console.info(`New recipe: ${parsedRecipe}`);
    navigate(`/my/recipe/${parsedRecipe.slug}`);
  }

  return (
    <div className={styles.AddRecipe} ref={pageRef}>
      <div ref={titleRef} className={classNames(styles.Title, { [styles.TitleSticky]: isSticky })}>
        <TopMenu personal={true} />
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
