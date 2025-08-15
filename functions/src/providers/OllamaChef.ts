import ollama from "ollama";
import { Chef, ChatHistory, GetResponseParams } from "./Chef";

export class OllamaChef extends Chef {
  constructor(name: string, model: string, history: ChatHistory = []) {
    super(name, model, history);
  }

  async getResponse({ prompt, callBack }: GetResponseParams = {}): Promise<string> {
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
        ],
      });

    let response = await call();

    if (response.message.tool_calls && response.message.tool_calls?.length > 0) {
      response.message.tool_calls.forEach(async (toolCall) => {
        this.history.push(response.message);

        switch (toolCall.function.name) {
          case "find_recipe":
            // Handle find_recipe tool call
            const content = JSON.stringify(await this.callSpoonacular(toolCall.function.arguments.ingredients.join(",")));

            this.history.push({ role: "tool", content, name: response.message.tool_name });
            response = await call();
            break;
          default:
            break;
        }
      });
    }

    console.log("Final response:", response.message);
    return response.message.content || "";
  }
}
