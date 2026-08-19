"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  graphqlRequest,
  restFetch,
  getCachedUser,
  clearCachedUser,
  type RestResponse,
  type GraphQLResponse,
} from "./api";
import {
  MeDocument,
  UsersDocument,
  BeatmapsDocument,
  BeatmapByOsuIdDocument,
  AnnouncementsDocument,
} from "@/app/lib/operations";
import { toast } from "@heroui/react";
import type {
  MeQuery,
  UsersQuery,
  BeatmapsQuery,
  BeatmapByOsuIdQuery,
  AnnouncementsQuery,
} from "@/app/graphql/graphql";
import type { UserRole, VerifyStatus } from "@/app/graphql/graphql";

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
 * Returns `true` only after the component has hydrated on the client.
 *
 * The server render and the client's hydration render both observe `false`;
 * after hydration the client re-renders with `true`. Use this to gate
 * browser-only logic (localStorage, window, enabling queries) without
 * causing hydration mismatches.
 *
 * Implemented via `useSyncExternalStore` (React-recommended) rather than
 * `useState` + `useEffect(setState)`, which triggers cascading-renders
 * ESLint warnings.
 */
export function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * GraphQL query helper used by admin lists.
 * - Returns the selected data even when GraphQL reports errors, so partial
 *   results still render and the cache keeps the same shape as before.
 * - Shows a toast for any error message while keeping the query in success state.
 * - Throws only when no data is available at all.
 */
function useGraphQLData<T, R>(
  queryKey: QueryKey,
  fetch: () => Promise<GraphQLResponse<T>>,
  select: (data: T) => R,
  enabled: boolean,
) {
  const errorRef = useRef<string | null>(null);
  const lastToasted = useRef<string | null>(null);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch();
      const error = res.errors?.[0]?.message ?? null;
      errorRef.current = error;
      if (res.data === undefined) {
        throw new Error(error ?? "Request failed");
      }
      return select(res.data);
    },
    enabled,
  });

  useEffect(() => {
    const error = errorRef.current;
    if (error && error !== lastToasted.current) {
      toast.danger(error);
      lastToasted.current = error;
    } else if (!error && lastToasted.current) {
      lastToasted.current = null;
    }
  }, [query.dataUpdatedAt, query.errorUpdatedAt]);

  return { data: query.data, isLoading: query.isLoading };
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
  // Gate on hydration (not `typeof window !== "undefined"`) so that the
  // server render and client hydration produce identical query state.
  // Reading `localStorage` or enabling the query during SSR would cause a
  // hydration mismatch because the client's first render already has access
  // to `window` / `localStorage` while the server does not.
  const isClient = useIsClient();

  const cached = isClient ? getCachedUser() : null;

  const query = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const data = unwrap(await graphqlRequest(MeDocument));
      if (!data.me) {
        // No valid session cookie (or the session expired/revoked).
        // `me` returns null rather than an error, so treat it as signed out
        // and drop any stale cached profile.
        clearCachedUser();
        return null;
      }
      return data.me;
    },
    // The session is an HttpOnly cookie, which JS cannot detect — the query
    // must run on every mount and let the response decide the auth state.
    enabled: isClient,
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

  // Treat "not yet hydrated" as loading so consumers show a spinner instead
  // of rendering auth-dependent content that would mismatch between server
  // and client during hydration.
  return {
    ...query,
    isLoading: !isClient || query.isLoading,
  };
}

// =========================================================================
// Admin — Users
// =========================================================================

export function useUsers(enabled = true) {
  const { data, isLoading } = useGraphQLData(
    ["admin", "users"],
    () => graphqlRequest(UsersDocument, { page: 1, perPage: 50 }),
    (data) => data.users.items,
    enabled,
  );
  return { data: data ?? [], isLoading };
}

