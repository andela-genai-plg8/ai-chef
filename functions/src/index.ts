import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { ChefAgent } from "./agents/ChefAgent";
import { MODELS } from "./utils/models";

export const llama = functions.https.onRequest(async (req: Request, res: Response) => {
  const apiKey = process.env.OPENAI_KEY;
  const openai = new OpenAI({ apiKey });
  // Combine context window into a single prompt
  const context: Array<{ sender: string; text: string }> = req.body.context || [];
  const prompt = context.map((msg) => `${msg.sender === "user" ? "User" : "AI"}: ${msg.text}`).join("\n") + `\nUser: ${req.body.prompt || "Hello!"}`;
  try {
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
      store: true,
    });
    res.json({ output: response.output_text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const chat = functions.https.onRequest(async (req: Request, res: Response) => {
  const context: Array<{ sender: string; text: string }> = req.body.context || [];

  try {
    const chef = new ChefAgent(
      "Chef",
      "gpt-4o-mini",
      context.map((msg) => ({ role: msg.sender, content: msg.text }))
    );

    res.json({ output: await chef.getResponse() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const models = functions.https.onRequest(async (req: Request, res: Response) => {
  try {
    // return the available models
    res.json(MODELS);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
