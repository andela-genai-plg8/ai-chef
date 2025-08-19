import { useParams } from 'react-router-dom';
import { useSingleRestaurant} from '@hooks/useRestaurants';
import axios from 'axios';

const RestaurantPage = () => {
  const { id } = useParams();
  const { data: restaurant, isLoading, error } = useSingleRestaurant(id);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading restaurant details</div>;

  return (
    <div>
      <h1>{restaurant.name}</h1>
      <img src={restaurant.image} alt={restaurant.name} />
      <p>{restaurant.address}</p>
      <p>{restaurant.phone}</p>
      <a href={restaurant.website} target="_blank" rel="noopener noreferrer">
        Visit Website
      </a>
      <a href={restaurant.googleMapLink} target="_blank" rel="noopener noreferrer">
        View on Google Maps
      </a>
      {/* <h2>Available Recipes</h2>
      <ul>
        {restaurant.recipes.map((recipe) => (
          <li key={recipe.id}>{recipe.name}</li>
        ))}
      </ul> */}
    </div>
  );
};

export default RestaurantPage;
