"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { logoutSession, clearCachedUser, setCachedUser, graphqlRequest } from "@/app/lib/api";
import { MeDocument } from "@/app/lib/operations";
import { useMe, type AuthUser } from "@/app/lib/hooks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** Verifies the browser session cookie and hydrates the user profile. */
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
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
    async (): Promise<boolean> => {
      try {
        const data = await queryClient.fetchQuery({
          queryKey: ["me"],
          queryFn: async () => {
            const res = await graphqlRequest(MeDocument);
            if (res.errors?.length) throw new Error(res.errors[0].message);
            return res.data?.me ?? null;
          },
          staleTime: 5 * 60 * 1000,
        });
        if (!data) {
          // No usable session cookie (expired / revoked / missing).
          clearCachedUser();
          return false;
        }
        // Persist a lightweight profile so the next page refresh shows the
        // avatar / name immediately (no flicker).
        setCachedUser({
          id: data.id,
          onlineID: data.onlineID,
          username: data.username,
          avatarUrl: data.avatarUrl,
          roles: data.roles as unknown as string[],
        });
        return true;
      } catch {
        clearCachedUser();
        return false;
      }
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      // Revoke the server-side session and clear the HttpOnly cookie.
      await logoutSession();
    } catch {
      // If the backend is unreachable we still drop local auth state below.
    }
    clearCachedUser();
    queryClient.setQueryData(["me"], null);
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user: user ?? null, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
