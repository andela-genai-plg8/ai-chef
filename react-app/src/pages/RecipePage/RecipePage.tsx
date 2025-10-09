import React, { useMemo, useRef, useState } from 'react';
import styles from "./Styles.module.scss";
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import classNames from 'classnames';
import { FaSave } from 'react-icons/fa';
import { FaEdit } from 'react-icons/fa';
import { AiOutlineLoading } from "react-icons/ai";
import { GrView } from "react-icons/gr";
import { MdPublish } from "react-icons/md";
import RecipeDetail from '@/components/Recipe/RecipeDetail';
import { useUpdateRecipe, useDeleteRecipe, usePublishRecipe, useRecipeBySlugQuery } from '@/hooks/useRecipeQuery';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Recipe } from 'shared-types';
import Header from '@/components/Header/Header';
import { useAuth } from '@/hooks/useAuth';
import { RiDeleteBin7Fill } from 'react-icons/ri';

type RecipePageProps = {
  edit?: boolean;
  personal?: boolean;
};

const RecipePage: React.FC<RecipePageProps> = ({ edit = false, personal = false }) => {
  const params = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const { data: recipeClean, isLoading } = useRecipeBySlugQuery(params.slug || "");
  const { mutate: updateMutation, isPending: saving } = useUpdateRecipe();
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | undefined | null>(recipeClean);
  const now = useMemo(() => Date.now(), []);
  if (!recipe && recipeClean || (recipeClean?.updatedAt || now) > (recipe?.updatedAt || now)) setRecipe(recipeClean);
  const { mutate: publishRecipe, isPending: publishing } = usePublishRecipe();
  const { mutate: deleteRecipe, isPending: deleting } = useDeleteRecipe();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // capture current firebase user uid if available
  React.useEffect(() => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) setCurrentUid(user.uid);
      // also listen for changes
      const unsub = onAuthStateChanged(auth, (u) => {
        setCurrentUid(u ? u.uid : null);
      });
      return () => unsub();
    } catch (err) {
      // firebase may not be initialized in some test environments
      console.warn('getAuth failed', err);
      return;
    }
  }, []);
  const pageRef = useRef<HTMLDivElement | null>(null);


  // capture the distance of pageRef from the edge of the viewport and update when it changes
  const [left, setLeft] = useState<number>(20);

  React.useEffect(() => {
    const el = pageRef.current;
    const update = () => {
      const rect = pageRef.current?.getBoundingClientRect();
      if (rect) setLeft(rect.left + 20);
    };

    // initial set
    update();

    // observe size/position changes
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => update());
      if (el) ro.observe(el);
    } catch (e) {
      // ResizeObserver may not be available in all environments; fall back to window resize
    }

    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('resize', update);
      if (ro && el) ro.unobserve(el);
      ro = null;
    };
  }, [pageRef.current]);


  const handleSaveRecipe = async (updatedRecipe: any) => {
    console.log('Saving recipe', updatedRecipe);
    // call mutation to persist the uploaded image/change
    const { ___id: id, ...recipe } = updatedRecipe as any;
    if (!id) {
      console.warn('Cannot update recipe without id');
      return;
    }

    await updateMutation({ id, recipe });
  }

  const handleChangeRecipe = async (updatedRecipe: any) => {
    // call mutation to persist the uploaded image/change
    const { ___id: id } = updatedRecipe as any;
    if (!id) {
      console.warn('Cannot update recipe without id');
      return;
    }

    updatedRecipe.updatedAt = Date.now();
    setRecipe(updatedRecipe);
  }

  if (!recipe && isLoading) {
    return <div className={styles.RecipePage}>Please wait...</div>;
  }

  if (!recipe) {
    return <div className={styles.RecipePage}>Recipe not found.</div>;
  }

  return (
    <div className={styles.RecipePage} ref={pageRef}>
      <Header personal={personal} title={recipe.name} >
        {personal && recipe.published && <span className={classNames(styles.badge, styles["text-success"], styles.border)}>Published</span>}
        {personal && !recipe.published && <span className={classNames(styles.badge, styles["text-danger"], styles.border)}>Unpublished</span>}
      </Header>

      <RecipeDetail
        recipe={recipe}
        edit={edit}
        onSave={handleSaveRecipe}
        onChange={handleChangeRecipe}
      />
      {(currentUid && recipe?.createdBy && currentUid === recipe.createdBy) || (user?.roles?.includes('admin')) ? (
        <React.Fragment>
          {
            ((!recipe.published && !recipe.queued) || (recipe?.updatedAt || now) > (recipe?.publishedAt || now)) &&
            <button
              className={styles.FloatingEditButton}
              disabled={publishing || saving}
              aria-label="Publish recipe"
              title="Publish recipe"
              onClick={async () => {
                await publishRecipe(recipe);
              }}
              style={{
                bottom: 145,
                left
              }}
            >
              {publishing ? <i className={styles.Rotating}> <AiOutlineLoading /> </i> : <MdPublish />}
            </button>
          }
          <button
            className={styles.FloatingEditButton}
            disabled={publishing || saving || deleting}
            aria-label="Delete recipe"
            title="Delete recipe"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              bottom: 85,
              left
            }}
          >
            <RiDeleteBin7Fill />
          </button>

          {/* Delete confirmation modal */}
          {showDeleteConfirm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }} onClick={() => setShowDeleteConfirm(false)}>
              <div style={{ background: 'white', padding: '1rem 1.25rem', borderRadius: 8, minWidth: 280 }} onClick={(e) => e.stopPropagation()}>
                <h5>Confirm delete</h5>
                <p>Are you sure you want to permanently delete this recipe?</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                  <button className="btn btn-danger" onClick={async () => {
                    try {
                      await deleteRecipe(recipe);
                      setShowDeleteConfirm(false);
                      if(personal) navigate('/my/recipes');
                      else navigate('/recipes');
                    } catch (err) {
                      console.error('Delete failed', err);
                      setShowDeleteConfirm(false);
                    }
                  }}>
                    {deleting ? <i className={styles.Rotating}> <AiOutlineLoading /> </i> : <RiDeleteBin7Fill />}
                  </button>
                </div>
              </div>
            </div>
          )}
          <button
            className={styles.FloatingEditButton}
            disabled={publishing || saving}
            aria-label="Edit recipe"
            title="Edit recipe"
            onClick={() => {
              if (edit) {
                // navigate back to view mode
                navigate(`/recipe/${recipe.slug}`);
              } else {
                navigate(`./edit`);
              }
            }}
            style={{
              left
            }}
          >
            {edit ? <GrView /> : <FaEdit />}
          </button>
          {
            recipe.updatedAt && recipeClean?.updatedAt && (recipe.updatedAt > recipeClean.updatedAt) &&
            <button
              className={classNames(styles.FloatingSaveButton)}
              aria-label="Save recipe"
              title="Save recipe"
              onClick={() => {
                handleSaveRecipe(recipe);
              }}
              style={{
                left: left + 60
              }}
            >
              {saving ? <i className={styles.Rotating}><AiOutlineLoading /> </i> : <FaSave />}
            </button>
          }
        </React.Fragment>
      ) : null}

    </div >
  );
}

export default RecipePage;
