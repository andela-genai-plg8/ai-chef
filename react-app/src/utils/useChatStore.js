import { create } from "zustand";
import axios from "axios";

const useChatStore = create((set, get) => ({
  messages: [],
  currentModel: "gpt-4o",
  supportedModels: {},
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setCurrentModel: (model) => set({ currentModel: model }),
  setSupportedModels: (models) => set({ supportedModels: models }),
  getSupportedModels: async () => {
    const current = get().supportedModels;
    if (current && Object.keys(current).length > 0) {
      return current;
    }
    try {
      const res = await axios.get("/api/models");
      set({ supportedModels: res.data });
      return res.data;
    } catch {
      set({ supportedModels: {} });
      return {};
    }
  },
}));

export default useChatStore;
