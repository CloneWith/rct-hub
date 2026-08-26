"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type QueryKey,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  graphqlRequest,
  restFetch,
  rooms,
  getCachedUser,
  clearCachedUser,
  type RoomMetadataInput,
  type RestResponse,
  type GraphQLResponse,
} from "./api";
import { revalidateAnnouncements } from "./revalidate";
import {
  MeDocument,
  UsersDocument,
  BeatmapsDocument,
  BeatmapByOsuIdDocument,
  TeamsDocument,
  MappoolsDocument,
  UserByOsuIdDocument,
  AnnouncementsDocument,
  RoomsDocument,
  RoomByCodeDocument,
  MatchByCodeDocument,
  IrcConnectionStatusDocument,
  IrcObservationsDocument,
  IrcJobsDocument,
} from "@/app/lib/operations";
import { toast } from "@heroui/react";
import type {
  MeQuery,
  UsersQuery,
  BeatmapsQuery,
  BeatmapByOsuIdQuery,
  TeamsQuery,
  MappoolsQuery,
  UserByOsuIdQuery,
  AnnouncementsQuery,
  RoomsQuery,
  RoomByCodeQuery,
} from "@/app/graphql/graphql";
import type { UserRole, VerifyStatus, MatchLifecycle, RoomType } from "@/app/graphql/graphql";

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

/** Team list item (from `TeamsQuery`). */
export type TeamItem = TeamsQuery["teams"]["items"][number];

/** Mappool list item (from `MappoolsQuery`). */
export type MappoolItem = MappoolsQuery["mappools"]["items"][number];

/** Mappool entry inside a `MappoolItem`. */
export type MappoolEntryItem = NonNullable<MappoolItem["entries"][number]>;

/** User fetched through `userByOsuId` (fetch-through upsert, D4). */
export type FetchedUser = NonNullable<UserByOsuIdQuery["userByOsuId"]>;

/** Generic paginated result — matches the GraphQL `*Page` shape. */
export interface PagedResult<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

// =========================================================================
// Helpers
// =========================================================================

function unwrap<T>(res: { data?: T; errors?: Array<{ message: string }> }): T {
  if (res.errors?.length) throw new Error(res.errors[0].message);
  if (!res.data) throw new Error("Empty GraphQL response");
  return res.data;
}

