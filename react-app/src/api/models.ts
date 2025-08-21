// src/api/models.ts
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

export async function getModels(onlySupported: boolean = true) {
  try {
    const db = getFirestore();
    const col = collection(db, "models");
    let modelsQuery;
    if (onlySupported) {
      modelsQuery = query(col, where("supported", "==", true));
    } else {
      modelsQuery = query(col);
    }
    const snapshot = await getDocs(modelsQuery);
    const models: Record<string, any> = {};
    snapshot.forEach((doc) => {
      models[doc.id] = doc.data();
    });

    const modelsByProviders = Object.values(models).reduce((acc, curr) => {
      if (!acc[curr.provider]) {
        acc[curr.provider] = { title: curr.provider, models: [] };
      }
      acc[curr.provider].models.push(curr);
      return acc;
    }, {});

    return { modelsByProviders, models: Object.values(models) };
  } catch (err) {
    console.error("getModels error:", err);
    return {};
  }
}
