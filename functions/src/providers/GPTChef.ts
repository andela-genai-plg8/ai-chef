import API, { OpenAI } from "openai";
import { Chef, ChatHistory, ChatItem, GetResponseParams } from "./Chef";

export class GPTChef extends Chef {
  private openai?: InstanceType<typeof OpenAI>;

  constructor(name: string, model: string, history: ChatHistory = []) {
    super(name, model, history);
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_KEY,
    });
  }

  async getResponse({ prompt, callBack }: GetResponseParams = {}): Promise<string> {
    if (prompt) this.history.push({ role: "user", content: prompt });

    const call = async () => {
      return await this.openai!.chat.completions.create({
        model: this.model, // or any model you've pulled
        messages: this.history as API.ChatCompletionMessageParam[],
        tools: [
          {
            type: "function",
            function: {
              name: "find_recipe",
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

    console.log(this.history.map((h) => h.role));
    let response = await call();
    let count = 0;
    let result: any = null;
    while (response.choices[0].finish_reason == "tool_calls" && count < 5) {
      for (const toolCall of response.choices[0].message.tool_calls!) {
        this.history.push(response.choices[0].message as ChatItem);

        const functionCall = (toolCall as unknown as { function: Function }).function;

        switch (functionCall.name) {
          case "find_recipe": {
            const ingredients = JSON.parse(functionCall.arguments).ingredients.join(",") as string;
            try {
              result = result !== null ? result : await this.searchForMatchingRecipe(ingredients);
              const content = `This is the data from the tool: ${JSON.stringify(result)}`;
              this.history.push({ role: "tool", content, tool_call_id: toolCall.id });
            } catch (error) {
              console.error("Error calling Spoonacular API:", error);
              const errorMessage = typeof error === "object" && error !== null && "message" in error ? (error as { message: string }).message : String(error);
              this.history.push({ role: "tool", content: `Error calling Spoonacular API: ${errorMessage}`, tool_call_id: toolCall.id });
            }

            break;
          }
          case "display_recipes": {
            try {
              const recipes = JSON.parse(functionCall.arguments).recipes || [];
              this.recipeRecommendations = recipes;

              console.log("Recipes to display:", recipes.length);
              this.history.push({ role: "tool", content: `${recipes.length} recommendations will be displayed.`, tool_call_id: toolCall.id });
            } catch (error) {
              console.error("Error displaying recipes:", error);
              // const errorMessage = typeof error === "object" && error !== null && "message" in error ? (error as { message: string }).message : String(error);
              this.history.push({ role: "tool", content: `Error displaying recipes: ${error}`, tool_call_id: toolCall.id });
            }

            break;
          }
          default:
            this.history.push({ role: "tool", content: `The tool ${functionCall.name} is not implemented.`, tool_call_id: toolCall.id });
            break;
        }
      }

      response = await call();
      count++;
    }

    return response.choices[0]?.message?.content || "";
  }
}
