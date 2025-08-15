import axios from "axios";

export type GetResponseParams = { prompt?: string; callBack?: (data: any) => void };
export type ChatItem = { role: string; content: string; tool_call_id?: string; [name: string]: any };
export type ChatHistory = ChatItem[];

export abstract class Chef {
  protected name: string;
  protected model: string;
  protected history: ChatHistory;

  constructor(name: string, model: string, history: ChatHistory = []) {
    this.name = name;
    this.model = model;
    this.history = [
      {
        role: "system",
        content: `
Your name is Chef ${this.name} and you are a helpful food technologist/chef for a restaurant.
Give short, courteous answers (no more than 2 sentences) unless the user requests more recipe details.

If the user provides ingredients, asks for a recipe, or mentions a dish, CALL the "find_recipe" tool ONLY ONCE to get information before answering.
Do not skip the tool call even if you believe you know the answer.
If the tool returns no results, then politely say so and offer any suggestions you know.

Unless otherwise specified, introduce yourself AFTER tool results are retrieved.
Always be accurate. If you don't know the answer, say so.
      `.trim(),
      },
      ...history,
    ];
  }

  abstract getResponse(param?: GetResponseParams): Promise<string>;

  async callSpoonacular(ingredients: string): Promise<any> {
    console.log("Calling Spoonacular API with ingredients:", ingredients);
    const response = await axios.get("https://api.spoonacular.com/recipes/findByIngredients", {
      params: {
        ingredients,
        apiKey: process.env.SPOONACULAR_API_KEY,
        ignorePantry: true,
      },
    });

    return response.data;
  }
}