function throwOnRestError<T>(res: RestResponse<T>): T {
  if (!res.success) {
    // Merge field-level validation details (e.g. start-match missing
    // requirements) into the message so the toast maps the failure to the
    // concrete fields instead of a generic "invalid input".
    const detailText = (res.details ?? [])
      .map((d) => d.message)
      .filter((m): m is string => !!m)
      .join("；");
    throw new Error(detailText ? `${res.error ?? "Request failed"}：${detailText}` : (res.error ?? "Request failed"));
  }
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
 * Paged GraphQL query helper used by admin lists.
 *
 * The `select` function must return a full `PagedResult<R>` (i.e. the GraphQL
 * `*Page` object with `items`, `page`, `perPage`, `total`, `totalPages`).
 * Uses `keepPreviousData` so the table keeps showing the old page while the
 * next page loads, avoiding a flash of empty content.
 */
function useGraphQLPaged<T, R>(
  queryKey: QueryKey,
  fetch: () => Promise<GraphQLResponse<T>>,
  select: (data: T) => PagedResult<R>,
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
    placeholderData: keepPreviousData,
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

export function useUsers(enabled = true, page = 1, perPage = 20) {
  const { data, isLoading } = useGraphQLPaged(
    ["admin", "users", page, perPage],
    () => graphqlRequest(UsersDocument, { page, perPage }),
    (data) => data.users,
    enabled,
  );
  return {
    data: data?.items ?? [],
    pagination: data
      ? { page: data.page, perPage: data.perPage, total: data.total, totalPages: data.totalPages }
      : null,
    isLoading,
  };
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
      const previousQueries = qc.getQueriesData<PagedResult<UserItem>>({ queryKey: ["admin", "users"] });
      qc.setQueriesData<PagedResult<UserItem>>({ queryKey: ["admin", "users"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((u) =>
            u.id === id
              ? { ...u, roles: roles as UserRole[] }
              : u,
          ),
        };
      });
      return { previousQueries };
    },
    onError: (_e, _v, ctx) => {
      ctx?.previousQueries?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
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
      const previousQueries = qc.getQueriesData<PagedResult<UserItem>>({ queryKey: ["admin", "users"] });
      qc.setQueriesData<PagedResult<UserItem>>({ queryKey: ["admin", "users"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((u) => (u.id === id ? { ...u, isBanned } : u)),
        };
      });
      return { previousQueries };
    },
    onError: (_e, _v, ctx) => {
      ctx?.previousQueries?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
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
      const previousQueries = qc.getQueriesData<PagedResult<UserItem>>({ queryKey: ["admin", "users"] });
      qc.setQueriesData<PagedResult<UserItem>>({ queryKey: ["admin", "users"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((u) =>
            u.id === id
              ? { ...u, verifyStatus: verifyStatus as VerifyStatus }
              : u,
          ),
        };
      });
      return { previousQueries };
    },
    onError: (_e, _v, ctx) => {
      ctx?.previousQueries?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
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
  if (body.onlineID !== undefined) payload.id = Number(body.onlineID);
  return payload;
}

// Same as `buildBeatmapPayload` but excludes the osu! beatmap id, which is
// immutable on the backend PATCH endpoint.
function buildBeatmapPatch(body: Record<string, unknown>): Record<string, unknown> {
  const { id: _id, ...patch } = buildBeatmapPayload(body);
  void _id;
  return patch;
}

export function useBeatmaps(enabled = true, page = 1, perPage = 20) {
  const { data, isLoading } = useGraphQLPaged(
    ["admin", "beatmaps", page, perPage],
    () => graphqlRequest(BeatmapsDocument, { page, perPage }),
    (data) => data.beatmaps,
    enabled,
  );
  return {
    data: data?.items ?? [],
    pagination: data
      ? { page: data.page, perPage: data.perPage, total: data.total, totalPages: data.totalPages }
      : null,
    isLoading,
  };
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
// Admin — Teams
// =========================================================================

/** Editable team form state shared by the create and edit modals. */
export interface TeamForm {
  name: string;
  description: string;
  seed: string;
  leaderID: number | null;
  strategistID: number | null;
  playerIDs: number[];
}

/**
 * Build the REST team payload. The form is always submitted wholesale: every
 * field is sent so PATCH semantics ("omitted = unchanged") degrade to a full
 * replace. `leader_id`/`strategist_id` are omitted when unset — the backend
 * patch type does not support null-clearing.
 */
function buildTeamPayload(f: TeamForm): Record<string, unknown> {
  const payload: Record<string, unknown> = { name: f.name };
  payload.description = f.description;
  payload.seed = f.seed;
  if (f.leaderID != null) payload.leader_id = Number(f.leaderID);
  if (f.strategistID != null) payload.strategist_id = Number(f.strategistID);
  payload.players = f.playerIDs.map(Number);
  return payload;
}

export function useTeams(enabled = true, page = 1, perPage = 20, search = "") {
  const { data, isLoading } = useGraphQLPaged(
    ["admin", "teams", page, perPage, search],
    () => graphqlRequest(TeamsDocument, { page, perPage, search: search || undefined }),
    (data) => data.teams,
    enabled,
  );
  return {
    data: data?.items ?? [],
    pagination: data
      ? { page: data.page, perPage: data.perPage, total: data.total, totalPages: data.totalPages }
      : null,
    isLoading,
  };
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (body: TeamForm) =>
      restFetch("/teams", { method: "POST", body: JSON.stringify(buildTeamPayload(body)) }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "teams"] }),
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, ...body }: { id: string } & TeamForm) =>
      restFetch(`/teams/${id}`, { method: "PATCH", body: JSON.stringify(buildTeamPayload(body)) }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "teams"] }),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (id: string) =>
      restFetch(`/teams/${id}`, { method: "DELETE" }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "teams"] }),
  });
}

// =========================================================================
// Admin — Mappools
// =========================================================================

/**
 * REST wire values for `domain.PieceMod`. The GraphQL enum uppercases
 * everything (SHIRO) but the domain constant is mixed-case ("Shiro"), so
 * REST submissions must be translated back.
 */
const REST_MOD_BY_ENUM: Record<string, string> = {
  NM: "NM",
  HD: "HD",
  HR: "HR",
  DT: "DT",
  FM: "FM",
  SHIRO: "Shiro",
  TB: "TB",
};

/** Editable mappool entry in the admin form. `index` is derived on save. */
export interface MappoolEntryForm {
  mod: string; // GraphQL enum value (NM/HD/HR/DT/FM/SHIRO/TB)
  beatmapID: number | null; // null for SHIRO slots
  selectorID: number | null;
  skill: string;
}

