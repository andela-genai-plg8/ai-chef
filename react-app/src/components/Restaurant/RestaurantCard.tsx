import React from 'react'
import styles from "./Styles.module.scss"
import { Restaurant } from 'shared-types'; // Assuming Restaurant type is defined in sharedtypes
import classNames from 'classnames';

export type RestaurantCardProps = {
  restaurant: Restaurant;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  return (
    <div
      className={classNames(styles["RestaurantCard"], styles["shadow"], styles["rounded"], styles["border-1"], styles["shadow-lg"])}
      style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        overflow: 'hidden',
        padding: '0rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: 400,
        fontSize: '1.1rem',
        color: '#222',
      }}
    >
      <div style={{
        width: '100%',
        height: '200px',
        backgroundImage: `url(${restaurant.image})`,
        backgroundSize: '120%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }} />
      <h1>{restaurant.name}</h1>
      <img src={restaurant.image} alt={restaurant.name} />
      <p>{restaurant.address}</p>
      <p>{restaurant.phone}</p>
      <a href={restaurant.website} target="_blank" rel="noopener noreferrer">
        Visit Website
      </a>
    </div>
  );
}

export default RestaurantCard
