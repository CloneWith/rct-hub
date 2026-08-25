/**
 * Room domain helpers — constants, labels and permission checks.
 *
 * The backend stores `round` as free text with exact-match filtering, so the
 * create dialog and the filter dropdown MUST share the same enum to guarantee
 * hits. Values outside this enum (e.g. legacy data) are displayed as-is on
 * cards but cannot be selected in the filter.
 */

import type { AuthUser } from "@/app/lib/hooks";
import type { MatchLifecycle, RoomType, UserRole } from "@/app/graphql/graphql";

/** Room list item (from `RoomsQuery`). */
export type RoomItem = {
  id: string;
  code: string;
  name: string;
  type: RoomType;
  round: string;
  scheduledAt: string | null;
  createdAt: string;
  ownerID: string;
  refereeUserID: string | null;
  matchID: string | null;
  owner: { id: string; onlineID: string; username: string; avatarUrl: string } | null;
  match: { snapshot: { lifecycle: MatchLifecycle } } | null;
  settings: {
    redStrategistUserID: string | null;
    blueStrategistUserID: string | null;
    streamerUserID: string | null;
    redLeader: string | null;
    blueLeader: string | null;
    redPlayers: string[];
    bluePlayers: string[];
    mpLink: string | null;
    streamLink: string | null;
  };
};

/** Canonical round values shared by the create/edit dialog and the filter. */
export const ROOM_ROUNDS = ["小组赛", "16强", "8强", "半决赛", "决赛"] as const;

/** Chinese labels for `MatchLifecycle` — used by the status filter and chips. */
export const LIFECYCLE_LABELS: Record<MatchLifecycle, string> = {
  READY: "待开始",
  RUNNING: "进行中",
  SUSPENDED: "已暂停",
  ADJUDICATION_REQUIRED: "待裁决",
  FINISHED: "已结束",
  ABORTED: "已中止",
};

/** All selectable lifecycle values for the status filter. */
export const LIFECYCLE_OPTIONS = Object.keys(LIFECYCLE_LABELS) as MatchLifecycle[];

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  PRIVATE: "私密",
  CASUAL: "休闲",
  MATCH: "正式赛",
};

/** Chip tone for the derived room status. */
export type RoomStatusChip = { label: string; tone: "neutral" | "primary" | "success" | "warning" | "danger" };

/**
 * Derive the display status of a room.
 *
 * - `matchID == null` → 未开局 (no match has been started)
 * - otherwise map `match.snapshot.lifecycle` when available
 * - fallback → 已开局 (the match field may be null for viewers without
 *   formal-match access — the room list itself is still readable)
 */
export function roomStatusChip(room: RoomItem): RoomStatusChip {
  if (room.matchID == null) return { label: "未开局", tone: "neutral" };
  const lifecycle = room.match?.snapshot?.lifecycle;
  if (!lifecycle) return { label: "已开局", tone: "primary" };
  const label = LIFECYCLE_LABELS[lifecycle];
  switch (lifecycle) {
    case "RUNNING":
      return { label, tone: "success" };
    case "SUSPENDED":
    case "ADJUDICATION_REQUIRED":
      return { label, tone: "warning" };
    case "FINISHED":
      return { label, tone: "neutral" };
    case "ABORTED":
      return { label, tone: "danger" };
    default:
      return { label, tone: "primary" };
  }
}

// ---------------------------------------------------------------------------
// Permission checks — mirror backend `authorizedRoom` semantics
// ---------------------------------------------------------------------------

export function isAdmin(user: AuthUser | null): boolean {
  return !!user && user.roles.includes("ADMIN");
}

export function hasRole(user: AuthUser | null, role: UserRole): boolean {
  return !!user && user.roles.includes(role);
}

/**
 * Whether the user may start the match / update the MP link of this room.
 * Admin → any room; otherwise the user must hold the REFEREE role and be the
 * designated referee (`refereeUserID`) of a match room.
 */
export function canControlRoom(user: AuthUser | null, room: RoomItem): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return user.roles.includes("REFEREE") && room.refereeUserID === user.onlineID;
}

/**
 * Whether the "与我相关" filter should be visible: hidden for admins and for
 * users without any room-related role (per requirements).
 */
export function showRelatedFilter(user: AuthUser | null): boolean {
  if (!user || isAdmin(user)) return false;
  const related: UserRole[] = ["PLAYER", "STRATEGIST", "REFEREE", "STREAMER"];
  return user.roles.some((r) => related.includes(r));
}
