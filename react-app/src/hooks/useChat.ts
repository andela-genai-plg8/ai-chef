import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ChatMessage, SupportedModels } from "shared-types";
import { getAuth } from "firebase/auth";
import { useRecipes } from "./useRecipes";
import { useAppState } from "@/hooks/useAppState";
import { getModels } from "@/api/models";
import { sendChat } from "@/api/chat";
import { useModels } from "./useRecipeQuery";

export interface ChatStore {
  messages: ChatMessage[];
  currentModel?: string;
  sending: boolean;
  gettingModels: boolean;
  supportedModels: SupportedModels;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (msg: ChatMessage) => void;
  setCurrentModel: (model: string) => void;
  // setSupportedModels: (models: SupportedModels) => void;
  // getSupportedModels: () => Promise<SupportedModels>;
  sendMessage: (input?: string) => Promise<void>;
}

const CONTEXT_WINDOW_SIZE = 10;

const useChat = create<ChatStore>()(
  // persist(
  (set, get) => ({
    messages: [],
    sending: false,
    gettingModels: false,
    supportedModels: {},
    setMessages: (messages: ChatMessage[]) => set((state) => ({ ...state, messages })),
    addMessage: (msg: ChatMessage) =>
      set((state) => {
        const lastMsg = state.messages[state.messages.length - 1];
        if (lastMsg && lastMsg.role === "initial" && msg.role === "initial" && lastMsg.content === msg.content) {
          return {};
        }
        return { messages: [...state.messages, msg] };
      }),
    setCurrentModel: (model) => set({ currentModel: model }),
    // setSupportedModels: (supportedModels) => set({ supportedModels }),
    // getSupportedModels: async () => {
    //   const { data } = useModels();

    //   console.log("Supported Models:", data);

    //   return data as SupportedModels; // Placeholder for future implementation
    //   // const current = get().supportedModels;
    //   // if (current && Object.keys(current).length > 0) {
    //   //   return current;
    //   // }

    //   // set((state) => ({ ...state, gettingModels: true }));
    //   // try {
    //   //   const token = useAppState.getState().authToken ?? null;
    //   //   const data = await getModels(token);

    //   //   // get the name of the default model
    //   //   const currentModel = Object.values(data).reduce((acc: string, group: any) => {
    //   //     const modelGroup = group as {
    //   //       title: string;
    //   //       supported: boolean;
    //   //       models: { [modelId: string]: { name: string; default?: boolean } };
    //   //     };
    //   //     Object.keys(modelGroup.models).forEach((modelKey) => {
    //   //       const model = modelGroup.models[modelKey];
    //   //       if (model.default) {
    //   //         acc = model.name;
    //   //       }
    //   //     });
    //   //     return acc;
    //   //   }, "");

    //   //   set({ supportedModels: data, currentModel });
    //   //   return data;
    //   // } catch (err) {
    //   //   set({ supportedModels: {} });
    //   //   return {} as SupportedModels;
    //   // } finally {
    //   //   set((state) => ({ ...state, gettingModels: false }));
    //   // }
    // },
    sendMessage: async (prompt) => {
      const state = get();
      if (state.messages.length === 0 || state.sending) return;
      const userMsg = { role: "user", content: prompt || "" };

      // Change any role from 'initial' to 'user' before sending
      let newMessages = [...state.messages, userMsg]
        .map((msg) => (msg.role === "initial" ? { ...msg, role: "user" } : !msg.content ? { ...msg, content: "" } : msg))
        .filter((msg) => ["system", "assistant", "tool"].includes(msg.role) || msg.content?.length > 0);

      // Prevent consecutive 'initial' messages with same content
      newMessages = newMessages.filter((msg, idx, arr) => {
        if (idx > 0 && msg.role === "initial" && arr[idx - 1].role === "initial" && arr[idx - 1].content === msg.content) {
          return false;
        }
        return true;
      });

      try {
        const contextWindow = newMessages.slice(-CONTEXT_WINDOW_SIZE).map((m, i) => {
          return { ...m, __index: i };
        });
        set((state) => ({ ...state, sending: true }));

        // include Firebase ID token if user is signed in
        let token: string | null = null;
        try {
          // prefer app-level token set by useAuth
          token = useAppState.getState().authToken ?? null;
          if (!token) {
            const auth = getAuth();
            token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
          }
        } catch (e) {
          token = null;
        }

        const data = await sendChat({ prompt: prompt, context: contextWindow, model: state.currentModel }, token);

        const newState = get();
        const allMessages = [...newState.messages, ...data.history, { role: "assistant", content: data.messages || data.error }];
        newState.setMessages(allMessages);
        const recipeState = useRecipes.getState();
        if (data.recommendations && data.hasRecipeRecommendations) {
          recipeState.setIngredients(data.ingredients || []);
          recipeState.setSearchedRecipes(data.recommendations || []);
        }
      } catch (err) {
        const errorMsg = typeof err === "object" && err !== null && "message" in err ? (err as { message: string }).message : String(err);
        get().setMessages([...get().messages, { role: "assistant", content: "Error: " + errorMsg }]);
      } finally {
        set((state) => ({ ...state, sending: false }));
      }
    },
  })
  //   {
  //     name: "chat-storage",
  //     partialize: (state) => ({ messages: state.messages, currentModel: state.currentModel }),
  //   }
  // )
);

export default useChat;
