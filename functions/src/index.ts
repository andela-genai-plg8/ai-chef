import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { ChefAgent } from "./agents/ChefAgent";
import { MODELS } from "./utils/models";


export const chat = functions.https.onRequest(async (req: Request, res: Response) => {
  const context: Array<{ sender: string; text: string }> = req.body.context || [];

  try {
    const chef = new ChefAgent(
      "Abiodun",
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
