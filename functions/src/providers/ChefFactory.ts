import { Chef } from "./Chef";
import { GeminiChef } from "./GeminiChef";
import { GPTChef } from "./GPTChef";
import { OllamaChef } from "./OllamaChef";

export type ChatItem = { role: string; content: string; tool_call_id?: string; [name: string]: any };
export type ChatHistory = ChatItem[];

export abstract class ChefFactory {
  public static getChef(name: string, specifiedModel: string = process.env.DEFAULT_MODEL || "", history: ChatHistory = []): Chef {

    console.log("specified model:", specifiedModel);
    // This method should return an instance of the specific agent
    const provider = specifiedModel?.replace(/^([^-]+)\-[^\n]+$/i, "$1");
    const model = specifiedModel.substring(provider.length + 1); // Remove the "gpt-" or "ollama-" prefix

    switch (provider) {
      case "gpt":
        return new GPTChef(name, model, history);
      case "ollama":
        return new OllamaChef(name, model, history);
      case "google":
        return new GeminiChef(name, model, history);
      default:
        throw new Error("Unknown agent");
    }
  }
}
