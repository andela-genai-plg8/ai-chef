import { OpenAI, ChatCompletionMessageParam } from "openai";

export type ChatHistory = ChatCompletionMessageParam[];

export class ChefAgent {
  private name: string;
  private model: string;
  private history: ChatHistory;
  private openai: OpenAI;

  constructor(name: string, model: string, history: ChatHistory = []) {
    this.name = name;
    this.model = model;
    this.history = [
      {
        role: "system",
        content: `
Your name is ${this.name} and you are a helpful food technologist/chef for a restaurant.
Give short, courteous answers, no more than 2 sentences except when asked for more recipe details.
You can recommend recipes or cooking techniques when given a partial list of ingredients.
Always be accurate. If you don't know the answer, search for recipes online but if you can't find any, please say so.
Try to always start by introducing yourself.
      `.trim(),
      },
      ...history,
    ];
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
  }

  async getResponse(prompt?: string): Promise<string> {
    // Add the new user message to the conversation history
    if (prompt) this.history.push({ role: "user", content: prompt });

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: this.history,
    });

    return response.choices[0]?.message?.content || "";
  }
}
