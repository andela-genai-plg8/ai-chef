import axios from "axios";
import { Recipe } from "shared-types";
import * as admin from "firebase-admin";

export type GetResponseParams = { systemPrompt?: string; prompt?: string; authorizationToken?: string | null; callBack?: (data: any) => void };
export type ChatItem = { role: string; content: string; tool_call_id?: string; [name: string]: any };
export type ChatHistory = ChatItem[];

/**
 * Abstract class representing a Chef.
 * This class provides a base implementation for different types of chefs.
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
    this.history = [
      {
        role: "system",
        content: `
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

Call the find_recipes tool immediately to search for relevant recipes.

Constraint: Do not use internal knowledge or skip this step, even if the request is simple.

Step 2: Handle "Not Found"

If no results are returned, politely inform the user and stop this workflow.

Example: "My apologies, I couldn't find any recipes with those ingredients. Perhaps we could try searching for something else?"

Step 3: Format to JSON

If results are found, convert them into a JSON array but do not write the JSON in the response.

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

To display the recipes, call the display_recipes tool with the JSON array as the sole argument.

Constraint: If there is at least one recipe, do not skip this step.

Step 5: Summarize

After tool calls, provide a brief summary in markdown format.

If at least one recipe was found, the summary should look like this:

Example 1: "I found a wonderful recipe for you:
[<recipe.name>]](/recipe/<slug>).
![<recipe.name>]](<recipe.image>)
Enjoy!"

Example 2: "I found 2 wonderful recipes for you:
- [<recipe.name>]](/recipe/<slug>).
![<recipe.name>]](<recipe.image>)

- [<recipe.name>]](/recipe/<slug>).
![<recipe.name>]](<recipe.image>)

Enjoy!"

If there are no recipes, simply state it.

Example: O dear! I could not find any recipes prepared with rice and beans.

Constraint: Do not give a blank summary, but do give fake recipes. Limit the summary to the recipes recieved from the find_recipes tool, make sure to state clearly that no recipes were found. Do not repeat full recipe details in the summary.

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
`.trim(),
      },
      ...history,
    ];

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.DATABASE_URL,
      });
    }
  }

  async getIngredientNames(ingredientListBlogs: string[]): Promise<any> {
    const response = await this.getResponse({
      prompt: `You are given a JSON array of ingredient strings.

Task: Extract only the ingredient names, ignoring numbers, quantities, and units.

Output Format:
Return a raw JSON map of objects in the following structure:


{
  "<original_name>": {
    "word": "<singular_form_of_main_ingredient>",
    "plural": "<plural_form_of_main_ingredient>",
    "variations": ["<variations_based_on_usage_in_original_name>"]
  },
  "<original_name>": {
    "word": "<singular_form_of_main_ingredient>",
    "plural": "<plural_form_of_main_ingredient>",
    "variations": ["<variations_based_on_usage_in_original_name>"]
  }
}



Rules:

- The key must be the original (possibly misspelled) ingredient string.

- Correct spelling where necessary.

- For phrases, identify the main ingredient and any modifiers (e.g., "ground beef", "beef" is the main ingredient).

- Always include both singular and plural (unless identical).

- Add other natural variations (e.g., hyphenated, spaced, descriptive forms) in variations.

- Do not include any numbers, measurements, or units.

- Output only the raw JSON array (no explanations, no markdown).

Example Input:

["1 bag of riceee", "beans", "with 10 tomotoe", "pickled-gherkins and curry-powder", "bottle-apple-cider"]


Example Output:

{
  "riceee": {"word": "rice", "plural": "rices", "variations": []},
  "beans": {"word": "bean", "plural": "beans", "variations": []},
  "baby-shrimp": {"word": "shrimp", "plural": "shrimps", "variations": ["baby shrimp", "baby shrimps", "baby-shrimp", "baby-shrimps"]},
  "smoked-mackerel-fillet": {"word": "mackerel", "plural": "mackerel", "variations": ["smoked-mackerel-fillet", "smoked-mackerel-fillets", "smoked mackerel fillet", "smoked mackerel fillets", "mackerel fillet", "mackerel fillets"]},
  "tomotoe": {"word": "tomato", "plural": "tomatoes", "variations": []},
  "curry-powder": {"word": "curry", "plural": "curries", "variations": ["curry powder", "curry-powder"]},
  "bottle-apple-cider": {"word": "apple", "plural": "apples", "variations": ["bottled apple cider", "bottle apple cider"]},
  "pickled-gherkins": {"word": "gherkin", "plural": "gherkins", "variations": ["pickled gherkins", "pickled-gherkins", "pickled gherkin", "pickled-gherkin"]}
}


Input:

${JSON.stringify(ingredientListBlogs)}`,
      systemPrompt: `You are a helpful assistant chef who can help to review and identify recipe related information such as names or appropriate ingredient units/measure.
Do not make any tool calls.`,
    });

    console.log("Ingredient names response:", response);

    // return response.split("\n").filter((item) => item.length > 0);
  }

  /**
   * To be implemented by subclass. Pass the contexts to the model and returns the model's response.
   * It should also pass tools to the model if available.
   * @param param
   */
  public async getResponse(param?: GetResponseParams): Promise<string> {
    try {
      // if there is a systemPrompt, replace the exising system prompt with the one provided
      if (param?.systemPrompt) {
        this.history = this.history.map((item: ChatItem) => {
          if (item.role === "system") {
            return {
              ...item,
              content: param.systemPrompt,
            } as ChatItem;
          }
          return item;
        });
      }

      if (param?.authorizationToken) {
        const decodeToken = await admin.auth().verifyIdToken(param.authorizationToken);
        const userRecord = await admin.auth().getUser(decodeToken.uid);

        if (userRecord) {
          this.history = this.history.map((item) => {
            if (item.role === "system") {
              return {
                ...item,
                content: item.content
                  .replace(
                    "[[USER_DESCRIPTION]]",
                    `
The user's name is ${userRecord.displayName}.
            `
                  )
                  .replace(/\[\[(user_name)\]\]/gi, userRecord.displayName || "Friend"),
              };
            }

            return item;
          });

          return Promise.resolve("");
        }
      }
    } catch {}

    this.history = this.history.map((item) => {
      console.log("User is anonymous");

      if (item.role === "system" && item.content.includes("[[USER_DESCRIPTION]]")) {
        return {
          ...item,
          content: item.content.replace(
            "[[USER_DESCRIPTION]]",
            `
The user is anonymous.`
          ),
        };
      }
      return item;
    });

    return Promise.resolve("");
  }

  /**
   * Search for recipes matching the given ingredients.
   * @param ingredients - A comma-separated string of ingredients to search for.
   * @returns A promise that resolves to an array of matching recipes.
   */
  protected async searchForMatchingRecipe(ingredients: string | string[]): Promise<any> {
    // Search the application DB
    this.ingredients = Array.isArray(ingredients)
      ? ingredients
      : (ingredients || "")
          .split(",")
          .map((i) => i.trim())
          .filter((i) => i.length > 0);

    const snapshot = await admin.firestore().collection("recipes").where("ingredientList", "array-contains-any", this.ingredients).get();
    const recipes = snapshot.docs.map((doc) => doc.data());
    console.log("Returning recipes from searchForMatchingRecipe:", recipes.length, this.ingredients);

    this.recipeRecommendations = recipes as Recipe[];
    return this.recipeRecommendations;
  }

  /**
   * Search the Spoonacular API for recipes matching the given ingredients.
   * @param ingredients
   * @returns
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
    } catch (error) {
      // fail silently.
      // TODO: log the error
      return [];
    }
  }

  public getRecipeRecommendations(): Recipe[] {
    // Ensure a copy is returned to prevent external mutation
    return [...this.recipeRecommendations];
  }

  public getIngredients(): string[] {
    // Ensure a copy is returned to prevent external mutation
    return [...this.ingredients];
  }

  public getHistory(): ChatHistory {
    // Ensure a copy is returned to prevent external mutation
    return [...this.history];
  }

  public getLatestHistory(): ChatHistory {
    // Ensure a copy is returned to prevent external mutation
    return [...this.latestHistory];
  }

  public addToHistory(item: ChatItem): void {
    this.history.push(item);
    this.latestHistory.push(item);
  }

  public getHasRecipeRecommendations(): boolean {
    return this.hasRecipeRecommendations;
  }
}
