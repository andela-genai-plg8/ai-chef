// src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { useAppState } from "@/hooks/useAppState";

export function useAuth(currentRoute?: string) {
  // const [user, setUser] = useState<User | null>(null);
  const { previousPath, user, setPreviousPath, setUser } = useAppState();

  if (currentRoute !== previousPath && currentRoute !== undefined) {
    setPreviousPath(currentRoute);
  }

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  return { user, previousPath };
}
