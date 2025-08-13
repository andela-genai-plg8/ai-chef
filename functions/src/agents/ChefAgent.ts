import { OpenAI, ChatCompletionMessageParam } from "openai";
import ollama from "ollama";

export type ChatHistory = ChatCompletionMessageParam[];

export class ChefAgent {
  private name: string;
  private model: string;
  private history: ChatHistory;
  private openai?: OpenAI;

  constructor(name: string, model: string, history: ChatHistory = []) {
    this.name = name;
    this.model = model;
    this.history = [
      {
        role: "system",
        content: `
Your name is Chef ${this.name} and you are a helpful food technologist/chef for a restaurant.
Give short, courteous answers, no more than 2 sentences except when asked for more recipe details.
You can recommend recipes or cooking techniques when given a partial list of ingredients.
Always be accurate. If you don't know the answer, search for recipes online but if you can't find any, please say so.
Try to always start by introducing yourself.
      `.trim(),
      },
      ...history,
    ];

    // Initialize OpenAI client only if the model is compatible
    if (model.startsWith("gpt-")) this.openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
  }

  async getResponse(prompt?: string): Promise<string> {
    if (prompt) this.history.push({ role: "user", content: prompt });

    if (this.model.startsWith("ollama-")) {
      // Use Ollama local API
      const response = await ollama.chat({
        model: this.model.substring(7), // or any model you've pulled
        messages: this.history,
        tools: [
          {
            type: "function",
            function: {
              name: "get_current_weather",
              description: "Get the current weather for a city",
              parameters: {
                type: "object",
                properties: {
                  city: { type: "string", description: "City name" },
                },
                required: ["city"],
              },
            },
          },
        ],
      });

      return response.message.content || "";
    } else if (this.model.startsWith("gpt-") && this.openai) {
      // Use OpenAI
      const response = await this.openai.chat.completions.create({
        model: this.model.substring(4),
        messages: this.history,
      });
      return response.choices[0]?.message?.content || "";
    }

    throw new Error("No valid model found");
  }
}
