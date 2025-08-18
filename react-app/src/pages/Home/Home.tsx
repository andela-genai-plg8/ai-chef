
import { useEffect, useState } from 'react';
import styles from "./Styles.module.scss";
import RecipeList from '@/components/Recipe/RecipeList';
import { useRecipes } from '@/hooks/useRecipes';
import Search from '@/components/Search/Search';

function Home() {
  const { getAllRecipes } = useRecipes();
  useEffect(() => {
    getAllRecipes();
  }, [getAllRecipes]);

  return (
    <div className={styles.Home}>
      <Search className={styles.Search} />
      <RecipeList />
    </div>
  );
}

export default Home;