export function useUpdateUserRoles() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, roles }: { id: string; roles: string[] }) =>
      restFetch(`/users/${id}/roles`, {
        method: "PATCH",
        body: JSON.stringify({ roles: roles.map((r) => r.toLowerCase()) }),
      }).then(throwOnRestError),
    onMutate: async ({ id, roles }) => {
      await qc.cancelQueries({ queryKey: ["admin", "users"] });
      const prev = qc.getQueryData<UserItem[]>(["admin", "users"]);
      if (prev) {
        qc.setQueryData<UserItem[]>(["admin", "users"], (old) =>
          old?.map((u) =>
            u.id === id
              ? { ...u, roles: roles as UserRole[] }
              : u,
          ),
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin", "users"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useSetUserBanned() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, isBanned }: { id: string; isBanned: boolean }) =>
      restFetch(`/users/${id}/banned`, {
        method: "PATCH",
        body: JSON.stringify({ banned: isBanned }),
      }).then(throwOnRestError),
    onMutate: async ({ id, isBanned }) => {
      await qc.cancelQueries({ queryKey: ["admin", "users"] });
      const prev = qc.getQueryData<UserItem[]>(["admin", "users"]);
      if (prev) {
        qc.setQueryData<UserItem[]>(["admin", "users"], (old) =>
          old?.map((u) => (u.id === id ? { ...u, isBanned } : u)),
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin", "users"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useUpdateVerifyStatus() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, verifyStatus }: { id: string; verifyStatus: string }) =>
      restFetch(`/users/${id}/verify-status`, {
        method: "PATCH",
        body: JSON.stringify({ status: verifyStatus.toLowerCase() }),
      }).then(throwOnRestError),
    onMutate: async ({ id, verifyStatus }) => {
      await qc.cancelQueries({ queryKey: ["admin", "users"] });
      const prev = qc.getQueryData<UserItem[]>(["admin", "users"]);
      if (prev) {
        qc.setQueryData<UserItem[]>(["admin", "users"], (old) =>
          old?.map((u) =>
            u.id === id
              ? { ...u, verifyStatus: verifyStatus as VerifyStatus }
              : u,
          ),
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin", "users"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

// =========================================================================
// Admin — Beatmaps
// =========================================================================

// Maps the camelCase beatmap form values used by the admin UI to the
// snake_case keys expected by the REST API.
function buildBeatmapPayload(body: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (body.title !== undefined) payload.title = body.title;
  if (body.artist !== undefined) payload.artist = body.artist;
  if (body.version !== undefined) payload.version = body.version;
  if (body.status !== undefined) payload.status = body.status;
  if (body.difficultyRating !== undefined) payload.difficulty_rating = body.difficultyRating;
  if (body.modString !== undefined) payload.mod_string = body.modString;
  if (body.onlineID !== undefined) payload.id = body.onlineID;
  return payload;
}

// Same as `buildBeatmapPayload` but excludes the osu! beatmap id, which is
// immutable on the backend PATCH endpoint.
function buildBeatmapPatch(body: Record<string, unknown>): Record<string, unknown> {
  const { id: _id, ...patch } = buildBeatmapPayload(body);
  void _id;
  return patch;
}

export function useBeatmaps(enabled = true) {
  const { data, isLoading } = useGraphQLData(
    ["admin", "beatmaps"],
    () => graphqlRequest(BeatmapsDocument, { page: 1, perPage: 50 }),
    (data) => data.beatmaps.items,
    enabled,
  );
  return { data: data ?? [], isLoading };
}

/** Beatmap fetched by osu! id (from `BeatmapByOsuIdQuery`). */
export type FetchedBeatmap = NonNullable<BeatmapByOsuIdQuery["beatmapByOsuId"]>;

/**
 * Fetch beatmap metadata by osu! beatmap id. The backend resolver uses the
 * 3-tier fetcher (Redis → Mongo → osu! API): a cache miss pulls the map from
 * the osu! API and upserts the document, so the returned beatmap always has
 * a database `id` — subsequent saves should go through PATCH, not POST.
 */
export function useFetchBeatmapByOsuId() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: async (osuId: number): Promise<FetchedBeatmap> => {
      const res = await graphqlRequest(BeatmapByOsuIdDocument, { osuId });
      if (res.errors?.length) throw new Error(res.errors[0].message);
      const beatmap = res.data?.beatmapByOsuId;
      if (!beatmap) throw new Error("Beatmap not found");
      return beatmap;
    },
    // A cold fetch upserts the beatmap document, so the admin list may change.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "beatmaps"] }),
  });
}

export function useCreateBeatmap() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (body: Record<string, unknown>) =>
      restFetch("/beatmaps", { method: "POST", body: JSON.stringify(buildBeatmapPayload(body)) }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "beatmaps"] }),
  });
}

export function useUpdateBeatmap() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      restFetch(`/beatmaps/${id}`, { method: "PATCH", body: JSON.stringify(buildBeatmapPatch(body)) }).then(throwOnRestError),
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

function buildAnnouncementPayload(body: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (body.title !== undefined) payload.title = body.title;
  if (body.content !== undefined) payload.content = body.content;
  if (body.pinned !== undefined) payload.pinned = body.pinned;
  if (body.visible !== undefined) payload.visible = body.visible;
  // The visibility toggle currently sends `isVisibility`; normalise it to the
  // backend field name `visible`.
  if (body.isVisibility !== undefined) payload.visible = body.isVisibility;
  return payload;
}

export function useAnnouncements(enabled = true) {
  const { data, isLoading } = useGraphQLData(
    ["announcements"],
    () => graphqlRequest(AnnouncementsDocument, { page: 1, perPage: 50 }),
    (data) => data.announcements.items,
    enabled,
  );
  return { data: data ?? [], isLoading };
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (body: Record<string, unknown>) =>
      restFetch("/announcements", { method: "POST", body: JSON.stringify(buildAnnouncementPayload(body)) }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      restFetch(`/announcements/${id}`, { method: "PATCH", body: JSON.stringify(buildAnnouncementPayload(body)) }).then(throwOnRestError),
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
