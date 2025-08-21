// src/api/chat.ts
import axios from "axios";

export interface SendChatPayload {
  prompt?: string;
  context?: any[];
  model?: string;
}

export async function sendChat(payload: SendChatPayload, token?: string | null) {
  const res = await axios.post("/api/chat", payload, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  return res.data;
}

