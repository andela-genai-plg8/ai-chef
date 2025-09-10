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

export type Word = {
  value: number;
  word: string;
}

export type Recipe = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  image: string;
  otherImages?: string[];
  preparationTime?: number | string;
  servings?: number | string;
  calories?: number | string;
  ingredients: Ingredient[];
  ingredientList: string[];
  ingredientListTokens?: number[];
  instructions: PreparationStep[];
};
