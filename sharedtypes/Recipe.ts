export type IngredientName = string;

export type Ingredient = {
  name: IngredientName;
  quantity: number | string;
  unit?: string;
};

export type PreparationStep = {
  step: string | number;
  instruction: string;
  duration: number | string; // in minutes
};

export type Recipe = {
  name: string;
  description?: string;
  image: string;
  preparationTime?: number | string;
  servings?: number | string;
  calories?: number | string;
  ingredients: Ingredient[];
  instructions: PreparationStep[];
};