/** Editable mappool form state shared by the create and edit modals. */
export interface MappoolForm {
  name: string;
  description: string;
  entries: MappoolEntryForm[];
}

/**
 * Build the REST mappool payload. Entry indexes are derived from the list
 * order: entries are numbered 1..n per mod group following their appearance
 * order, which keeps (mod, index) unique without asking the admin to manage
 * indexes by hand.
 */
function buildMappoolPayload(f: MappoolForm): Record<string, unknown> {
  const counters = new Map<string, number>();
  const entries = f.entries.map((e) => {
    const index = (counters.get(e.mod) ?? 0) + 1;
    counters.set(e.mod, index);
    const entry: Record<string, unknown> = {
      mod: REST_MOD_BY_ENUM[e.mod] ?? e.mod,
      index,
    };
    if (e.beatmapID != null) entry.beatmap_id = Number(e.beatmapID);
    if (e.selectorID != null) entry.selector_id = Number(e.selectorID);
    if (e.skill) entry.skill = e.skill;
    return entry;
  });
  return { name: f.name, description: f.description, entries };
}

export function useMappools(enabled = true, page = 1, perPage = 20, search = "") {
  const { data, isLoading } = useGraphQLPaged(
    ["admin", "mappools", page, perPage, search],
    () => graphqlRequest(MappoolsDocument, { page, perPage, search: search || undefined }),
    (data) => data.mappools,
    enabled,
  );
  return {
    data: data?.items ?? [],
    pagination: data
      ? { page: data.page, perPage: data.perPage, total: data.total, totalPages: data.totalPages }
      : null,
    isLoading,
  };
}

export function useCreateMappool() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (body: MappoolForm) =>
      restFetch("/mappools", { method: "POST", body: JSON.stringify(buildMappoolPayload(body)) }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "mappools"] }),
  });
}

export function useUpdateMappool() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, ...body }: { id: string } & MappoolForm) =>
      restFetch(`/mappools/${id}`, { method: "PATCH", body: JSON.stringify(buildMappoolPayload(body)) }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "mappools"] }),
  });
}

export function useDeleteMappool() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (id: string) =>
      restFetch(`/mappools/${id}`, { method: "DELETE" }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "mappools"] }),
  });
}

// =========================================================================
// Admin — Users (add via osu! id)
// =========================================================================

/**
 * Fetch a user by osu! user id through the 3-tier fetcher
 * (Redis → Mongo → osu! API). A cache miss pulls the profile from the osu!
 * API and upserts the document, so this doubles as the admin "add user"
 * action (D4): the user list is invalidated to surface the new row.
 */
export function useFetchUserByOsuId() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: async (osuId: number): Promise<FetchedUser> => {
      const res = await graphqlRequest(UserByOsuIdDocument, { osuId });
      if (res.errors?.length) throw new Error(res.errors[0].message);
      const user = res.data?.userByOsuId;
      if (!user) throw new Error("User not found");
      return user;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
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

/**
 * Invalidate the admin announcement list (react-query) and the server-side
 * ISR Data Cache (homepage news feed + /news) after a successful write.
 *
 * The server action is fire-and-forget: cache invalidation must not block the
 * admin UI, and a failure only delays the public pages refreshing — the 60s
 * ISR window still applies as a fallback.
 */
function invalidateAnnouncements(qc: ReturnType<typeof useQueryClient>): void {
  void qc.invalidateQueries({ queryKey: ["announcements"] });
  void revalidateAnnouncements().catch((err) =>
    console.error("Failed to revalidate announcements cache:", err),
  );
}

export function useAnnouncements(enabled = true, page = 1, perPage = 20) {
  const { data, isLoading } = useGraphQLPaged(
    ["announcements", page, perPage],
    () => graphqlRequest(AnnouncementsDocument, { page, perPage }),
    (data) => data.announcements,
    enabled,
  );
  return {
    data: data?.items ?? [],
    pagination: data
      ? { page: data.page, perPage: data.perPage, total: data.total, totalPages: data.totalPages }
      : null,
    isLoading,
  };
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (body: Record<string, unknown>) =>
      restFetch("/announcements", { method: "POST", body: JSON.stringify(buildAnnouncementPayload(body)) }).then(throwOnRestError),
    onSuccess: () => invalidateAnnouncements(qc),
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      restFetch(`/announcements/${id}`, { method: "PATCH", body: JSON.stringify(buildAnnouncementPayload(body)) }).then(throwOnRestError),
    onSuccess: () => invalidateAnnouncements(qc),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (id: string) =>
      restFetch(`/announcements/${id}`, { method: "DELETE" }).then(throwOnRestError),
    onSuccess: () => invalidateAnnouncements(qc),
  });
}

