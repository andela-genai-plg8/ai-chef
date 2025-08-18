
import styles from "./Styles.module.scss";
import RecipeList from '@/components/Recipe/RecipeList';
import Search from "@/components/Search/Search";
import { useAllRecipesQuery } from '@/hooks/useRecipeQuery';

function AllRecipes() {
  const { data, isLoading } = useAllRecipesQuery();

  console.log(data, isLoading)

  return (
    <div className={styles.AllRecipes}>
      <Search className={styles.Search} />
      <RecipeList className={styles.RecipeList} recipeList={data} />
    </div>
  );
}

export default AllRecipes;
