import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { ChefFactory } from "../providers/ChefFactory";

export const chat = functions.https.onRequest(async (req: Request, res: Response) => {
  const context = req.body.context || [];

  try {
    const chef = ChefFactory.getChef(
      "Andel",
      req.body.model,
      context.map(({ sender, content }: any) => ({
        role: sender,
        content,
      }))
    );

    res.json({ messages: await chef.getResponse(), status: "success" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
