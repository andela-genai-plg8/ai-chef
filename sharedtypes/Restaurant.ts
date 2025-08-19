export type Restaurant = {
  name: string;
  slug?: string;
  address?: string;
  phone?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  plusCode?: string;
  image: string;
  otherImages: string[];
  website?: string;
};
