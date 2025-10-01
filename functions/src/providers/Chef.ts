import axios from "axios";
import { Recipe } from "shared-types";
import * as admin from "firebase-admin";


export type GetResponseParams = {
  systemPrompt?: string;
  prompt?: string;
  authorizationToken?: string | null;
  callBack?: (data: any) => void;
};
export type ChatItem = { role: string; content: string; tool_call_id?: string; [name: string]: any };
export type ChatHistory = ChatItem[];

/**
 * Generate the default system prompt used to seed the model's context.
 * Separated to keep the constructor concise.
 */
function getDefaultSystemPrompt(name: string): string {
  return (`
You are Chef ${name}, a knowledgeable and friendly food technologist and chef. Your primary goal is to help users discover and discuss recipes using the available tools.
[[USER_DESCRIPTION]]
Core Directives

Introduction

On the very first interaction only, introduce yourself simply to the user.

If the user is anonymous, encourage them to sign in or sign up for a personalized experience.

Example: "Hello, I'm Chef ${name}. I am here to assist with your cooking aspirations. If you login, I can offer personalized recipe suggestions based on your preferences."

Greetings

If an anonymous user sends a normal greeting (e.g., “hi,” “hello,” “good morning”), for the first time, respond with a polite greeting.

Example: “Hello! How are you today? I am here to assist with your cooking aspirations. If you login, I can offer personalized recipe suggestions based on your preferences.”

Subsequent greetings should be brief.

Example: “Hello again! How can I assist you today?”

If a user who is logged in sends a normal greeting, respond with a personalized greeting.

Example: "Hello [[user_name]], I'm Chef ${name}. What can I help you cook today?"

Subsequent greetings should be brief randomly mentioning the name of the user.

Example: “Hello [[user_name]]! How can I assist you today?”

Do not trigger the 'recipe request workflow' unless the user explicitly asks about food or cooking.

Brevity

Keep responses concise (1-2 sentences). Provide more detail only if explicitly asked.

Accuracy

Always provide correct information.

If you don't know an answer or a tool returns no results, clearly state it without guessing.

Recipe Request Workflow

When a user provides ingredients, requests a recipe, or mentions a specific dish, always follow this workflow exactly:

Step 1: Find Recipes

Call the find_recipe tool immediately to search for relevant recipes.

Constraint: Do not use internal knowledge or skip this step, even if the request is simple.

Step 2: Handle "Not Found"

If no results are returned, politely inform the user and stop this workflow.

Example: "My apologies, I couldn't find any recipes with those ingredients. Perhaps we could try searching for something else?"

Step 3: Format to JSON

If results are found, convert them into a JSON array.

Each object must follow this schema (omit missing fields):

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

Call the display_recipes tool with the JSON array as the sole argument.

Constraint: Do not skip this step.

Step 5: Summarize

After tool calls, provide a brief plain-text/markdown summary.

If at least one recipe was passed to display_recipes, include a link placeholder:

Example: "I found a wonderful recipe for you: Savory Slow-Roasted Tomatoes with Anchovy. Enjoy! View Results"

Constraint: Do not repeat full recipe details in the summary. Also, accompany each recipe in the summary with an image and a server relative link to its respective recipe page. The link to recipes has the format: /recipe/<slug>.

Recipe Discussion Workflow

If the user asks about a specific recipe (e.g., clarification about ingredients, steps, substitutions, or nutrition):

Identify the recipe in context

If only one recipe was recently returned, assume that's the recipe in question.

If multiple recipes were shown, ask the user which one they are referring to.

Answer based on available recipe data

Use only the recipe information that was returned by the tools.

If the requested detail is unavailable, state it clearly. Example: "That detail wasn't included in the recipe data."

Stay concise

Keep responses short unless the user explicitly asks for more explanation.
`.trim());
}

/**
 * Base class for Chef providers.
 * Subclasses implement provider-specific behavior such as embedding storage.
 */
export abstract class Chef {
  protected name: string;
  protected model: string;
  protected history: ChatHistory;
  protected latestHistory: ChatHistory;
  protected recipeRecommendations: Recipe[] = [];
  protected ingredients: string[] = [];
  protected hasRecipeRecommendations: boolean;

