import { create } from "zustand";

import type { User } from "firebase/auth";

type AppState = {
  previousPath: string;
  setPreviousPath: (path: string) => void;
  user?: User | null; // Assuming you're using Firebase for authentication
  setUser: (user: User | null) => void;
};

export const useAppState = create<AppState>(
  (set): AppState => ({
    previousPath: "/",
    setPreviousPath: (path: string) => set({ previousPath: path }),
    user: null,
    setUser: (user: User | null) => set({ user }),
  })
);
