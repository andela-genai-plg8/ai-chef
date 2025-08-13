import { create } from "zustand";
import { ChatMessage } from "@sharedTypes/ChatMessage";
import { SupportedModels } from "@sharedTypes/SupportedModels";



export interface ChatStore {
  messages: ChatMessage[];
  currentModel: string;
  sending: boolean;
  gettingModels: boolean;
  supportedModels: SupportedModels;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (msg: ChatMessage) => void;
  setCurrentModel: (model: string) => void;
  setSupportedModels: (models: SupportedModels) => void;
  getSupportedModels: () => Promise<SupportedModels>;
  sendMessage: (input?: string) => Promise<void>;
}
import axios from "axios";

const CONTEXT_WINDOW_SIZE = 10;

const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  currentModel: "gpt-gpt-4o",
  sending: false,
  gettingModels: false,
  supportedModels: {},
  setMessages: (messages: ChatMessage[]) => set({ messages }),
  addMessage: (msg: ChatMessage) =>
    set((state) => {
      const lastMsg = state.messages[state.messages.length - 1];
      if (lastMsg && lastMsg.sender === "initial" && msg.sender === "initial" && lastMsg.text === msg.text) {
        return {};
      }
      return { messages: [...state.messages, msg] };
    }),
  setCurrentModel: (model) => set({ currentModel: model }),
  setSupportedModels: (models) => set({ supportedModels: models }),
  getSupportedModels: (() => {
    let lastCall = 0;
    let pendingPromise: Promise<SupportedModels> | null = null;
    return async () => {
      const now = Date.now();
      if (pendingPromise && now - lastCall < 500) {
        return pendingPromise;
      }
      lastCall = now;
      const current = get().supportedModels;
      if (current && Object.keys(current).length > 0) {
        return current;
      }
      set((state) => ({ ...state, gettingModels: true }));
      pendingPromise = axios.get("/api/models")
        .then((res) => {
          set({ supportedModels: res.data });
          return res.data;
        })
        .catch(() => {
          set({ supportedModels: {} });
          return {};
        })
        .finally(() => {
          set((state) => ({ ...state, gettingModels: false }));
          pendingPromise = null;
        });
      return pendingPromise;
    };
  })(),
  sendMessage: async (input) => {
    const state = get();
    if (state.messages.length === 0 || state.sending) return;
    const userMsg = { sender: "user", text: input || "" };

    // Change any role from 'initial' to 'user' before sending
    let newMessages = [...state.messages, userMsg]
      .filter((msg) => msg.text?.length > 0)
      .map((msg) => (msg.sender === "initial" ? { ...msg, sender: "user" } : msg));

    // Prevent consecutive 'initial' messages with same text
    newMessages = newMessages.filter((msg, idx, arr) => {
      if (idx > 0 && msg.sender === "initial" && arr[idx - 1].sender === "initial" && arr[idx - 1].text === msg.text) {
        return false;
      }
      return true;
    });

    try {
      const contextWindow = newMessages.slice(-CONTEXT_WINDOW_SIZE);
      set((state) => ({ ...state, sending: true }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, context: contextWindow, model: get().currentModel }),
      });
      const data = await res.json();
      get().setMessages([...get().messages, { sender: "assistant", text: data.output || data.error }]);
    } catch (err) {
      const errorMsg = typeof err === "object" && err !== null && "message" in err ? (err as { message: string }).message : String(err);
      get().setMessages([...get().messages, { sender: "assistant", text: "Error: " + errorMsg }]);
    } finally {
      set((state) => ({ ...state, sending: false }));
    }
  },
}));

export default useChatStore;