export function usePublishAnnouncement() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (id: string) =>
      restFetch(`/announcements/${id}/publish`, { method: "POST" }).then(throwOnRestError),
    onSuccess: () => invalidateAnnouncements(qc),
  });
}

// =========================================================================
// Rooms
// =========================================================================

/** Room list item (from `RoomsQuery`). */
export type RoomListItem = RoomsQuery["rooms"]["items"][number];

/** Filters accepted by `useRooms` — all optional, combined server-side. */
export interface RoomFilters {
  search?: string;
  type?: RoomType;
  round?: string;
  status?: MatchLifecycle;
  relatedToMe?: boolean;
}

/**
 * Paged, filterable room list. The backend `rooms` query is gated by
 * `privateViewer` (authenticated + verified + not banned); unauthorised
 * callers receive a GraphQL error rather than an empty list.
 */
export function useRooms(
  enabled: boolean,
  filters: RoomFilters,
  page = 1,
  perPage = 20,
) {
  const { data, isLoading } = useGraphQLPaged(
    ["rooms", filters, page, perPage],
    () =>
      graphqlRequest(RoomsDocument, {
        search: filters.search || null,
        round: filters.round || null,
        status: filters.status ?? null,
        relatedToMe: filters.relatedToMe ?? false,
        page,
        perPage,
      }),
    (data) => data.rooms,
    enabled,
  );
  return {
    data: data?.items ?? [],
    pagination: data
      ? { page: data.page, perPage: data.perPage, total: data.total, totalPages: data.totalPages }
      : null,
    isLoading,
  };
}

/** Full room configuration for the pre-game setup page (M4). */
export type RoomSetup = NonNullable<RoomByCodeQuery["roomByCode"]>;

/**
 * Full room by invite code. The pre-game setup page (M4) uses this instead of
 * the list query because it needs the mappool, BP order and resolved member
 * users. `enabled` mirrors the `useMatchByCode` convention (gated on login).
 */
export function useRoomByCode(code: string, enabled = true) {
  const isClient = useIsClient();
  return useQuery({
    queryKey: ["room", code],
    queryFn: () => graphqlRequest(RoomByCodeDocument, { code }).then((res) => unwrap(res)),
    select: (res) => res.roomByCode,
    enabled: isClient && enabled && code.length > 0,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/** Response of `POST /rooms` — the created room. */
export interface CreatedRoom {
  id: string;
  code: string;
  name: string;
  type: string;
}

/**
 * Invalidate both the room list (`["rooms"]`) and the setup page
 * (`["room", code]` — prefix match) after a room mutation.
 */
function invalidateRoomQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["rooms"] });
  void qc.invalidateQueries({ queryKey: ["room"] });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (body: { name: string; type: RoomType }) =>
      rooms.create({ name: body.name, type: body.type.toLowerCase() }).then(
        (res) => throwOnRestError(res as RestResponse<CreatedRoom>),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
}

/** Admin-only partial metadata update (PUT /rooms/:id/metadata). */
export function useUpdateRoomMetadata() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, ...body }: RoomMetadataInput & { id: string }) =>
      rooms.updateMetadata(id, body).then(throwOnRestError),
    onSuccess: () => invalidateRoomQueries(qc),
  });
}

/** Admin-only referee assignment (PATCH /rooms/:id/referee). */
export function useSetRoomReferee() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, refereeUserId }: { id: string; refereeUserId: number | null }) =>
      rooms.setReferee(id, refereeUserId).then(throwOnRestError),
    onSuccess: () => invalidateRoomQueries(qc),
  });
}

/** Red/blue strategist assignment (PATCH /rooms/:id/strategists). */
export function useSetRoomTeams() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, redTeamId, blueTeamId }: { id: string; redTeamId: string | null; blueTeamId: string | null }) =>
      rooms.setTeams(id, { red_team_id: redTeamId, blue_team_id: blueTeamId }).then(throwOnRestError),
    onSuccess: () => invalidateRoomQueries(qc),
  });
}

/** Streamer assignment (PATCH /rooms/:id/streamer). */
export function useSetRoomStreamer() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, streamerUserId }: { id: string; streamerUserId: number | null }) =>
      rooms.setStreamer(id, { streamer_user_id: streamerUserId }).then(throwOnRestError),
    onSuccess: () => invalidateRoomQueries(qc),
  });
}

