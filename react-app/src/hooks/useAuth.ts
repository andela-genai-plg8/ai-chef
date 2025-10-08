// src/hooks/useAuth.ts
import { use, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, onIdTokenChanged, signOut, User } from "firebase/auth";
import { AppUser, useAppState } from "@/hooks/useAppState";
import { useQuery } from "@tanstack/react-query";
import { getUser } from "@/api/others";

export function useAuth(currentRoute?: string) {
  const { previousPath, user, setPreviousPath, setUser, setAuthToken } = useAppState();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['app-user', user?.uid],
    queryFn: async () => {
      if (user?.uid) {
        const a = await getUser(user?.uid || "");
        return a;
      }

      return null;
    }
  });

  if (currentRoute !== previousPath && currentRoute != "/login" && currentRoute !== undefined) {
    setPreviousPath(currentRoute);
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!isLoading) await refetch();
      const u = { ...user, ...data } as AppUser | null;
      setUser(u);
    };

    fetchData();
  }, [user?.uid, isLoading]);

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

  return {
    user, previousPath, setPreviousPath, signOut: () => {
      setUser(null);
      setAuthToken(null);
      return signOut(getAuth());
    }
  };
}
