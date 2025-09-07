import { Chef } from "./Chef";
import { GeminiChef } from "./GeminiChef";
import { GPTChef } from "./GPTChef";
import { OllamaChef } from "./OllamaChef";

export type ChatItem = { role: string; content: string; tool_call_id?: string; [name: string]: any };
export type ChatHistory = ChatItem[];
export type ChefFactoryGetChefParam = {
  name: string;
  specifiedModel?: string;
  history?: ChatHistory;
};

export abstract class ChefFactory {
  public static getChef({ name, specifiedModel = process.env.DEFAULT_MODEL || "", history = [] }: ChefFactoryGetChefParam): Chef {
    // This method should return an instance of the specific agent
    const provider = specifiedModel?.replace(/^([^-]+)\-[^\n]+$/i, "$1");
    const model = specifiedModel.substring(provider.length + 1); // Remove the "gpt-" or "ollama-" prefix

    console.log(`Creating ${provider} chef with model ${model} from specified model: ${specifiedModel}`);

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
