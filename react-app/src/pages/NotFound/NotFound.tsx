import styles from "./Styles.module.scss";
import Search from '@/components/Search/Search';
import RobotChef from '@/assets/Robot Chef.gif';
import RecipeList from '@/components/Recipe/RecipeList';
import { usePromotedRecipesQuery } from '@/hooks/useRecipeQuery';
import { Link } from 'react-router-dom';

function NotFound() {
  const { data: featuredRecipes, isLoading } = usePromotedRecipesQuery();

  return (
    <div className={styles.NotFound} style={{ backgroundImage: `url(${RobotChef})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className={styles.Background}></div>

      {/* Featured Recipes Section */}
      <div className={styles.FeaturedRecipes}>

        <div className={styles.Title}>
          <h1>Oops!</h1>
          <p>We couldn't find the page you were looking for.</p>
        </div>
        
        <h2>But we think these lovely recipes might interest you:</h2>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <>
            <RecipeList recipeList={featuredRecipes} />
            <Link to="/recipes" className={styles.MoreLink}>More</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default NotFound;
