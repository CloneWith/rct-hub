/**
 * Room domain helpers — constants, labels and permission checks.
 *
 * The backend stores `round` as free text with exact-match filtering, so the
 * create dialog and the filter dropdown MUST share the same enum to guarantee
 * hits. Values outside this enum (e.g. legacy data) are displayed as-is on
 * cards but cannot be selected in the filter.
 */

import type { AuthUser, RoomSetup } from "@/app/lib/hooks";
import type { MatchLifecycle, PieceMod, RoomType, TeamSide, UserRole } from "@/app/graphql/graphql";

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
    firstPick: TeamSide | null;
    firstBan: TeamSide | null;
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

// ---------------------------------------------------------------------------
// M4 — pre-game setup page helpers
// ---------------------------------------------------------------------------

export const TEAM_SIDE_LABELS: Record<TeamSide, string> = {
  RED: "红方",
  BLUE: "蓝方",
};

/** Canonical mod-group order for the pool editor (matches backend mapMappool). */
export const PIECE_MOD_ORDER: PieceMod[] = ["NM", "HD", "HR", "DT", "FM", "SHIRO", "TB"];

export const PIECE_MOD_LABELS: Record<PieceMod, string> = {
  NM: "NM",
  HD: "HD",
  HR: "HR",
  DT: "DT",
  FM: "FM",
  SHIRO: "Shiro",
  TB: "TB",
};

/** A single pre-start validation issue, mapped to a human-readable label. */
export type StartCheckItem = { field: string; label: string };

export interface StartValidationResult {
  ok: boolean;
  issues: StartCheckItem[];
}

/**
 * Pre-start validation that mirrors the backend rules:
 *
 * - `RoomSettings.MissingStartRequirements` (room_service): casual/match need
 *   both strategists + BP order; match additionally needs leaders, ≥4 players
 *   and a non-empty MP link.
 * - `matchengine.NewReadyState` (model.go): every formal match requires exactly
 *   8 players per team, unique across teams, leaders inside their roster, valid
 *   RED/BLUE BP order and exactly one Shiro + one TB pool slot.
 * - `engineConfigurationFromRoom` (formal_match_factory): non-removed pool
 *   pieces must still be in the NORMAL state before start.
 *
 * Removed pieces are identified by `beatmapID === "-1"` (backend `IsRemoved`).
 */
export function validateRoomForStart(room: RoomSetup): StartValidationResult {
  const issues: StartCheckItem[] = [];
  const s = room.settings;
  const require = (field: string, label: string, ok: boolean) => {
    if (!ok) issues.push({ field, label });
  };

  if (room.type === "PRIVATE") return { ok: true, issues };

  require("settings.red_strategist_user_id", "红方策略师", s.redStrategistUserID != null);
  require("settings.blue_strategist_user_id", "蓝方策略师", s.blueStrategistUserID != null);
  require("settings.first_pick", "先选方（first pick）", s.firstPick === "RED" || s.firstPick === "BLUE");
  require("settings.first_ban", "先禁方（first ban）", s.firstBan === "RED" || s.firstBan === "BLUE");

  if (room.type === "MATCH") {
    require("settings.red_leader", "红方队长", s.redLeader != null);
    require("settings.blue_leader", "蓝方队长", s.blueLeader != null);
    require("settings.red_players", "红方选手（正式赛需恰好 8 人）", s.redPlayers.length === 8);
    require("settings.blue_players", "蓝方选手（正式赛需恰好 8 人）", s.bluePlayers.length === 8);
    require("settings.mp_link", "MP 链接", !!s.mpLink && s.mpLink.trim() !== "");

    // Rosters must be unique across teams and leaders must belong to their team.
    const allPlayers = [...s.redPlayers, ...s.bluePlayers];
    if (new Set(allPlayers).size !== allPlayers.length) {
      issues.push({ field: "settings.players", label: "双方选手存在重复的 osu! ID" });
    }
    if (s.redLeader != null && !s.redPlayers.includes(s.redLeader)) {
      issues.push({ field: "settings.red_leader", label: "红方队长不在红方阵容中" });
    }
    if (s.blueLeader != null && !s.bluePlayers.includes(s.blueLeader)) {
      issues.push({ field: "settings.blue_leader", label: "蓝方队长不在蓝方阵容中" });
    }

    // Pool: exactly one Shiro + one TB among active (non-removed) slots.
    const modCounts = new Map<PieceMod, number>();
    let abnormalPiece = false;
    for (const group of s.mappool.slots) {
      const active = group.pieces.filter((p) => p.beatmapID !== "-1");
      modCounts.set(group.mod, (modCounts.get(group.mod) ?? 0) + active.length);
      if (active.some((p) => p.state !== "NORMAL")) abnormalPiece = true;
    }
    if ((modCounts.get("SHIRO") ?? 0) !== 1) {
      issues.push({ field: "settings.mappool", label: "图池需恰好 1 个 Shiro 槽位" });
    }
    if ((modCounts.get("TB") ?? 0) !== 1) {
      issues.push({ field: "settings.mappool", label: "图池需恰好 1 个 TB 槽位" });
    }
    if (abnormalPiece) {
      issues.push({ field: "settings.mappool", label: "图池存在非 NORMAL 状态的棋子（开局前不可用）" });
    }
  }

  return { ok: issues.length === 0, issues };
}
