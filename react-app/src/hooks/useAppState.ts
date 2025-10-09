import { create } from "zustand";

import type { User } from "firebase/auth";
import { getDictionary } from "@/api/dictionary";

export type AppUser = User & { roles?: string[] };

type AppState = {
  previousPath: string;
  setPreviousPath: (path: string) => void;
  user?: AppUser | null; // Assuming you're using Firebase for authentication
  setUser: (user: AppUser | null) => void;
  // store the current Firebase ID token when available
  authToken?: string | null;
  setAuthToken: (token: string | null) => void;
  words: { [word: string]: number };
  loadWords: () => void;
};

export const useAppState = create<AppState>(
  (set): AppState => ({
    previousPath: "/",
    setPreviousPath: (path: string) => set({ previousPath: path }),
    user: null,
    setUser: (user: User | null) => set({ user }),
    authToken: null,
    setAuthToken: (token: string | null) => set({ authToken: token }),
    words: {},
    loadWords: async () => {
      const words = await getDictionary();
      if (words) {
        set({ words });
      }
    },
  })
);
