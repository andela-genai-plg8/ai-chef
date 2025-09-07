import API, { OpenAI } from "openai";
import { Chef, ChatHistory, ChatItem, GetResponseParams } from "./Chef";
import { Chat } from "openai/resources/index";
import { Recipe } from "shared-types";

export class GPTChef extends Chef {
  private openai?: InstanceType<typeof OpenAI>;

  constructor(name: string, model: string, history: ChatHistory = []) {
    super(name, model, history);
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_KEY,
    });
  }

  async getIngredientNames(ingredientListBlogs: string[]): Promise<any> {
    await super.getIngredientNames(ingredientListBlogs);

    let response = await this.openai!.chat.completions.create({
      model: this.model,
      messages: this.history as API.ChatCompletionMessageParam[],
    });

    // extract the JSON array from the response of the model
    const match = response.choices[0]?.message?.content?.match(/^\{[\s\S\w\W]*\}/s);
    if (match) {
      return JSON.parse(match[0]);
    }

    return [];
  }

  async searchForMatchingRecipeByVector(ingredients: string): Promise<any> {
    this.ingredients = ingredients.split("\n");
    console.info("Vector search with ingredients: " + JSON.stringify(ingredients));
    const response = await this.openai!.embeddings.create({
      input: ingredients,
      model: "text-embedding-3-small", // or 'text-embedding-3-large'
    });
    const embedding = response.data[0].embedding;
    console.info(`Searched embedding: '${ingredients}', length: ${embedding.length}`);
    const COLLECTION = "ingredients";
    const res = await fetch(`${process.env.QDRANT_URL}/collections/${COLLECTION}/points/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vector: {
          name: "small_model",
          vector: embedding,
        },
        top: 5,
        with_payload: true,
      }),
    });

    const data: any = await res.json();
    let recipes = (data.result || []).map((d: any) => d.payload);
    let scores = (data.result || []).map((d: any) => d.score);

    console.log(`Returning recipes from searchForMatchingRecipeByVector: ${recipes.length} recipes, queried ingredients: ${ingredients}, scores: ${scores}`);

    this.recipeRecommendations = recipes as Recipe[];
    return this.recipeRecommendations;
  }

  async getResponse({ prompt, ...rest }: GetResponseParams = {}): Promise<string> {
    await super.getResponse({ prompt, ...rest });
    if (prompt) this.addToHistory({ role: "user", content: prompt });

    const call = async () => {
      return await this.openai!.chat.completions.create({
        model: this.model, // or any model you've pulled
        messages: this.history as API.ChatCompletionMessageParam[],
        tools: [
          {
            type: "function",
            function: {
              name: "find_recipes",
              description: "Finds recipes based on ingredients. The response should be a JSON array of recipes.",
              parameters: {
                type: "object",
                properties: {
                  ingredients: { type: "array", items: { type: "string" }, description: "List of ingredients" },
                },
                required: ["ingredients"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "display_recipes",
              description: "Displays recipes to a special display. It returns a response stating the number recipes actually displayed.",
              parameters: {
                type: "object",
                properties: {
                  recipes: { type: "array", items: { type: "object" }, description: "List of recipes in JSON array format" },
                },
                required: ["recipes"],
              },
            },
          },
        ],
      });
    };

    let response = await call();
    let count = 0;
    let result: any = null;
    while (response.choices[0].finish_reason == "tool_calls" && count < 5) {
      for (const toolCall of response.choices[0].message.tool_calls!) {
        const { content, role, ...rest } = response.choices[0].message;
        this.addToHistory({ sender: role, role, content, ...rest } as ChatItem);

        const functionCall = (toolCall as unknown as { function: Function }).function;

        switch (functionCall.name) {
          case "find_recipes": {
            const ingredients = JSON.parse(functionCall.arguments).ingredients.join("\n") as string;
            try {
              result = result !== null ? result : await this.searchForMatchingRecipeByVector(ingredients);
              const content = `This is the data from the tool: ${JSON.stringify(result)}`;
              this.addToHistory({ role: "tool", content, tool_call_id: toolCall.id });
            } catch (error) {
              const errorMessage = typeof error === "object" && error !== null && "message" in error ? (error as { message: string }).message : String(error);
              this.addToHistory({ role: "tool", content: `Error calling Spoonacular API: ${errorMessage}`, tool_call_id: toolCall.id });
            }

            break;
          }
          case "display_recipes": {
            try {
              //const recipes = JSON.parse(functionCall.arguments).recipes || [];
              //this.recipeRecommendations = recipes;
              this.addToHistory({ role: "tool", content: `${3} recommendations will be displayed.`, tool_call_id: toolCall.id });
              //this.addToHistory({ role: "tool", content: `Recipes are:\n${JSON.stringify(recipes, null, 2)}.`, tool_call_id: toolCall.id });
              //this.addToHistory({ role: "tool", content: `${recipes.length} recommendations will be displayed.`, tool_call_id: toolCall.id });
              //this.hasRecipeRecommendations = true;
            } catch (error) {
              console.error("Error displaying recipes:", error);
              // const errorMessage = typeof error === "object" && error !== null && "message" in error ? (error as { message: string }).message : String(error);
              this.addToHistory({ role: "tool", content: `Error displaying recipes: ${error}`, tool_call_id: toolCall.id });
            }

            break;
          }
          default:
            this.addToHistory({ role: "tool", content: `The tool ${functionCall.name} is not implemented.`, tool_call_id: toolCall.id });
            break;
        }
      }

      response = await call();
      count++;
    }

    return response.choices[0]?.message?.content || "";
  }
}
