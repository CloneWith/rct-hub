"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { saveToken, clearToken, clearCachedUser, setCachedUser, graphqlRequest } from "@/app/lib/api";
import { MeDocument } from "@/app/lib/operations";
import { useMe, type AuthUser } from "@/app/lib/hooks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading: loading } = useMe();

  const login = useCallback(
    async (token: string) => {
      saveToken(token);
      const data = await queryClient.fetchQuery({
        queryKey: ["me"],
        queryFn: async () => {
          const res = await graphqlRequest(MeDocument);
          if (res.errors?.length) throw new Error(res.errors[0].message);
          return res.data?.me ?? null;
        },
        staleTime: 5 * 60 * 1000,
      });
      // Persist a lightweight profile so the next page refresh shows the
      // avatar / name immediately (no flicker).
      if (data) {
        setCachedUser({
          id: data.id,
          onlineID: data.onlineID,
          username: data.username,
          avatarUrl: data.avatarUrl,
          roles: data.roles as unknown as string[],
        });
      }
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    clearToken();
    clearCachedUser();
    queryClient.setQueryData(["me"], null);
    queryClient.invalidateQueries({ queryKey: ["me"] });
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user: user ?? null, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
