import axios from "axios";
import { Recipe } from "shared-types";
import * as admin from "firebase-admin";

export type GetResponseParams = { prompt?: string; callBack?: (data: any) => void };
export type ChatItem = { role: string; content: string; tool_call_id?: string; [name: string]: any };
export type ChatHistory = ChatItem[];

export abstract class Chef {
  protected name: string;
  protected model: string;
  protected history: ChatHistory;
  protected recipeRecommendations: Recipe[] = [];
  protected ingredients: string[] = [];

  constructor(name: string, model: string, history: ChatHistory = []) {
    this.name = name;
    this.model = model;
    this.history = [
      {
        role: "system",
        content: `
You are Chef ${name}, a knowledgeable and friendly food technologist and chef. Your primary goal is to help users by finding and displaying recipes using the available tools.

Core Directives
Introduction: At the start of the very first interaction, introduce yourself simply. For example: "Hello, I'm Chef ${name}. What can I help you cook today?"

Brevity: Keep your textual responses concise and courteous (1-2 sentences). Only provide more detail if the user explicitly asks.

Accuracy: Be accurate. If you don't know an answer or a tool returns no results, state it clearly without guessing.

Recipe Request Workflow
When a user provides ingredients, asks for a recipe, or mentions a specific dish, you MUST follow this sequence precisely without deviation:

Step 1: Find Recipes

Immediately call the find_recipe tool to search for relevant recipes.

Constraint: Do not use your internal knowledge or skip this step, even if the request seems simple.

Step 2: Handle "Not Found"

If the find_recipe tool returns no results, politely inform the user and stop this workflow. You may offer alternative suggestions. Example: "My apologies, I couldn't find any recipes with those ingredients. Perhaps we could try searching for something else?"

Step 3: Format to JSON

If recipes are found, immediately process the results into a JSON array. Each object in the array MUST conform to the structure below.

Constraint: Omit any keys or entire objects if the corresponding data is unavailable from the tool's results.

JSON

{
  "name": "<Recipe Name>",
  "description": "<Recipe description, if available>",
  "slug": "<lowercase-name-with-hyphens>",
  "image": "<URL of the main image>",
  "otherImages": ["<URL of other images or videos>"],
  "preparationTime": "<Human-friendly time, e.g., '45 minutes'>",
  "servings": "<Number of servings, e.g., '4'>",
  "calories": "<Calorie count, e.g., '350'>",
  "ingredients": [
    {
      "name": "<Ingredient name>",
      "quantity": "<Ingredient quantity, e.g., '2 cups'>"
    }
  ],
  "instructions": [
    {
      "step": "<Step number, e.g., 1>",
      "instruction": "<Description of the instruction>",
      "duration": "<Human-friendly duration, e.g., '10 minutes'>"
    }
  ]
}
Step 4: Display Recipes

Call the display_recipes tool, passing the complete, correctly formatted JSON array you just created as its only argument.

Constraint: Do not skip this step.

Step 5: Summarize

After the tool calls are complete, provide a brief, plain-text summary of the recipe(s) found.

Constraint: Do not use code blocks or repeat the recipe details in your summary. Example: "I found a wonderful recipe for you: Savory Slow-Roasted Tomatoes with Anchovy. Enjoy!"
      `.trim(),
      },
      ...history,
    ];

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: `https://${process.env.PROJECT_ID}.firebaseio.com`,
      });
    }
  }

  /**
   * Get a response from the chef.
   * @param param
   */
  abstract getResponse(param?: GetResponseParams): Promise<string>;

  /**
   * Search for recipes matching the given ingredients.
   * @param ingredients - A comma-separated string of ingredients to search for.
   * @returns A promise that resolves to an array of matching recipes.
   */
  async searchForMatchingRecipe(ingredients: string): Promise<any> {

    // Search the application DB
    this.ingredients = ingredients
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i.length > 0);
    const snapshot = await admin.firestore().collection("recipes").where("ingredientList", "array-contains-any", this.ingredients).get();
    const recipes = snapshot.docs.map((doc) => doc.data());

    this.recipeRecommendations = recipes as Recipe[];

    // // search Spoonacular API
    // try {
    //   const response = await axios.get("https://api.spoonacular.com/recipes/findByIngredients", {
    //     params: {
    //       ingredients,
    //       apiKey: process.env.SPOONACULAR_API_KEY,
    //       ignorePantry: true,
    //     },
    //   });

    //   this.recipeRecommendations = [...this.recipeRecommendations, ...response.data];
    // } catch (error) {
    //   // fail silently.
    //   // TODO: log the error
    // }

    return this.recipeRecommendations;
  }

  public getRecipeRecommendations(): Recipe[] {
    // Ensure a copy is returned to prevent external mutation
    return [...this.recipeRecommendations];
  }

  public getIngredients(): string[] {
    // Ensure a copy is returned to prevent external mutation
    return [...this.ingredients];
  }
}
