"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  graphqlRequest,
  restFetch,
  getToken,
  clearToken,
  getCachedUser,
  type RestResponse,
} from "./api";
import {
  MeDocument,
  UsersDocument,
  BeatmapsDocument,
  AnnouncementsDocument,
} from "@/app/lib/operations";
import { toast } from "@heroui/react";
import type {
  MeQuery,
  UsersQuery,
  BeatmapsQuery,
  AnnouncementsQuery,
} from "@/app/graphql/graphql";

// =========================================================================
// Types — derived from codegen-generated GraphQL types
// =========================================================================

/** Current user (from `MeQuery`). */
export type AuthUser = NonNullable<MeQuery["me"]>;

/** User list item (from `UsersQuery`). */
export type UserItem = UsersQuery["users"]["items"][number];

/** Beatmap list item (from `BeatmapsQuery`). */
export type BeatmapItem = BeatmapsQuery["beatmaps"]["items"][number];

/** Announcement list item (from `AnnouncementsQuery`). */
export type AnnouncementItem = AnnouncementsQuery["announcements"]["items"][number];

// =========================================================================
// Helpers
// =========================================================================

function unwrap<T>(res: { data?: T; errors?: Array<{ message: string }> }): T {
  if (res.errors?.length) throw new Error(res.errors[0].message);
  if (!res.data) throw new Error("Empty GraphQL response");
  return res.data;
}

function throwOnRestError<T>(res: RestResponse<T>): T {
  if (!res.success) throw new Error(res.error ?? "Request failed");
  return res.data as T;
}


/**
 * Mutation wrapper that shows a toast notification on error.
 * Success toasts are intentionally left to callers.
 */
function useToastedMutation<TData, TError = Error, TVariables = unknown, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
) {
  const opts: UseMutationOptions<TData, TError, TVariables, TContext> = {
    ...options,
    onError: (error, variables, onMutateResult, context) => {
      if (error instanceof Error) {
        toast.danger(error.message);
      }
      options.onError?.(error, variables, onMutateResult, context);
    },
  };
  return useMutation(opts);
}

// =========================================================================
// Auth
// =========================================================================

export function useMe() {
  const cached = typeof window !== "undefined" ? getCachedUser() : null;

  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const data = unwrap(await graphqlRequest(MeDocument));
      if (!data.me) {
        clearToken();
        return null;
      }
      return data.me;
    },
    enabled: typeof window !== "undefined" && !!getToken(),
    placeholderData: cached
      ? (): AuthUser | null => ({
          ...({ ...cached, roles: cached.roles as unknown as AuthUser["roles"] }),
          countryCode: "",
          verifyStatus: "PENDING" as AuthUser["verifyStatus"],
          isBanned: false,
          globalRank: 0,
          pp: 0,
        })
      : undefined,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

// =========================================================================
// Admin — Users
// =========================================================================

export function useUsers(enabled = true) {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const data = unwrap(
        await graphqlRequest(UsersDocument, { page: 1, perPage: 50 }),
      );
      return data.users.items;
    },
    enabled,
  });
}

export function useUpdateUserRoles() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, roles }: { id: string; roles: string[] }) =>
      restFetch(`/users/${id}/roles`, {
        method: "PATCH",
        body: JSON.stringify({ roles: roles.map((r) => r.toLowerCase()) }),
      }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useSetUserBanned() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, isBanned }: { id: string; isBanned: boolean }) =>
      restFetch(`/users/${id}/banned`, {
        method: "PATCH",
        body: JSON.stringify({ isBanned }),
      }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useUpdateVerifyStatus() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, verifyStatus }: { id: string; verifyStatus: string }) =>
      restFetch(`/users/${id}/verify-status`, {
        method: "PATCH",
        body: JSON.stringify({ verifyStatus: verifyStatus.toLowerCase() }),
      }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

// =========================================================================
// Admin — Beatmaps
// =========================================================================

export function useBeatmaps(enabled = true) {
  return useQuery({
    queryKey: ["admin", "beatmaps"],
    queryFn: async () => {
      const data = unwrap(
        await graphqlRequest(BeatmapsDocument, { page: 1, perPage: 50 }),
      );
      return data.beatmaps.items;
    },
    enabled,
  });
}

export function useCreateBeatmap() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (body: Record<string, unknown>) =>
      restFetch("/beatmaps", { method: "POST", body: JSON.stringify(body) }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "beatmaps"] }),
  });
}

export function useUpdateBeatmap() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      restFetch(`/beatmaps/${id}`, { method: "PUT", body: JSON.stringify(body) }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "beatmaps"] }),
  });
}

export function useDeleteBeatmap() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (id: string) =>
      restFetch(`/beatmaps/${id}`, { method: "DELETE" }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "beatmaps"] }),
  });
}

// =========================================================================
// Admin — Announcements
// =========================================================================

export function useAnnouncements(enabled = true) {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const data = unwrap(
        await graphqlRequest(AnnouncementsDocument, { page: 1, perPage: 50 }),
      );
      return data.announcements.items;
    },
    enabled,
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (body: Record<string, unknown>) =>
      restFetch("/announcements", { method: "POST", body: JSON.stringify(body) }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      restFetch(`/announcements/${id}`, { method: "PUT", body: JSON.stringify(body) }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (id: string) =>
      restFetch(`/announcements/${id}`, { method: "DELETE" }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function usePublishAnnouncement() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (id: string) =>
      restFetch(`/announcements/${id}/publish`, { method: "POST" }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}
