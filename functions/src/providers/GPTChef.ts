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
              description: "Displays the found recipes. It does not return any result.",
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
        this.history.push(response.choices[0].message as ChatItem);

        const functionCall = (toolCall as unknown as { function: Function }).function;

        switch (functionCall.name) {
          case "find_recipe": {
            const ingredients = JSON.parse(functionCall.arguments).ingredients.join(",") as string;
            // console.log("Calling Spoonacular API with ingredients:", ingredients);
            result = result !== null ? result : await this.callSpoonacular(ingredients);
            const content = `This is the data from the tool: ${JSON.stringify(result)}`;
            this.history.push({ role: "tool", content, tool_call_id: toolCall.id });

            console.log("Tool call result:", content.length, toolCall.id);
            break;
          }
          case "display_recipes": {
            const recipes = JSON.parse(functionCall.arguments).recipes || [];
            this.history.push({ role: "tool", content: "", tool_call_id: toolCall.id });

            break;
          }
          default:
            break;
        }
      }

      response = await call();
      count++;
    }

    return response.choices[0]?.message?.content || "";
  }
}
