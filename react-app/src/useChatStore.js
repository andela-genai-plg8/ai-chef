import { create } from 'zustand';

// Import or define your models object here
// Example import (adjust path as needed):
// import { MODELS } from '../../functions/src/utils/models';

// For demonstration, a minimal MODELS structure:
const MODELS = {
  gpt: {
    'gpt-4o': {},
    'gpt-3.5-turbo': {}
  },
  gemini: {
    'gemini-1.5-pro': {}
  }
};

function flattenModels(models) {
  return Object.entries(models).flatMap(([group, groupModels]) =>
    Object.keys(groupModels).map((model) => ({ group, model }))
  );
}

export const useChatStore = create((set, get) => ({
  messages: [],
  currentModel: 'gpt-4o',
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setCurrentModel: (model) => set({ currentModel: model }),
  getSupportedModels: () => flattenModels(MODELS),
}));
