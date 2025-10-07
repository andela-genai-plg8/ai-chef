import React, { useMemo, useRef, useState, Fragment } from 'react';
import styles from "./Styles.module.scss";
import { useRecipeBySlugQuery } from '@/hooks/useRecipeQuery';
import { useNavigate, useParams } from 'react-router-dom';
import ImageGallery from 'react-image-gallery';
// import "react-image-gallery/styles/css/image-gallery.css";
import classNames from 'classnames';
import { FaBackward } from 'react-icons/fa';
import { FaEdit } from 'react-icons/fa';
import { GrView } from "react-icons/gr";
import { useMediaQuery } from 'react-responsive';
import RecipeDetail from '@/components/Recipe/RecipeDetail';
import { useUpdateRecipeMutation } from '@/hooks/useRecipeQuery';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

function RecipePage() {
  const location = useParams();
  const { data: recipe, isLoading } = useRecipeBySlugQuery(location.slug || "");
  const [currentUid, setCurrentUid] = useState<string | null>(null);

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
  const [activeTab, setActiveTab] = useState<'instructions' | 'videos' | 'restaurants'>('instructions');
  const [mode, setMode] = useState<boolean>(false);

  const imageGalleryRef = useRef<HTMLDivElement | null>(null);
  const descriptionRef = useRef<HTMLDivElement | null>(null);
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

  const updateMutation = useUpdateRecipeMutation();

  // if (isLoading) {
  //   return <div className={styles.RecipePage}>Loading...</div>;
  // }

  // if (!recipe && !isLoading) {
  //   // return <div className={styles.RecipePage}>Recipe not found.</div>;
  //   navigate('/not-found');
  //   return <React.Fragment></React.Fragment>;
  // }

  if (!recipe && isLoading) {
    return <div className={styles.RecipePage}>Please wait...</div>;
  }

  if (!recipe) {
    return <div className={styles.RecipePage}>Recipe not found.</div>;
  }


  return (
    <div className={styles.RecipePage} ref={pageRef}>
      <div ref={titleRef} className={classNames(styles.Title, { [styles.TitleSticky]: isSticky })}>
        <button className={styles.BackButton} onClick={() => window.history.back()} >
          <FaBackward />
        </button>
        <h1>{recipe.name}</h1>
      </div>
      <RecipeDetail recipe={recipe} edit={mode} onSave={(updatedRecipe: any) => {
        // call mutation to persist the uploaded image/change
        const { ___id: id, ...recipe } = updatedRecipe as any;
        if (!id) {
          console.warn('Cannot update recipe without id');
          return;
        }
        updateMutation.mutate({ id, recipe });
      }} />
      {(currentUid && recipe?.createdBy && currentUid === recipe.createdBy) || true ? (
        <button
          className={styles.FloatingEditButton}
          aria-label="Edit recipe"
          title="Edit recipe"
          onClick={() => setMode(!mode)}
        >
          {mode ? <GrView /> : <FaEdit />}
        </button>
      ) : null}

    </div >
  );
}

export default RecipePage;
