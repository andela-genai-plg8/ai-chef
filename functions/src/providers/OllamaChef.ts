import ollama from "ollama";
import { Chef, ChatHistory, GetResponseParams } from "./Chef";
import { Recipe } from "shared-types";

export class OllamaChef extends Chef {
  constructor(name: string, model: string, history: ChatHistory = []) {
    super(name, model, history);
  }

  async getResponse({ prompt, ...rest }: GetResponseParams = {}): Promise<string> {
    await super.getResponse({ prompt, ...rest });
    if (prompt) this.history.push({ role: "user", content: prompt });

    // Use Ollama local API
    const call = async () =>
      ollama.chat({
        model: this.model, // or any model you've pulled
        messages: this.history,
        tools: [
          {
            type: "function",
            function: {
              name: "find_recipes",
              description: "Finds recipes based on ingredients. The response is a JSON array of recipes.",
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

    let response = await call();

    let count = 0;
    let result: any = null;
    while (response.message.tool_calls && count < 5) {
      response.message.tool_calls.forEach(async (toolCall) => {
        this.addToHistory(response.message);

        console
        // const functionCall = (toolCall as unknown as { function: Function }).function;

        switch (toolCall.function.name) {
          case "find_recipes": {
            const ingredients = toolCall.function.arguments.ingredients;

            try {
              result = result !== null ? result : await this.searchForMatchingRecipe(ingredients);
              console.log("Result from searchForMatchingRecipe:", ingredients, result);

              const content = `This is the data from the tool: ${JSON.stringify(result)}`;
              this.addToHistory({ role: "tool", content, tool_call_id: toolCall.function.name });
            } catch (error) {
              const errorMessage = typeof error === "object" && error !== null && "message" in error ? (error as { message: string }).message : String(error);
              this.addToHistory({ role: "tool", content: `Error calling Spoonacular API: ${errorMessage}`, tool_call_id: toolCall.function.name });
            }

            break;
          }
          case "display_recipes": {
            try {
              console.log("Displaying recipes:", toolCall.function.arguments.recipes);
              const recipes: Recipe[] = JSON.parse(toolCall.function.arguments.recipes) || [];
              this.recipeRecommendations = recipes;

              this.addToHistory({ role: "tool", content: `${recipes.length} recommendations will be displayed.`, tool_call_id: toolCall.function.name });
            } catch (error) {
              console.error("Error displaying recipes:", error);
              // const errorMessage = typeof error === "object" && error !== null && "message" in error ? (error as { message: string }).message : String(error);
              this.addToHistory({ role: "tool", content: `Error displaying recipes: ${error}`, tool_call_id: toolCall.function.name });
            }

            break;
          }
          default:
            this.addToHistory({ role: "tool", content: `The tool ${toolCall.function.name} is not implemented.`, tool_call_id: toolCall.function.name });
            break;
        }
      });

      response = await call();
      count++;
    }

    return response.message.content || "";
  }
}