  constructor(name: string, model: string, history: ChatHistory = []) {
    this.name = name;
    this.model = model;
    this.latestHistory = [];
    this.hasRecipeRecommendations = false;

    // Seed the conversation with the system prompt and any provided history
    this.history = [{ role: "system", content: getDefaultSystemPrompt(name) }, ...history];

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.DATABASE_URL,
      });
    }
  }

  /**
   * Prepare ingredient names by calling the model. Subclasses may override.
   */
  async getIngredientNames(ingredientList: string[]): Promise<any> {
    const response = await this.getResponse({
      prompt:
        "You are given a JSON array of ingredient strings. Extract only the ingredient names, ignoring numbers, quantities, and units and return a JSON map keyed by the original name.",
      systemPrompt:
        "You are a helpful assistant chef who can help to review and identify recipe related information such as names or appropriate ingredient units/measure. Do not make any tool calls.",
    });
    return response;
  }

  /**
   * Pass context to the model and optionally inject a different system prompt.
   * Default implementation updates the system prompt with user info when available.
   */
  public async getResponse(param?: GetResponseParams): Promise<string> {
    try {
      if (param?.systemPrompt) {
        this.history = this.history.map((item: ChatItem) => (item.role === "system" ? { ...item, content: param.systemPrompt! } : item));
      }

      if (param?.authorizationToken) {
        const decoded = await admin.auth().verifyIdToken(param.authorizationToken);
        const userRecord = await admin.auth().getUser(decoded.uid);
        if (userRecord) {
          this.history = this.history.map((item) => {
            if (item.role === "system") {
              return {
                ...item,
                content: item.content
                  .replace("[[USER_DESCRIPTION]]", `The user's name is ${userRecord.displayName}.`)
                  .replace(/\[\[(user_name)\]\]/gi, userRecord.displayName || "Friend"),
              };
            }
            return item;
          });
          return "";
        }
      }
    } catch (err: any) {
      // Non-fatal: if auth fails or user lookup fails, continue as anonymous.
      console.warn("getResponse: could not resolve user token:", err?.message || err);
    }

    // If we couldn't resolve a user, replace user description placeholders.
    this.history = this.history.map((item) => {
      if (item.role === "system" && item.content.includes("[[USER_DESCRIPTION]]")) {
        return { ...item, content: item.content.replace("[[USER_DESCRIPTION]]", "The user is anonymous.") };
      }
      return item;
    });

    return "";
  }

  /**
   * Search the application DB for recipes matching the given ingredients.
   */
  protected async searchForMatchingRecipeByIngredientNames(ingredientNames: string | string[]): Promise<any> {
    this.ingredients = Array.isArray(ingredientNames)
      ? ingredientNames
      : (ingredientNames || "")
          .split(",")
          .map((i) => i.trim())
          .filter((i) => i.length > 0);

    const snapshot = await admin.firestore().collection("recipes").where("ingredientList", "array-contains-any", this.ingredients).get();
    this.recipeRecommendations = snapshot.docs.map((doc) => doc.data()) as Recipe[];
    return this.recipeRecommendations;
  }

  /**
   * Search the Spoonacular API for recipe suggestions.
   */
  protected async searchSpoonacular(ingredients: string): Promise<any> {
    try {
      const response = await axios.get("https://api.spoonacular.com/recipes/findByIngredients", {
        params: {
          ingredients,
          apiKey: process.env.SPOONACULAR_API_KEY,
          ignorePantry: true,
        },
      });
      return response.data;
    } catch (error: any) {
      console.warn("searchSpoonacular failed:", error?.message || error);
      return [];
    }
  }

  // --- simple accessors ---
  public getRecipeRecommendations(): Recipe[] {
    return [...this.recipeRecommendations];
  }

  public getIngredients(): string[] {
    return [...this.ingredients];
  }

  public getHistory(): ChatHistory {
    return [...this.history];
  }

  public getLatestHistory(): ChatHistory {
    return [...this.latestHistory];
  }

  public addToHistory(item: ChatItem): void {
    this.history.push(item);
    this.latestHistory.push(item);
  }

  public getHasRecipeRecommendations(): boolean {
    return this.hasRecipeRecommendations;
  }

  // Subclasses must implement how embeddings are stored.
  public abstract storeEmbeddings(recipes: Recipe[]): Promise<any>;
}

