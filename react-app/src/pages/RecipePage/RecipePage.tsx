import React, { useMemo, useRef, useState, Fragment } from 'react';
import styles from "./Styles.module.scss";
import { useRecipeBySlugQuery } from '@/hooks/useRecipeQuery';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import classNames from 'classnames';
import { FaBackward, FaSave } from 'react-icons/fa';
import { FaEdit } from 'react-icons/fa';
import { AiOutlineLoading } from "react-icons/ai";
import { GrView } from "react-icons/gr";
import { useMediaQuery } from 'react-responsive';
import RecipeDetail from '@/components/Recipe/RecipeDetail';
import { useUpdateRecipeMutation } from '@/hooks/useRecipeQuery';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Recipe } from 'shared-types';

type RecipePageProps = {
  edit?: boolean;
};

const RecipePage: React.FC<RecipePageProps> = ({ edit = false }) => {
  const params = useParams();
  const location = useLocation();
  const { data: recipeClean, isLoading } = useRecipeBySlugQuery(params.slug || "");
  const { mutate: updateMutation, isPending: saving } = useUpdateRecipeMutation();
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | undefined | null>(recipeClean);
  const now = useMemo(() => Date.now(), []);
  if (!recipe && recipeClean || (recipeClean?.updatedAt || now) > (recipe?.updatedAt || now)) setRecipe(recipeClean);

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

  const imageGalleryRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const [isSticky, setIsSticky] = useState(false);


  const isMobile = useMediaQuery({ maxWidth: 390 });
  const imageGalleryDim = useMemo(() => {
    if (isMobile && pageRef.current) {
      return { height: 300, width: pageRef.current.clientWidth - 50 }; // Fallback to 400 if ref is not available
    }

    return imageGalleryRef.current?.getBoundingClientRect() || { height: 400, width: 400 }; // Fallback to 400 if ref is not available
  }, [imageGalleryRef, pageRef]);

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
      <div ref={titleRef} className={classNames(styles.Title)}>
        <button className={styles.BackButton} onClick={() => window.history.back()} >
          <FaBackward />
        </button>
        <h1>{recipe.name}</h1>
      </div>
      <RecipeDetail recipe={recipe} edit={edit} onSave={handleSaveRecipe}

        onChange={handleChangeRecipe}
      />
      {(currentUid && recipe?.createdBy && currentUid === recipe.createdBy) || true ? (
        <React.Fragment>
          <button
            className={styles.FloatingEditButton}
            aria-label="Edit recipe"
            title="Edit recipe"
            onClick={() => {
              console.log('location', location);
              if (edit) {
                // navigate back to view mode
                navigate(`/recipe/${recipe.slug}`);
              } else {
                navigate(`./edit`);
              }
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
