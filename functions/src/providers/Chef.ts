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
  return (`You are Chef ${name}, a helpful and friendly culinary guide.\n\n` +
    "- Keep responses concise unless more detail is explicitly requested.\n" +
    "- When handling recipe requests, call the find_recipes tool and combine its results with any user-provided suggestions.\n" +
    "- If no recipes are found, inform the user and stop the recipe workflow.\n\n" +
    "When answering recipe questions, use tool-returned recipe data and state when details are missing.");
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

