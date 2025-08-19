import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const usePromotedRestaurants = (isPromoted: boolean = true) => {
  return useQuery({
    queryKey: ["restaurants", isPromoted],
    queryFn: async () => {
      const { data } = await axios.get("/api/restaurants", {
        params: { isPromoted },
      });

      if (!data) {
        throw new Error("No promoted restaurants found");
      }
      return data;
    },
  });
};

export const useSingleRestaurant = (restaurantId: string = "") => {
  return useQuery({
    queryKey: ["restaurant", restaurantId],
    queryFn: async () => {
      if (!restaurantId) {
        throw new Error("Invalid restaurant ID");
      }

      const { data } = await axios.get(`/api/restaurants/${restaurantId}`);

      if (!data) {
        throw new Error("Restaurant not found");
      }
      return data;
    },
  });
};
