import styles from "./Styles.module.scss";
import RecipeList from '@/components/Recipe/RecipeList';
import Search from "@/components/Search/Search";
import { useAllRecipesQuery } from '@/hooks/useRecipeQuery';
import { useRecipes } from "@/hooks/useRecipes";

function RecipeResults() {
  const { searchedRecipes } = useRecipes();

  return (
    <div className={styles.RecipeResults}>
      <div className={styles.Heading}>
        <h1 className={styles.Title}>Search for Recipes</h1>

        <Search className={styles.Search} />
      </div>
      <RecipeList className={styles.RecipeList} recipeList={searchedRecipes} />
    </div>
  );
}

export default RecipeResults;
