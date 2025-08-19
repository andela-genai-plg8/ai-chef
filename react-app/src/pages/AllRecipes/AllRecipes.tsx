import styles from "./Styles.module.scss";
import RecipeList from '@/components/Recipe/RecipeList';
import Search from "@/components/Search/Search";
import { useAllRecipesQuery } from '@/hooks/useRecipeQuery';

function AllRecipes() {
  const { data, isLoading } = useAllRecipesQuery();

  return (
    <div className={styles.AllRecipes}>
      <div className={styles.Heading}>
        <h1 className={styles.Title}>Search for Recipes</h1>

        <Search className={styles.Search} />
      </div>
      <RecipeList className={styles.RecipeList} recipeList={data} />
    </div>
  );
}

export default AllRecipes;
