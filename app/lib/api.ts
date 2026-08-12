/**
 * RCT Hub API Client
 *
 * Provides unified access to the backend REST and GraphQL APIs.
 * - REST: used for auth, room setup, and admin CRUD.
 * - GraphQL: used for reads, match views, and in-match commands.
 *
 * GraphQL queries are defined in `app/graphql/operations.ts` using the
 * codegen-generated `graphql()` tag. Each query is a `TypedDocumentString`
 * that this module's `graphqlRequest` accepts for end-to-end type safety.
 *
 * Backend base: http://localhost:8080
 */

import type { TypedDocumentString } from "@/app/graphql/graphql";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
const API_PREFIX = `${API_BASE}/api/v1`;
const GRAPHQL_URL = `${API_BASE}/graphql`;

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("rcthub_token");
}

export function saveToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("rcthub_token", token);
  }
}

export function clearToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("rcthub_token");
  }
}

// ---------------------------------------------------------------------------
// User profile cache — eliminates SSR hydration flicker
// ---------------------------------------------------------------------------

export interface CachedUser {
  id: string;
  onlineID: number;
  username: string;
  avatarUrl: string;
  roles: string[];
}

const USER_CACHE_KEY = "rcthub_user";

export function getCachedUser(): CachedUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedUser) : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user: CachedUser): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  }
}

export function clearCachedUser(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_CACHE_KEY);
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ---------------------------------------------------------------------------
// REST helpers
// ---------------------------------------------------------------------------

export interface RestResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function restFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<RestResponse<T>> {
  const url = path.startsWith("http") ? path : `${API_PREFIX}${path}`;
  const headers = { ...(await authHeaders()), ...((options.headers as Record<string, string>) || {}) };
  const res = await fetch(url, { ...options, headers });

  if (res.status === 204) {
    return { success: true };
  }

  const json = await res.json();
  if (!res.ok) {
    return { success: false, error: json.error || `HTTP ${res.status}` };
  }
  return json as RestResponse<T>;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export function getOsuLoginUrl(): string {
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
  const redirectUri = encodeURIComponent(`${frontendUrl}/auth/callback`);
  return `${API_BASE}/auth/osu?redirect_uri=${redirectUri}`;
}

export function logout(): void {
  clearToken();
}

/**
 * Call this from the /auth/callback page. Expects `?token=<jwt>`.
 */
export function handleAuthCallback(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    saveToken(token);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// REST — Rooms (pre-game setup)
// ---------------------------------------------------------------------------

export const rooms = {
  create: (body: Record<string, unknown>) =>
    restFetch("/rooms", { method: "POST", body: JSON.stringify(body) }),

  setStrategists: (id: string, body: Record<string, unknown>) =>
    restFetch(`/rooms/${id}/strategists`, { method: "PATCH", body: JSON.stringify(body) }),

  setStreamer: (id: string, body: Record<string, unknown>) =>
    restFetch(`/rooms/${id}/streamer`, { method: "PATCH", body: JSON.stringify(body) }),

  setBpOrder: (id: string, body: Record<string, unknown>) =>
    restFetch(`/rooms/${id}/bp-order`, { method: "PATCH", body: JSON.stringify(body) }),

  setPlayers: (id: string, body: Record<string, unknown>) =>
    restFetch(`/rooms/${id}/players`, { method: "PATCH", body: JSON.stringify(body) }),

  setMpLink: (id: string, body: Record<string, unknown>) =>
    restFetch(`/rooms/${id}/mp-link`, { method: "PATCH", body: JSON.stringify(body) }),

  setStreamLink: (id: string, body: Record<string, unknown>) =>
    restFetch(`/rooms/${id}/stream-link`, { method: "PATCH", body: JSON.stringify(body) }),

  startMatch: (id: string) =>
    restFetch(`/rooms/${id}/start-match`, { method: "POST" }),
};

// ---------------------------------------------------------------------------
// REST — Admin: Beatmaps
// ---------------------------------------------------------------------------

export const adminBeatmaps = {
  create: (body: Record<string, unknown>) =>
    restFetch("/beatmaps", { method: "POST", body: JSON.stringify(body) }),

  update: (id: string, body: Record<string, unknown>) =>
    restFetch(`/beatmaps/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  delete: (id: string) =>
    restFetch(`/beatmaps/${id}`, { method: "DELETE" }),
};

// ---------------------------------------------------------------------------
// REST — Admin: Users
// ---------------------------------------------------------------------------

export const adminUsers = {
  updateRoles: (id: string, body: Record<string, unknown>) =>
    restFetch(`/users/${id}/roles`, { method: "PATCH", body: JSON.stringify(body) }),

  setBanned: (id: string, body: Record<string, unknown>) =>
    restFetch(`/users/${id}/banned`, { method: "PATCH", body: JSON.stringify(body) }),

  updateVerifyStatus: (id: string, body: Record<string, unknown>) =>
    restFetch(`/users/${id}/verify-status`, { method: "PATCH", body: JSON.stringify(body) }),
};

// ---------------------------------------------------------------------------
// REST — Admin: Announcements
// ---------------------------------------------------------------------------

export const adminAnnouncements = {
  create: (body: Record<string, unknown>) =>
    restFetch("/announcements", { method: "POST", body: JSON.stringify(body) }),

  update: (id: string, body: Record<string, unknown>) =>
    restFetch(`/announcements/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  delete: (id: string) =>
    restFetch(`/announcements/${id}`, { method: "DELETE" }),

  publish: (id: string) =>
    restFetch(`/announcements/${id}/publish`, { method: "POST" }),
};

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
}

/**
 * Execute a typed GraphQL document against the backend.
 *
 * @param doc  A `TypedDocumentString` from `app/graphql/operations.ts`
 * @param variables Type-safe variables inferred from the document
 */
export async function graphqlRequest<TResult, TVariables>(
  doc: TypedDocumentString<TResult, TVariables>,
  variables?: TVariables,
): Promise<GraphQLResponse<TResult>> {
  const headers = await authHeaders();
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: doc.toString(), variables }),
  });
  return res.json();
}

/**
 * Server-only variant of `graphqlRequest`.
 *
 * Does not read `localStorage` (which is unavailable on the server) and instead
 * sends a plain JSON request. Use this for public, server-rendered GraphQL
 * reads such as the News feed.
 */
export async function serverGraphQLRequest<TResult, TVariables>(
  doc: TypedDocumentString<TResult, TVariables>,
  variables?: TVariables,
): Promise<GraphQLResponse<TResult>> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: doc.toString(), variables }),
    next: { revalidate: 60 },
  });
  return res.json();
}
