import styles from "./Styles.module.scss";
import RecipeList from '@/components/Recipe/RecipeList';
import Search from "@/components/Search/Search";
import { useAllRecipesQuery } from '@/hooks/useRecipeQuery';
import { useRecipes } from "@/hooks/useRecipes";

function AllRecipes() {
  const { data, isLoading } = useAllRecipesQuery();
  const { searchedRecipes } = useRecipes();

  const items = searchedRecipes?.length > 0 ? searchedRecipes : data;

  console.log("Searched items: ", searchedRecipes, data);

  return (
    <div className={styles.AllRecipes}>
      <div className={styles.Heading}>
        <h1 className={styles.Title}>Search for Recipes</h1>

        <Search className={styles.Search} />
      </div>
      <RecipeList className={styles.RecipeList} recipeList={items} />
    </div>
  );
}

export default AllRecipes;