/** Pick/ban order (PATCH /rooms/:id/bp-order). */
export function useSetRoomBpOrder() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({
      id,
      firstPick,
      firstBan,
    }: {
      id: string;
      firstPick: "red" | "blue";
      firstBan: "red" | "blue";
    }) =>
      rooms.setBpOrder(id, { first_pick: firstPick, first_ban: firstBan }).then(throwOnRestError),
    onSuccess: () => invalidateRoomQueries(qc),
  });
}

/** Team rosters + leaders (PATCH /rooms/:id/players). */
/** MP link update — admin or the designated referee of a match room. */
export function useSetRoomMPLink() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, mpLink }: { id: string; mpLink: string }) =>
      rooms.setMpLink(id, { mp_link: mpLink }).then(throwOnRestError),
    onSuccess: () => invalidateRoomQueries(qc),
  });
}

/** Stream link update (PATCH /rooms/:id/stream-link). */
export function useSetRoomStreamLink() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, streamLink }: { id: string; streamLink: string }) =>
      rooms.setStreamLink(id, { stream_link: streamLink }).then(throwOnRestError),
    onSuccess: () => invalidateRoomQueries(qc),
  });
}

/** Replace the full pre-game mappool (PATCH /rooms/:id/mappool). */
export function useSetRoomMappool() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, mappoolId }: { id: string; mappoolId: string | null }) =>
      rooms.setMappool(id, mappoolId).then(throwOnRestError),
    onSuccess: () => invalidateRoomQueries(qc),
  });
}

/** Start the match of a room — admin or the designated referee. */
export function useStartRoomMatch() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (id: string) => rooms.startMatch(id).then(throwOnRestError),
    onSuccess: () => invalidateRoomQueries(qc),
  });
}

// =========================================================================
// Match (board screen)
// =========================================================================

export type MatchByCodeResult = {
  id: string;
  code: string;
  name: string;
  roomType: string;
  room: { name: string; round: string; settings: { mpLink: string | null } } | null;
  pool: Array<{
    poolSlotID: string;
    metadataStatus: string;
    beatmap: {
      onlineID: string;
      title: string;
      artist: string;
      difficultyName: string;
      starRating: number;
      bpm: number;
      totalLength: number;
      coverUrl: string;
    } | null;
  }>;
  snapshot: {
    version: string;
    lifecycle: string;
    phase: string;
    turn: number;
    activeTeam: string | null;
    wonCounts: { red: number; blue: number };
  };
  /** Non-null when the current user is the strategist of this room. */
  strategistView: MatchActorView | null;
  /** Non-null when the current user is a team leader of this room. */
  captainView: MatchActorView | null;
  /** Non-null when the current user is the assigned referee (or admin). */
  refereeView: MatchRefereeView | null;
};

export type MatchAuditActor = {
  osuID: string;
  capability: "STRATEGIST" | "CAPTAIN" | "REFEREE";
  team: "RED" | "BLUE" | null;
  adminOverride: boolean;
  refereeOverride: boolean;
};

export type MatchAuditEntry = {
  actionId: string;
  sequence: string;
  actor: MatchAuditActor;
  commandType: string;
  previousVersion: string;
  resultingVersion: string;
  timestamp: string;
  reason: string | null;
};

export type MatchAutomationIssue = {
  eventID: string;
  sequence: string;
  eventType: string;
  attempts: number;
  lastError: string;
  occurredAt: string;
};

export type MatchRefereeView = {
  matchID: string;
  analysis: MatchActorAnalysis;
  suspensionReason: string | null;
  abortReason: string | null;
  auditLog: MatchAuditEntry[];
  automationIssues: MatchAutomationIssue[];
};

export type MatchIrcConnectionStatus = {
  configured: boolean;
  connected: boolean;
  degraded: boolean;
  lastError: string | null;
};

export type MatchIrcObservation = {
  id: string;
  channel: string;
  sender: string;
  command: string;
  raw: string;
  observedAt: string;
  reviewStatus: "PENDING" | "CONFIRMING" | "CONFIRMED" | "REJECTED";
  reviewReason: string | null;
  suggestedResult: { winningTeam: "RED" | "BLUE"; boardPieceID: string } | null;
};

