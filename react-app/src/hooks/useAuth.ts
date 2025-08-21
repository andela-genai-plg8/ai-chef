// src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, onIdTokenChanged, User } from "firebase/auth";
import { useAppState } from "@/hooks/useAppState";

export function useAuth(currentRoute?: string) {
  // const [user, setUser] = useState<User | null>(null);
  const { previousPath, user, setPreviousPath, setUser, setAuthToken } = useAppState();

  if (currentRoute !== previousPath && currentRoute !== undefined) {
    setPreviousPath(currentRoute);
  }

  useEffect(() => {
    const auth = getAuth();
    // track user object
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const token = await u.getIdToken();
          setAuthToken(token);
        } catch (err) {
          setAuthToken(null);
        }
      } else {
        setAuthToken(null);
      }
    });

    // also listen for id token refreshes
    const unsubToken = onIdTokenChanged(auth, async (u) => {
      if (u) {
        try {
          const token = await u.getIdToken();
          setAuthToken(token);
        } catch (err) {
          setAuthToken(null);
        }
      } else {
        setAuthToken(null);
      }
    });

    return () => {
      unsubscribe();
      unsubToken();
    };
  }, []);

  return { user, previousPath };
}
