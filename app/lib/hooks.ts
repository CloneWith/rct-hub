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
  AnnouncementsDocument,
  RoomsDocument,
  MatchByCodeDocument,
} from "@/app/lib/operations";
import { toast } from "@heroui/react";
import type {
  MeQuery,
  UsersQuery,
  BeatmapsQuery,
  BeatmapByOsuIdQuery,
  AnnouncementsQuery,
  RoomsQuery,
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
  if (body.modString !== undefined) payload.mod_string = body.modString;
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
        type: filters.type ?? null,
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

/** Response of `POST /rooms` — the created room. */
export interface CreatedRoom {
  id: string;
  code: string;
  name: string;
  type: string;
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
}

/** Admin-only referee assignment (PATCH /rooms/:id/referee). */
export function useSetRoomReferee() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, refereeUserId }: { id: string; refereeUserId: number | null }) =>
      rooms.setReferee(id, refereeUserId).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
}

/** MP link update — admin or the designated referee of a match room. */
export function useSetRoomMPLink() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: ({ id, mpLink }: { id: string; mpLink: string }) =>
      rooms.setMpLink(id, { mp_link: mpLink }).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
}

/** Start the match of a room — admin or the designated referee. */
export function useStartRoomMatch() {
  const qc = useQueryClient();
  return useToastedMutation({
    mutationFn: (id: string) => rooms.startMatch(id).then(throwOnRestError),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
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
  room: { name: string; round: string } | null;
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
