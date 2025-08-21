// src/api/models.ts
import axios from "axios";

export async function getModels(token?: string | null) {
  const res = await axios.get("/api/models", token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  return res.data;
}
