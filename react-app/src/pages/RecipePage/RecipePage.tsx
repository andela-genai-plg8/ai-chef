import { useMemo, useRef, useState, useEffect } from 'react';
import styles from "./Styles.module.scss";
import { useRecipeBySlugQuery } from '@/hooks/useRecipeQuery';
import { useParams } from 'react-router-dom';
import ImageGallery from 'react-image-gallery';
import "react-image-gallery/styles/css/image-gallery.css";
import classNames from 'classnames';

function RecipePage() {
  const location = useParams();
  const { data: recipe, isLoading } = useRecipeBySlugQuery(location.slug || "");
  const [activeTab, setActiveTab] = useState<'instructions' | 'videos' | 'restaurants'>('instructions');

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

  if (isLoading) {
    return <div className={styles.RecipePage}>Loading...</div>;
  }
  if (!recipe) {
    return <div className={styles.RecipePage}>Recipe not found.</div>;
  }

  return (
    <div className={styles.RecipePage} ref={pageRef}>
      <div ref={titleRef} className={classNames(styles.Title, { [styles.TitleSticky]: isSticky })}>
        <h1>{recipe.name}</h1>
      </div>
      {/* sentinel element just below the title to detect when it scrolls out of view */}
      {/* <div ref={sentinelRef} style={{ height: 1, width: '100%' }} /> */}
      <div className={styles.TopColumns}>
        <div className={styles.LeftColumn}>
          <div className={styles.Section} style={{ marginBottom: 0 }} ref={descriptionRef}>
            <h2>Description</h2>
            <p className={styles.description}>{recipe.description}</p>
          </div>
          <div className={classNames(styles.Section, styles.Ingredients)} style={{ marginBottom: 0, height: (imageGalleryDim.height - ingredientHeight) } }>
            <h2>Ingredients</h2>
            <ul className={styles.IngredientList}>
              {recipe.ingredients.map((ing, idx) => (
                <li key={idx} className={styles.IngredientItem}>
                  <span className={styles.IngredientName}>{ing.name}</span>
                  <span className={styles.IngredientQty}>{ing.quantity} {ing.unit || ''}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className={styles.CenterColumn}>
          <div className={styles.InfoCard}><span>⏱️</span> {recipe.preparationTime || 'N/A'} min</div>
          <div className={styles.InfoCard}><span>🔥</span> {recipe.calories || 'N/A'} cal</div>
          <div className={styles.InfoCard}><span>🍽️</span> {recipe.servings || 'N/A'} servings</div>
        </div>
        <div className={styles.RightColumn}>
          <div className={styles.ImageGallery} ref={imageGalleryRef}>
            {recipe.image && (
              <ImageGallery
                items={([recipe.image, ...(recipe.otherImages || [])]).map((img, idx) => ({
                  original: img,
                  thumbnail: img,
                  description: `${recipe.name} ${idx + 1}`,
                  // originalHeight: imageGalleryDim.height,
                  originalWidth: imageGalleryDim.width,
                }))}
                showThumbnails={false}
                showFullscreenButton={false}
              />
            )}
          </div>
        </div>
      </div>

      <div className={styles.TabsContainer}>
        <div className={styles.TabsRow}>
          <button
            className={activeTab === 'instructions' ? styles.ActiveTab : styles.Tab}
            onClick={() => setActiveTab('instructions')}
          >Instructions</button>
          <button
            className={activeTab === 'videos' ? styles.ActiveTab : styles.Tab}
            onClick={() => setActiveTab('videos')}
          >Videos</button>
          <button
            className={activeTab === 'restaurants' ? styles.ActiveTab : styles.Tab}
            onClick={() => setActiveTab('restaurants')}
          >Nearby Restaurants</button>
        </div>
        <div className={styles.TabContent}>
          {activeTab === 'instructions' && (
            <div className={styles.Section} style={{ marginTop: 0 }}>
              <h2>Instructions</h2>
              <ol className={styles.InstructionsList}>
                {recipe.instructions.map((step, idx) => (
                  <li key={idx} className={styles.InstructionItem}>
                    <span className={styles.StepNum}>Step {step.step}:</span> {step.instruction} {step.duration ? <span className={styles.StepDuration}>({step.duration} min)</span> : null}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {activeTab === 'videos' && (
            <div className={styles.section} style={{ marginTop: 0 }}>
              <h2>Videos</h2>
              <div className={styles.placeholder}>🎬 Recipe videos coming soon!</div>
            </div>
          )}
          {activeTab === 'restaurants' && (
            <div className={styles.section} style={{ marginTop: 0 }}>
              <h2>Nearby Restaurants</h2>
              <div className={styles.placeholder}>🍴 Find restaurants serving this dish near you soon!</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecipePage;
