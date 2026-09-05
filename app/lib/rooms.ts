/**
 * Room domain helpers — constants, labels and permission checks.
 *
 * The backend stores `round` as free text with exact-match filtering, so the
 * create dialog and the filter dropdown MUST share the same enum to guarantee
 * hits. Values outside this enum (e.g. legacy data) are displayed as-is on
 * cards but cannot be selected in the filter.
 */

import type { AuthUser } from "@/app/lib/hooks";
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
    streamerUserID: string | null;
    firstPick: TeamSide | null;
    firstBan: TeamSide | null;
    redTeamID: string | null;
    blueTeamID: string | null;
    mappoolID: string | null;
    redTeam: TeamSummary | null;
    blueTeam: TeamSummary | null;
    mappool: MappoolSummary | null;
    mpLink: string | null;
    streamLink: string | null;
  };
};

export type TeamSummary = {
  id: string;
  name: string;
  description: string | null;
  seed: string | null;
  leaderID: number | null;
  strategistID: number | null;
  playerIDs: number[];
  isReady: boolean;
};

export type MappoolSummary = {
  id: string;
  name: string;
  description: string | null;
  entries: { mod: PieceMod; index: number; beatmapID: number | null; skill: string | null; selectorID: number | null }[];
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

// ---------------------------------------------------------------------------
// P3 — pre-start checklist (mirrors backend service.MissingStartRequirements
// plus the engine-level rules surfaced by BuildFormalMatchSeed)
// ---------------------------------------------------------------------------

export type StartCheckStatus = "ok" | "error" | "warn";

/** A single checklist entry: label + status + current value + fix hint. */
export interface StartChecklistItem {
  /** Wire-format field path (matches backend validation errors). */
  field: string;
  label: string;
  status: StartCheckStatus;
  /** Current value summary, e.g. "Seed Red · 6 名玩家" or "未设置". */
  detail: string;
  /** Fix suggestion shown when the item is not ok. */
  hint: string;
}

export interface StartChecklistGroup {
  key: string;
  title: string;
  items: StartChecklistItem[];
}

export interface StartChecklist {
  groups: StartChecklistGroup[];
  /** Hard blockers (`status === "error"`). */
  errors: StartChecklistItem[];
  /** Soft warnings — displayed but never blocking. */
  warnings: StartChecklistItem[];
  ok: boolean;
}

/** Structural input accepted by `buildStartChecklist` (list items and setup pages both fit). */
export type StartChecklistInput = {
  type: RoomType;
  scheduledAt: string | null;
  refereeUserID: string | null;
  settings: {
    streamerUserID: string | null;
    firstPick: TeamSide | null;
    firstBan: TeamSide | null;
    mpLink: string | null;
    redTeam: TeamSummary | null;
    blueTeam: TeamSummary | null;
    mappool: MappoolSummary | null;
  };
};

function checklistTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function startItem(
  field: string,
  label: string,
  status: StartCheckStatus,
  detail: string,
  hint = "",
): StartChecklistItem {
  return { field, label, status, detail, hint };
}

function linkedTeamItem(side: string, team: TeamSummary | null): StartChecklistItem {
  const field = side === "红方" ? "settings.red_team_id" : "settings.blue_team_id";
  if (!team) {
    return startItem(field, `${side}队伍`, "error", "未选择", "在配置页选择队伍");
  }
  if (!team.isReady) {
    return startItem(
      field,
      `${side}队伍`,
      "error",
      `${team.name} · 未就绪（缺队长或策略师）`,
      "在管理后台补齐队伍的队长与策略师",
    );
  }
  return startItem(field, `${side}队伍`, "ok", `${team.name} · ${team.playerIDs.length} 名玩家`);
}

/**
 * Build the grouped pre-start checklist. Rules mirror the backend:
 *
 * - `service.MissingStartRequirements`: casual/match need both teams ready,
 *   BP order, a scheduled time and an assigned referee (D3 hard rules);
 *   match additionally needs a mappool and a non-empty MP link.
 * - `matchengine.NewReadyState`: every formal match requires a non-empty
 *   roster containing the leader, no duplicate player ids across teams, and
 *   exactly one Shiro + one TB pool slot. Roster size is intentionally not
 *   enforced — a team with only its leader (and optionally the leader's
 *   strategist) may still start.
 *
 * The streamer stays optional (soft warning only, D3).
 */
export function buildStartChecklist(room: StartChecklistInput): StartChecklist {
  const s = room.settings;
  const isMatch = room.type === "MATCH";

  // ---- Group 1: 比赛信息 ----
  const info: StartChecklistItem[] = [
    startItem("name", "比赛名称", "ok", "创建时已确定"),
    startItem(
      "scheduled_at",
      "开赛时间",
      room.scheduledAt ? "ok" : "error",
      checklistTime(room.scheduledAt) ?? "未设置",
      room.scheduledAt ? "" : "在配置页设置开赛时间",
    ),
  ];

  // ---- Group 2: 比赛队伍 ----
  const teams: StartChecklistItem[] = [
    linkedTeamItem("红方", s.redTeam),
    linkedTeamItem("蓝方", s.blueTeam),
  ];
  if (isMatch) {
    const redPlayers = s.redTeam?.playerIDs ?? [];
    const bluePlayers = s.blueTeam?.playerIDs ?? [];
    const allPlayers = [...redPlayers, ...bluePlayers];
    if (new Set(allPlayers).size !== allPlayers.length) {
      teams.push(startItem("settings.players", "双方名单", "error", "存在重复的 osu! ID", "调整队伍使双方选手不重复"));
    }
  }

  // ---- Group 3: 裁判与直播 ----
  const staff: StartChecklistItem[] = [
    startItem(
      "settings.streamer_user_id",
      "直播员",
      s.streamerUserID ? "ok" : "warn",
      s.streamerUserID ? `已指定（#${s.streamerUserID}）` : "未指定（可选）",
      s.streamerUserID ? "" : "可在配置页指定直播员",
    ),
  ];

  if (room.type === "MATCH") {
    staff.push(startItem(
      "referee_user_id",
      "比赛裁判",
      room.refereeUserID ? "ok" : "error",
      room.refereeUserID ? `已指定（#${room.refereeUserID}）` : "未指定",
      room.refereeUserID ? "" : "在配置页指定裁判",
    ));
  }

  // ---- Group 4: 链接与图池 ----
  const links: StartChecklistItem[] = [
    startItem(
      "settings.first_pick",
      "先选方",
      s.firstPick ? "ok" : "error",
      s.firstPick ? TEAM_SIDE_LABELS[s.firstPick] : "未设置",
      s.firstPick ? "" : "在配置页设置 BP 顺序",
    ),
    startItem(
      "settings.first_ban",
      "先禁方",
      s.firstBan ? "ok" : "error",
      s.firstBan ? TEAM_SIDE_LABELS[s.firstBan] : "未设置",
      s.firstBan ? "" : "在配置页设置 BP 顺序",
    ),
  ];
  if (isMatch) {
    links.push(
      startItem(
        "settings.mp_link",
        "MP 链接",
        s.mpLink && s.mpLink.trim() !== "" ? "ok" : "error",
        s.mpLink ? "已设置" : "未设置",
        s.mpLink ? "" : "在配置页填写 osu! 多人比赛链接",
      ),
      startItem(
        "settings.mappool_id",
        "比赛图池",
        s.mappool ? "ok" : "error",
        s.mappool ? `${s.mappool.name}（${s.mappool.entries.length} 个条目）` : "未选择",
        s.mappool ? "" : "在配置页选择图池",
      ),
    );
    if (s.mappool) {
      const modCounts = new Map<PieceMod, number>();
      for (const entry of s.mappool.entries) {
        modCounts.set(entry.mod, (modCounts.get(entry.mod) ?? 0) + 1);
      }
      const shiro = modCounts.get("SHIRO") ?? 0;
      const tb = modCounts.get("TB") ?? 0;
      if (shiro !== 1) {
        links.push(startItem("settings.mappool", "Shiro 槽位", "error", `${shiro} 个`, "图池需恰好 1 个 Shiro 槽位"));
      }
      if (tb !== 1) {
        links.push(startItem("settings.mappool", "TB 槽位", "error", `${tb} 个`, "图池需恰好 1 个 TB 槽位"));
      }
    }
  }

  const groups: StartChecklistGroup[] = [
    { key: "info", title: "比赛信息", items: info },
    { key: "teams", title: "比赛队伍", items: teams },
    { key: "staff", title: "裁判与直播", items: staff },
    { key: "links", title: "链接与图池", items: links },
  ];
  const all = groups.flatMap((g) => g.items);
  const errors = all.filter((i) => i.status === "error");
  const warnings = all.filter((i) => i.status === "warn");
  return { groups, errors, warnings, ok: errors.length === 0 };
}
