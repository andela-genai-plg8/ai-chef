import axios from "axios";
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { Restaurant } from "shared-types";

import { query, where, doc, getDoc } from "firebase/firestore";

interface FindRestaurantParams {
  recipes: string[];
}

export async function findRestaurant({ recipes }: FindRestaurantParams): Promise<Restaurant[]> {
  const response = await axios.post("/api/findRestaurant", {
    recipes,
  });

  if (!response.data) {
    throw new Error("No restaurants found");
  }

  return response.data;
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  const db = getFirestore();
  const restaurantsCollection = collection(db, "restaurants");
  const snapshot = await getDocs(restaurantsCollection);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return { slug: data.slug, ...data } as Restaurant;
  });
}

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const db = getFirestore();
  const restaurantsCollection = collection(db, "restaurants");
  const slugQuery = query(restaurantsCollection, where("slug", "==", slug));
  const snapshot = await getDocs(slugQuery);
  if (snapshot.empty) {
    return null;
  }
  const docData = snapshot.docs[0].data();
  return { slug, ...docData } as Restaurant;
}

export async function getPromotedRestaurants(isPromoted: boolean = true): Promise<Restaurant[]> {
  if (!isPromoted) return [];

  const db = getFirestore();
  const restaurantsCollection = collection(db, "restaurants");
  const promotedQuery = query(restaurantsCollection, where("promoted", "==", true));
  const snapshot = await getDocs(promotedQuery);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return { slug: data.slug, ...data } as Restaurant;
  });
}

export async function getNearbyRestaurants(latitude: number, longitude: number, radius: number): Promise<any> {
  const apiKey = process.env.REACT_APP_GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Google Places API key is not set in environment variables.");
  }

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;

  try {
    const response = await axios.get(url, {
      params: {
        location: `${latitude},${longitude}`,
        radius,
        type: "restaurant",
        key: apiKey,
      },
    });

    if (response.data.status !== "OK") {
      throw new Error(response.data.error_message || "Failed to fetch nearby restaurants.");
    }

    return response.data.results;
  } catch (error) {
    console.error("Error fetching nearby restaurants:", error);
    throw error;
  }
}
