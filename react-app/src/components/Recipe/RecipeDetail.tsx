import React, { useMemo, useRef, useState, Fragment } from 'react';
import styles from "./Styles.module.scss";
import ImageGallery from 'react-image-gallery';
import "react-image-gallery/styles/css/image-gallery.css";
import classNames from 'classnames';
import { useMediaQuery } from 'react-responsive';
import { Recipe } from 'shared-types';
// import e from 'express';
import { usePromotedRecipesQuery, useUploadRecipeImage } from '../../hooks/useRecipeQuery';
import { RiDeleteBin7Fill } from "react-icons/ri";
import { AiOutlineLoading } from 'react-icons/ai';
import { FaPlus, FaSave, FaTrash } from 'react-icons/fa';
import { useAuth } from '@/hooks/useAuth';
import { deleteRecipeImageByUrl } from '@/api/recipes';

export type RecipeDetailProps = {
  recipe: Recipe;
  edit: boolean;
  className?: string;
  onSave?: (updatedRecipe: Recipe) => void;
  onPublish?: (updatedRecipe: Recipe) => void;
  onChange?: (updatedRecipe: Recipe) => void;
}

const AddImage: React.FC<Omit<RecipeDetailProps, 'edit'>> = ({ onSave, recipe }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return <>
    <button
      className={classNames(styles.PrimaryButton, styles.AddButton)}
      onClick={() => fileInputRef.current?.click()}
      disabled={uploading}
    >
      {uploading ? <AiOutlineLoading /> : <FaPlus />}
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
          const url = await useUploadRecipeImage(file, recipe);
          const updated: Recipe = {
            ...recipe,
            image: recipe.image ? recipe.image : url,
            otherImages: recipe.image
              ? [...(recipe.otherImages || []), url]
              : [...(recipe.otherImages || [])],
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
}

const RemoveImage: React.FC<Omit<RecipeDetailProps, 'edit'> & { index: number }> = ({ onSave, recipe, index }) => {
  const [removing, setRemoving] = useState(false);

  return <>
    <button
      className={classNames(styles.PrimaryButton, styles.RemoveButton)}
      onClick={async () => {
        if (!recipe.image) return;
        setRemoving(true);
        try {
          const images = [recipe.image, ...(recipe.otherImages || [])];
          if (index < 0 || index >= images.length) {
            console.warn('Invalid image index to remove', index, images);
            setRemoving(false);
            return;
          }

          const deleted = await deleteRecipeImageByUrl(images[index]);
          if (deleted) {
            const [image, ...otherImages] = images.filter((_, i) => i !== index);
            const updated: Recipe = { ...recipe, image, otherImages } as Recipe;
            if (onSave) onSave(updated);
          } else {
            console.warn('Image deletion reported failure for', images[index]);
          }
        } catch (err) {
          console.error('Remove failed', err);
        } finally {
          setRemoving(false);
        }
      }}
      disabled={removing}
    >
      {removing ? <AiOutlineLoading /> : <FaTrash />}
    </button>
  </>
}

const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, className, edit, onSave, onPublish, onChange }) => {
  const [activeTab, setActiveTab] = useState<'instructions' | 'videos' | 'restaurants'>('instructions');

  const imageGalleryContainerRef = useRef<HTMLDivElement | null>(null);
  const imageGalleryRef = useRef<ImageGallery | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [newIngredientInput, setNewIngredientInput] = useState({ index: -1, name: '', qty: '', unit: '' });
  const isMobile = useMediaQuery({ maxWidth: 390 });
  const imageGalleryDim = useMemo(() => {
    if (isMobile && pageRef.current) {
      return { height: 300, width: pageRef.current.clientWidth - 50 }; // Fallback to 400 if ref is not available
    }

    return imageGalleryContainerRef.current?.getBoundingClientRect() || { height: 400, width: 400 }; // Fallback to 400 if ref is not available
  }, [imageGalleryContainerRef, pageRef]);

  const user = useAuth();

  function handleRemoveIngredient(e: React.MouseEvent, idx: number): void {
    e.stopPropagation();
    if (!edit) return;
    const updatedIngredients = recipe.ingredients.filter((_, i) => i !== idx);
    const updatedRecipe: Recipe = { ...recipe, ingredients: updatedIngredients };
    if (onChange) onChange(updatedRecipe);
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
            <div className={styles.InfoCard}><span>⏱️</span> {!edit ? (recipe.preparationTime || 'N/A') : <input type="text" value={recipe.preparationTime || ''} onChange={(e) => {
              const updated: Recipe = { ...recipe, preparationTime: e.target.value };
              if (onChange) onChange(updated);
            }} />} min</div>
            <div className={styles.InfoCard}><span>🔥</span> {!edit ? (recipe.calories || 'N/A') : <input type="text" value={recipe.calories || ''} onChange={(e) => {
              const updated: Recipe = { ...recipe, calories: e.target.value };
              if (onChange) onChange(updated);
            }} />} cal</div>
            <div className={styles.InfoCard}><span>🍽️</span> {!edit ? (recipe.servings || 'N/A') : <input type="text" value={recipe.servings || ''} onChange={(e) => {
              const updated: Recipe = { ...recipe, servings: e.target.value };
              if (onChange) onChange(updated);
            }} />} servings</div>
          </div>
          <div className={styles.RightColumn}>
            <div
              className={styles.ImageGallery}
              ref={imageGalleryContainerRef}
            >
              {(
                <React.Fragment>
                  <ImageGallery
                    items={([...(recipe.image ? [recipe.image] : []), ...(recipe.otherImages || [])]).map((img, idx) => ({
                      original: img,
                      thumbnail: img,
                      description: `${recipe.name} ${idx + 1}`,
                      originalWidth: imageGalleryDim.width,
                    }))}
                    showThumbnails={false}
                    showFullscreenButton={false}
                    ref={imageGalleryRef}
                  />
                  {
                    edit && (<div className={styles.ImageActions}>
                      <AddImage recipe={recipe} onSave={onSave} />
                      <RemoveImage recipe={recipe} onSave={onSave} index={imageGalleryRef?.current?.getCurrentIndex() || 0} />
                    </div>
                    )
                  }
                </React.Fragment>
              )}
            </div>
          </div>
        </div>

        {recipe.description && !edit && (
          <div className={styles.Section}>
            <h2>Description</h2>
            <p className={styles.Description}>{recipe.description}</p>
          </div>)
        }

        {edit && (
          <div className={styles.Section}>
            <h2>Description</h2>
            <textarea
              className={styles.Description}
              placeholder="Add description..."
              value={recipe.description || ''}
              onChange={(e) => {
                if (!onChange) return;
                const updated: Recipe = { ...recipe, description: e.target.value };
                onChange(updated);
              }}></textarea>
          </div>)}


        <div className={classNames(styles.Ingredients)} style={{ marginBottom: 0 }}>
          <h2>Ingredients</h2>
          <ul className={styles.IngredientList}>
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} className={styles.IngredientItem} onClick={() => {
                if (!edit) return;

                setNewIngredientInput({ index: idx, name: ing.name, qty: String(ing.quantity) || '', unit: ing.unit || '' });
                setShowIngredientModal(true);
              }}>
                <span className={styles.IngredientName}>{ing.name}</span>
                <div>
                  <span className={styles.IngredientQty}>{ing.quantity} {ing.unit || ''}</span>
                  {
                    edit &&
                    <i onClick={(e) => handleRemoveIngredient(e, idx)} className={styles.Clickable}><RiDeleteBin7Fill /></i>
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
              {
                newIngredientInput.index < 0 ? <h3>Add ingredient</h3> : <h3>Edit ingredient</h3>
              }
              <div className={styles.Field}>
                <label>Name</label>
                <input value={newIngredientInput.name} onChange={(e) => setNewIngredientInput(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className={styles.Field}>
                <label>Quantity</label>
                <input type='text' min={0} value={newIngredientInput.qty} onChange={(e) => setNewIngredientInput(prev => ({ ...prev, qty: e.target.value }))} />
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

                  const index = newIngredientInput.index;
                  const newIngredient = { name: newIngredientInput.name.trim(), quantity: newIngredientInput.qty.trim() || '?', unit: newIngredientInput.unit.trim() || '' } as any;
                  const ingredients = [...(recipe.ingredients || [])];
                  if (index >= 0 && index < ingredients.length) {
                    // edit existing
                    ingredients[index] = newIngredient;
                  } else {
                    // add new
                    ingredients.push(newIngredient);
                  }

                  const updatedRecipe: Recipe = { ...recipe, ingredients } as Recipe;
                  // Clear modal fields
                  setNewIngredientInput({ ...newIngredientInput, name: '', qty: '', unit: '' });
                  setShowIngredientModal(false);
                  // prefer onChange for optimistic editing, call onSave if available
                  try {
                    if (onChange) onChange(updatedRecipe);
                    // if (onSave) await onSave(updatedRecipe);
                  } catch (err) {
                    console.error('Failed to save ingredient', err);
                  }
                }}><FaSave /></button>
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
                      {
                        edit && <React.Fragment>
                          <textarea
                            className={styles.Description}
                            placeholder="Add description..."
                            value={step.instruction || ''}
                            onChange={(e) => {
                              if (!onChange) return;
                              const updated: Recipe = { ...recipe, instructions: recipe.instructions.map((s, i) => i === idx ? { ...s, instruction: e.target.value } : s) };
                              onChange(updated);
                            }}></textarea>
                          <input
                            style={{ marginTop: 8, width: 100 }}
                            placeholder="duration (in minutes)"
                            value={step.duration || ''}
                            onChange={(e) => {
                              if (!onChange) return;
                              const updated: Recipe = { ...recipe, instructions: recipe.instructions.map((s, i) => i === idx ? { ...s, duration: e.target.value } : s) };
                              onChange(updated);
                            }} />

                          <i onClick={() => {
                            if (!onChange) return;
                            const updated: Recipe = { ...recipe, instructions: recipe.instructions.filter((s, i) => i !== idx) };
                            onChange(updated);
                          }} className={styles.Clickable}><RiDeleteBin7Fill /></i>

                        </React.Fragment>
                      }
                      {!edit && (
                        <React.Fragment>
                          <span className={styles.StepNum}></span> {step.instruction} {step.duration ? <span className={styles.StepDuration}>({step.duration} min)</span> : null}
                        </React.Fragment>
                      )}
                    </li>
                  ))}
                  {edit &&
                    <li key={"add-step"} onClick={() => {
                      if (!onChange) return;
                      const updated: Recipe = { ...recipe, instructions: [...recipe.instructions, { step: String(recipe.instructions.length + 1), instruction: '', duration: '' }] };
                      onChange(updated);
                    }} className={classNames(styles.IngredientItem, styles.NewIngredient)}>
                      <span className={styles.PrimaryButton}>Add step</span>
                    </li>
                  }
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
