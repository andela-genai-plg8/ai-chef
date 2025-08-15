import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { SupportedModels } from "shared-types";
import { MODELS } from "../utils/models";

export const models = functions.https.onRequest(async (req: Request, res: Response) => {
  try {
    // return the available models
    res.json(
      Object.keys(MODELS).reduce((acc: SupportedModels, provideKey) => {
        if (MODELS[provideKey].supported) acc[provideKey] = MODELS[provideKey];

        if (acc[provideKey]) {
          acc[provideKey].models = Object.keys(acc[provideKey].models).reduce((mAcc, mKey) => {
            const m = acc[provideKey].models[mKey];
            m.id = mKey.replace(/^[^-]+[\-]/gi, "");

            if (mKey === process.env.DEFAULT_MODEL) {
              m.default = true;
            }

            mAcc[mKey] = m;
            return mAcc;
          }, {} as (typeof acc)[typeof provideKey]["models"]);
        }
        return acc;
      }, {})
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
