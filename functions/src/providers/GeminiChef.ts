import { FunctionDeclaration, Type, GoogleGenAI } from "@google/genai";
import { Chef, ChatHistory, ChatItem, GetResponseParams } from "./Chef";

// Modern / unified client-compatible Gemini wrapper.
// Assumptions:
// - The installed client exposes either `client.chat.completions.create(...)` (chat-style)
//   or `client.responses.create(...)` (responses-style). We call whichever exists.
// - `tools` (function declarations) are accepted by the client under either
//   `functions`, `tools` or `function_calls` keys; we pass them as `functions` for chat
//   and `tools` for responses.
export class GeminiChef extends Chef {
  private client: any;
  private static tools: FunctionDeclaration[] = [
    {
      name: "find_recipes",
      description: "Finds recipes based on ingredients. The response should be a JSON array of recipes.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          ingredients: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of ingredients",
          },
        },
        required: ["ingredients"],
      },
    },
    {
      name: "display_recipes",
      description: "Displays the found recipes. It does not return any result.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          recipes: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT },
            description: "List of recipes in JSON array format",
          },
        },
        required: ["recipes"],
      },
    },
  ];

  constructor(name: string, model: string, history: ChatHistory = []) {
    super(name, model, history);
    // create a flexible client instance using the constructable GoogleGenAI class
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });
  }

  private buildMessages() {
    // Normalize history into a messages array suitable for both chat and responses.
    return this.history.map(({ role, content }) => {
      // some clients expect {role, content}, others {author, content}
      return { role, content };
    });
  }

  private extractFunctionCalls(response: any): any[] {
    // Normalize possible shapes returned by various client versions.
    if (!response) return [];
    if (Array.isArray(response.functionCalls) && response.functionCalls.length) return response.functionCalls;
    if (response.output && Array.isArray(response.output.function_calls) && response.output.function_calls.length) return response.output.function_calls;
    if (response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.function_call)
      return [response.choices[0].message.function_call];
    if (response.function_call) return [response.function_call];
    return [];
  }

  async getResponse({ prompt, ...rest }: GetResponseParams = {}): Promise<string> {
    await super.getResponse({ prompt, ...rest });

    const callModel = async () => {
      const messages = this.buildMessages();

      // Prefer chat.completions.create if available (chat-style)
      if (this.client?.chat?.completions?.create) {
        return await this.client.chat.completions.create({
          model: this.model,
          messages,
          functions: GeminiChef.tools,
          function_call: "auto",
        });
      }

      // Fallback to responses.create (unified responses API)
      if (this.client?.responses?.create) {
        return await this.client.responses.create({
          model: this.model,
          input: messages,
          tools: GeminiChef.tools,
          function_calls: "auto",
        });
      }

      throw new Error("No compatible Gen AI client method found (chat.completions.create or responses.create)");
    };

    let response = await callModel();
    let count = 0;
    let result: any = null;

    // Handle function/tool calls in a loop until the model stops calling tools.
    while (count < 5) {
      const functionCalls = this.extractFunctionCalls(response);
      if (!functionCalls || functionCalls.length === 0) break;

      for (const fc of functionCalls) {
        // Normalize function call shape
        const name = fc.name || fc.function || fc.functionName;
        const rawArgs = fc.arguments || fc.args || fc.argument || fc.json || fc.payload || "{}";
        let parsedArgs: any = {};
        try {
          parsedArgs = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
        } catch (e) {
          parsedArgs = {};
        }

        switch (name) {
          case "find_recipes": {
            const ingredientsArray = parsedArgs.ingredients || [];
            const ingredients = Array.isArray(ingredientsArray) ? ingredientsArray.join(",") : String(ingredientsArray || "");
            result = result !== null ? result : await this.searchForMatchingRecipe(ingredients);
            const content = `This is the data from the tool: ${JSON.stringify(result)}`;
            this.history.push({ role: "tool", content, tool_call_id: fc.id || name });
            break;
          }
          case "display_recipes": {
            const recipes = parsedArgs.recipes || [];
            this.history.push({ role: "tool", content: JSON.stringify(recipes), tool_call_id: fc.id || name });
            break;
          }
          default:
            // unknown tool — record for debugging
            this.history.push({ role: "tool", content: `Unhandled tool ${name} args:${JSON.stringify(parsedArgs)}`, tool_call_id: fc.id || name });
            break;
        }
      }

      // Re-call the model so it can incorporate the tool outputs into the next assistant message.
      response = await callModel();
      count++;
    }

    // Try to extract assistant text from common response shapes.
    if (response?.choices && response.choices[0] && response.choices[0].message) {
      return response.choices[0].message.content || "";
    }

    if (response?.output && Array.isArray(response.output) && response.output[0] && response.output[0].content) {
      // some clients return output as an array of content blocks
      const block = response.output[0].content;
      if (typeof block === "string") return block;
      if (Array.isArray(block) && block[0] && block[0].text) return block[0].text;
    }

    if (typeof response?.output_text === "string") return response.output_text;

    return "";
  }
}
