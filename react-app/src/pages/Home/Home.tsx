import styles from "./Styles.module.scss";
import Search from '@/components/Search/Search';
import RobotChef from '@/assets/Robot Chef.gif';
import RecipeList from '@/components/Recipe/RecipeList';
import { usePromotedRecipesQuery } from '@/hooks/useRecipeQuery';
import { Link } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';

function Home() {
  const { data: featuredRecipes, isLoading } = usePromotedRecipesQuery();
  const isMobile = useMediaQuery({ maxWidth: 390 });

  return (
    <div className={styles.Home} style={{ backgroundImage: `url(${RobotChef})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className={styles.Background}></div>
      {/* Welcome Message */}
      <div className={styles.WelcomeMessage}>
        <h1>Welcome to Chef Andel!</h1>
        <p>Your ultimate destination for discovering mouthwatering recipes and culinary inspiration. Let's cook something amazing today!</p>
      </div>

      {/* Featured Recipes Section */}
      <div className={styles.FeaturedRecipes}>
        <h2>Featured Recipes</h2>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <>
            <RecipeList recipeList={featuredRecipes} collapseOnMobile />
            <Link to="/recipes" className={styles.MoreLink}>More</Link>
          </>
        )}
      </div>

      {/* Featured Recipes Section */}
      <div className={styles.FeaturedRecipes}>
        <h2>Nearby Restaurants</h2>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <RecipeList recipeList={featuredRecipes} />
        )}
      </div>
    </div>
  );
}

export default Home;
