import { Recipe } from "./Recipe";

export type ChatMessage = {
  role: string;
  content: string;
  tool_call_id?: string;
  recipeRecommendations?: Recipe[];
  tool_calls?: any[];
};
