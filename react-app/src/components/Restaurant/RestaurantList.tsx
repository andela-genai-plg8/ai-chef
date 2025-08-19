import React from 'react';
import styles from "./Styles.module.scss";
import RestaurantCard from "./RestaurantCard";
import { usePromotedRestaurants } from '@/hooks/useRestaurants';
import { useNavigate } from 'react-router-dom';
import { Restaurant } from 'shared-types';
import classNames from 'classnames';

export type RestaurantListProps = {
  className?: string; // Optional className for styling
  restaurantList?: Restaurant[]; // Optional prop for passing a specific Restaurant list
}

const RestaurantList: React.FC<RestaurantListProps> = ({ restaurantList, className }) => {
  const { data: promotedRestaurants, isLoading: isPromotedLoading } = usePromotedRestaurants(restaurantList === undefined);
  const navigate = useNavigate();

  let listToRender: Restaurant[] = [];
  if (restaurantList && Array.isArray(restaurantList) && restaurantList.length > 0) {
    listToRender = restaurantList;
  } else if (promotedRestaurants && promotedRestaurants.length > 0) {
    listToRender = promotedRestaurants;
  }

  return (
    <div className={classNames(styles.RestaurantList, className)}>
      {isPromotedLoading && !restaurantList ? (
        <div>Loading promoted Restaurants...</div>
      ) : (
        listToRender.map((Restaurant, idx) => (
          <div
            key={idx}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/Restaurant/${Restaurant.slug}`)}
          >
            <RestaurantCard restaurant={Restaurant} />
          </div>
        ))
      )}
    </div>
  );
}

export default RestaurantList