export type MatchIrcJob = {
  id: string;
  channel: string;
  kind: string;
  payload: string;
  status:
    | "PENDING"
    | "SENDING"
    | "SENT"
    | "ACKNOWLEDGED"
    | "FAILED"
    | "CANCELLED";
  attempts: number;
  automaticRetry: boolean;
  nextTryAt: string | null;
  sentAt: string | null;
  ackDeadline: string | null;
  acknowledgedAt: string | null;
  lastError: string | null;
};

export type MatchAction =
  | "START_MATCH"
  | "BAN_POOL_SLOT"
  | "PLACE_PIECE"
  | "PLACE_SHIRO"
  | "ROB_PIECE"
  | "CONFIRM_BEATMAP_RESULT"
  | "GRANT_ADDITIONAL_TIME"
  | "CALIBRATE_TIMER"
  | "PAUSE_TIMER"
  | "RESUME_TIMER"
  | "SUSPEND_MATCH"
  | "RESUME_MATCH"
  | "SKIP_CURRENT_ACTION"
  | "ABORT_MATCH"
  | "REQUEST_TB"
  | "RESPOND_TB_REQUEST"
  | "START_TB"
  | "CONFIRM_TB_RESULT"
  | "RECORD_SURRENDER";

export type MatchLegalPlacement = {
  poolSlotID: string;
  cell: string;
  forceMod: "NM" | "HD" | "HR" | null;
};

export type MatchRobberyPlan = {
  targetPieceID: string;
  sacrificeSets: string[][];
};

export type MatchActorAnalysis = {
  allowedActions: MatchAction[];
  banPoolSlotIDs: string[];
  legalPlacements: MatchLegalPlacement[];
  shiroCells: string[];
  robberyPlans: MatchRobberyPlan[];
  pendingTBRequestID: string | null;
  canAcceptTBRequest: boolean;
  canRejectTBRequest: boolean;
  tbRequestTeams: ("RED" | "BLUE")[];
  tbResponseTeams: ("RED" | "BLUE")[];
};

export type MatchActorView = {
  isMyTurn?: boolean;
  myTeam: "RED" | "BLUE";
  analysis: MatchActorAnalysis;
};

/**
 * Board screen bootstrap: resolves a formal match by room code (the match
 * code mirrors the room code) and returns identity, pool metadata and an
 * initial snapshot for first paint. The WS channel takes over live updates.
 */
export function useMatchByCode(code: string, enabled = true) {
  return useQuery({
    queryKey: ["match", code],
    queryFn: async () => {
      const res = await graphqlRequest(MatchByCodeDocument, { code });
      if (res.errors?.length) throw new Error(res.errors[0].message);
      return res.data?.matchByCode ?? null;
    },
    enabled: enabled && Boolean(code),
    retry: 1,
  });
}

/**
 * IRC connection status for the referee console (M3). Polled — the IRC
 * gateway state changes from the outside (bot connect/disconnect).
 */
export function useIrcConnectionStatus(matchId: string, enabled = true) {
  return useQuery({
    queryKey: ["match", matchId, "irc", "status"],
    queryFn: async () => {
      const res = await graphqlRequest(IrcConnectionStatusDocument, { matchId });
      if (res.errors?.length) throw new Error(res.errors[0].message);
      return res.data?.ircConnectionStatus ?? null;
    },
    enabled: enabled && Boolean(matchId),
    refetchInterval: 15_000,
    retry: 1,
  });
}

/**
 * IRC result observations (M3). Pending observations need a timely surface,
 * so the poll is faster. `channel` is derived from the room MP link; without
 * it the query is disabled (the backend requires a channel argument).
 */
export function useIrcObservations(
  matchId: string,
  channel: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["match", matchId, "irc", "observations", channel],
    queryFn: async () => {
      const res = await graphqlRequest(IrcObservationsDocument, {
        matchId,
        channel: channel ?? "",
      });
      if (res.errors?.length) throw new Error(res.errors[0].message);
      return res.data?.ircObservations ?? [];
    },
    enabled: enabled && Boolean(matchId) && Boolean(channel),
    refetchInterval: 10_000,
    retry: 1,
  });
}

/** IRC send jobs for the referee console (M3); polled for failed-job retries. */
export function useIrcJobs(matchId: string, enabled = true) {
  return useQuery({
    queryKey: ["match", matchId, "irc", "jobs"],
    queryFn: async () => {
      const res = await graphqlRequest(IrcJobsDocument, { matchId });
      if (res.errors?.length) throw new Error(res.errors[0].message);
      return res.data?.ircJobs ?? [];
    },
    enabled: enabled && Boolean(matchId),
    refetchInterval: 15_000,
    retry: 1,
  });
}
