import React, { useMemo, useRef, useState, Fragment } from 'react';
import styles from "./Styles.module.scss";
import ImageGallery from 'react-image-gallery';
import "react-image-gallery/styles/css/image-gallery.css";
import classNames from 'classnames';
import { useMediaQuery } from 'react-responsive';
import { Recipe } from 'shared-types';
import e from 'express';
import { uploadRecipeImage, deleteRecipeImageByUrl } from '../../hooks/useRecipeQuery';
import { RiDeleteBin7Fill } from "react-icons/ri";

export type RecipeDetailProps = {
  recipe: Recipe;
  edit: boolean;
  className?: string;
  onSave?: (updatedRecipe: Recipe) => void;
  onPublish?: (updatedRecipe: Recipe) => void;
  onChange?: (updatedRecipe: Recipe) => void;
}

const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, className, edit, onSave, onPublish, onChange }) => {
  const [activeTab, setActiveTab] = useState<'instructions' | 'videos' | 'restaurants'>('instructions');

  const imageGalleryRef = useRef<HTMLDivElement | null>(null);
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [newIngredientInput, setNewIngredientInput] = useState({ name: '', qty: '', unit: '' });
  const isMobile = useMediaQuery({ maxWidth: 390 });
  const imageGalleryDim = useMemo(() => {
    if (isMobile && pageRef.current) {
      return { height: 300, width: pageRef.current.clientWidth - 50 }; // Fallback to 400 if ref is not available
    }

    return imageGalleryRef.current?.getBoundingClientRect() || { height: 400, width: 400 }; // Fallback to 400 if ref is not available
  }, [imageGalleryRef, pageRef]);

  function handleRemoveIngredient(idx: number): void {
    if (!edit) return;
    const updatedIngredients = recipe.ingredients.filter((_, i) => i !== idx);
    const updatedRecipe: Recipe = { ...recipe, ingredients: updatedIngredients };
    if (onChange) onChange(updatedRecipe);
    // Optionally, call onSave if you want to persist immediately
    // if (onSave) onSave(updatedRecipe);
  }

  return (
    <div className={classNames(styles.RecipeDetail, className)} ref={pageRef}>
      {/* sentinel element just below the title to detect when it scrolls out of view */}
      {/* <div ref={sentinelRef} style={{ height: 1, width: '100%' }} /> */}
      {edit}
      <div className={styles["container"]}>
        <div className={styles.TopColumns}
          style={isMobile && pageRef.current ? { maxWidth: '100%', width: '100%' } as React.CSSProperties : undefined}>

          <div className={styles.CenterColumn}>
            <div className={styles.InfoCard}><span>⏱️</span> {recipe.preparationTime || 'N/A'} min</div>
            <div className={styles.InfoCard}><span>🔥</span> {recipe.calories || 'N/A'} cal</div>
            <div className={styles.InfoCard}><span>🍽️</span> {recipe.servings || 'N/A'} servings</div>

            {recipe.description &&
              <div className={styles.Section} style={{ marginBottom: 0, height: (imageGalleryDim.height) }} ref={descriptionRef}>
                <h2>Description</h2>
                <p className={styles.description}>{recipe.description}</p>
              </div>
            }
          </div>
          <div className={styles.RightColumn}>
            <div
              className={styles.ImageGallery}
              ref={imageGalleryRef}
            >
              {recipe.image && (
                <React.Fragment>
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
                  {
                    edit && (
                      <button
                        className={classNames(styles.PrimaryButton, styles.RemoveButton)}
                        onClick={async () => {
                          if (!recipe.image) return;
                          setRemoving(true);
                          try {
                            await deleteRecipeImageByUrl(recipe.image);
                            // NOTE: shared-types currently declares image as string; cast to any here.
                            const updated: Recipe = { ...recipe, image: (null as unknown) as any } as Recipe;
                            if (onSave) onSave(updated);
                          } catch (err) {
                            console.error('Remove failed', err);
                          } finally {
                            setRemoving(false);
                          }
                        }}
                        disabled={removing}
                      >
                        {removing ? 'Removing...' : 'Remove'}
                      </button>
                    )
                  }
                </React.Fragment>
              )}


              {
                edit && !recipe.image && (
                  <>
                    <button
                      className={classNames(styles.PrimaryButton, styles.AddButton)}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? 'Uploading...' : 'Add'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files && e.target.files[0];
                        if (!file) return;
                        try {
                          setUploading(true);
                          const url = await uploadRecipeImage(file, recipe);
                          const updated: Recipe = {
                            ...recipe,
                            image: url,
                            otherImages: [...(recipe.otherImages || [])],
                          };
                          if (onSave) onSave(updated);
                        } catch (err) {
                          console.error('Upload failed', err);
                        } finally {
                          setUploading(false);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }
                      }}
                    />
                  </>
                )
              }
            </div>
          </div>
        </div>

        <div className={classNames(styles.Ingredients)} style={{ marginBottom: 0 }}>
          <h2>Ingredients</h2>
          <ul className={styles.IngredientList}>
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} className={styles.IngredientItem}>
                <span className={styles.IngredientName}>{ing.name}</span>
                <div>
                  <span className={styles.IngredientQty}>{ing.quantity} {ing.unit || ''}</span>
                  {
                    edit &&
                    <i onClick={() => handleRemoveIngredient(idx)} className={styles.Clickable}><RiDeleteBin7Fill /></i>
                  }
                </div>
              </li>
            ))}
            {edit &&
              <li key={"add-ingredient"} onClick={() => setShowIngredientModal(true)} className={classNames(styles.IngredientItem, styles.NewIngredient)}>
                <span className={styles.IngredientName}>Add ingredient</span>
              </li>
            }
          </ul>
        </div>

        {/* Ingredient modal */}
        {showIngredientModal && (
          <div className={styles.ModalBackdrop} onClick={() => setShowIngredientModal(false)}>
            <div className={styles.Modal} onClick={(e) => e.stopPropagation()}>
              <h3>Add ingredient</h3>
              <div className={styles.Field}>
                <label>Name</label>
                <input value={newIngredientInput.name} onChange={(e) => setNewIngredientInput(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className={styles.Field}>
                <label>Quantity</label>
                <input type='number' min={0} value={newIngredientInput.qty} onChange={(e) => setNewIngredientInput(prev => ({ ...prev, qty: e.target.value }))} />
              </div>
              <div className={styles.Field}>
                <label>Unit</label>
                <input value={newIngredientInput.unit} onChange={(e) => setNewIngredientInput(prev => ({ ...prev, unit: e.target.value }))} />
              </div>
              <div className={styles.ModalActions}>
                <button className={styles.SecondaryButton} onClick={() => setShowIngredientModal(false)}>Cancel</button>
                <button className={styles.PrimaryButton} onClick={async () => {
                  // validate
                  if (!newIngredientInput.name.trim()) return;
                  const newIngredient = { name: newIngredientInput.name.trim(), quantity: newIngredientInput.qty.trim() || '?', unit: newIngredientInput.unit.trim() || '' } as any;
                  const updatedRecipe: Recipe = { ...recipe, ingredients: [...(recipe.ingredients || []), newIngredient] } as Recipe;
                  // Clear modal fields
                  setNewIngredientInput({ name: '', qty: '', unit: '' });
                  setShowIngredientModal(false);
                  // prefer onChange for optimistic editing, call onSave if available
                  try {
                    if (onChange) onChange(updatedRecipe);
                    // if (onSave) await onSave(updatedRecipe);
                  } catch (err) {
                    console.error('Failed to save ingredient', err);
                  }
                }}>Add</button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.TabsContainer}>
          {
            !isMobile && <Fragment>
              <div className={styles.TabsRow}>
                <button
                  className={activeTab === 'instructions' ? styles.ActiveTab : styles.Tab}
                  onClick={() => setActiveTab('instructions')}
                >Instructions</button>
                {
                  !edit &&
                  <button
                    className={activeTab === 'restaurants' ? styles.ActiveTab : styles.Tab}
                    onClick={() => setActiveTab('restaurants')}
                  >Nearby Restaurants</button>
                }
              </div>
            </Fragment>
          }
          <div className={styles.TabContent}>
            {
              activeTab === 'instructions' && (
                <ul className={styles.InstructionsList}>
                  {recipe.instructions.map((step, idx) => (
                    <li key={idx} className={styles.InstructionItem}>
                      <span className={styles.StepNum}></span> {step.instruction} {step.duration ? <span className={styles.StepDuration}>({step.duration} min)</span> : null}
                    </li>
                  ))}
                </ul>
              )
            }
            {
              !edit && activeTab === 'restaurants' && (
                <div className={styles.section} style={{ marginTop: 0 }}>
                  <h2>Nearby Restaurants</h2>
                  <div className={styles.placeholder}>🍴 Find restaurants serving this dish near you soon!</div>
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div >
  );
}

export default RecipeDetail;
