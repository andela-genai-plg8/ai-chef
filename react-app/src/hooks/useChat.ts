import { create } from "zustand";
import { ChatMessage, SupportedModels } from "shared-types";

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
import { useRecipes } from "./useRecipes";

const CONTEXT_WINDOW_SIZE = 10;

const useChat = create<ChatStore>((set, get) => ({
  messages: [],
  currentModel: "gpt-gpt-4o",
  sending: false,
  gettingModels: false,
  supportedModels: {},
  setMessages: (messages: ChatMessage[]) => set({ messages }),
  addMessage: (msg: ChatMessage) =>
    set((state) => {
      const lastMsg = state.messages[state.messages.length - 1];
      if (lastMsg && lastMsg.sender === "initial" && msg.sender === "initial" && lastMsg.content === msg.content) {
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
      pendingPromise = axios
        .get("/api/models")
        .then((res) => {
          // get the name of the default model
          const currentModel = Object.values(res.data).reduce((acc: string, group: any) => {
            const modelGroup = group as {
              title: string;
              supported: boolean;
              models: { [modelId: string]: { name: string; default?: boolean } };
            };
            Object.keys(modelGroup.models).forEach((modelKey) => {
              const model = modelGroup.models[modelKey];
              if (model.default) {
                acc = model.name;
              }
            });
            return acc;
          }, "");

          set({ supportedModels: res.data, currentModel });
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
  sendMessage: async (prompt) => {
    const state = get();
    if (state.messages.length === 0 || state.sending) return;
    const userMsg = { sender: "user", content: prompt || "" };

    // Change any role from 'initial' to 'user' before sending
    let newMessages = [...state.messages, userMsg]
      .filter((msg) => msg.content?.length > 0)
      .map((msg) => (msg.sender === "initial" ? { ...msg, sender: "user" } : msg));

    // Prevent consecutive 'initial' messages with same content
    newMessages = newMessages.filter((msg, idx, arr) => {
      if (idx > 0 && msg.sender === "initial" && arr[idx - 1].sender === "initial" && arr[idx - 1].content === msg.content) {
        return false;
      }
      return true;
    });

    try {
      const contextWindow = newMessages.slice(-CONTEXT_WINDOW_SIZE);
      set((state) => ({ ...state, sending: true }));

      const state = get();

      const res = await axios.post("/api/chat", {
        prompt: prompt,
        context: contextWindow,
        model: state.currentModel,
      });

      const data = res.data;
      const newState = get();
      newState.setMessages([...newState.messages, { sender: "assistant", content: data.messages || data.error }]);
      const recipeState = useRecipes.getState();
      if (data.recommendations) {
        recipeState.setIngredients(data.ingredients || []);
        recipeState.setSearchedRecipes(data.recommendations || []);
      }
    } catch (err) {
      const errorMsg = typeof err === "object" && err !== null && "message" in err ? (err as { message: string }).message : String(err);
      get().setMessages([...get().messages, { sender: "assistant", content: "Error: " + errorMsg }]);
    } finally {
      set((state) => ({ ...state, sending: false }));
    }
  },
}));

export default useChat;
