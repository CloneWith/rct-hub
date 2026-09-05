/**
 * Sandbox fixtures — synthetic snapshots covering the most visually
 * distinct phases of a match. The goal is **not** to mirror the backend
 * state machine precisely (that's `internal/matchengine`'s job), but to
 * exercise the frontend's UI affordances:
 *
 * - which panels render at all (strategist / referee rails, banners)
 * - which controls are enabled / disabled / highlighted
 * - how the board, pool, timer and dialogs look under each phase
 *
 * Use the **role selector** to switch the viewer's identity (observer,
 * red/blue strategist, captain, referee, admin) — that's how you can
 * preview all the controls without spinning up a backend.
 *
 * The `match` blob passed to `MatchStageContent` is a `BootstrapMatch`
 * (the GraphQL `matchByCode` projection). Each entry here:
 *
 * - `match.id` / `code` / `name` — identity
 * - `snapshot`             — drives `liveSnapshot` after `toLiveSnapshot()`
 * - `strategistView`       — non-null when the viewer is the red/blue strategist
 * - `captainView`          — non-null when the viewer is the red/blue captain
 * - `refereeView`          — non-null when the viewer is the assigned referee
 *                            (or admin)
 *
 * The IRC queries inside `useRefereeInteractions` will fire when
 * `refereeView != null`. They return null/[] but the queries run; we don't
 * worry about that here — the visual still works.
 */

import type { BootstrapMatch } from "@/app/rooms/[code]/match/MatchStageContent";
import type { BeatmapMetadataStatus } from "@/app/graphql/graphql";

// ---------------------------------------------------------------------------
// Roles — drives which sub-view (strategist / captain / referee) is non-null.
// ---------------------------------------------------------------------------

export type ViewerRole =
  | "observer"
  | "redStrategist"
  | "blueStrategist"
  | "redCaptain"
  | "blueCaptain"
  | "referee"
  | "admin";

export const VIEWER_ROLES: { key: ViewerRole; label: string; description: string }[] = [
  { key: "observer", label: "观察者", description: "无身份，仅看棋盘/图池" },
  { key: "redStrategist", label: "红方策略师", description: "可 Ban / Pick / Place / Rob" },
  { key: "blueStrategist", label: "蓝方策略师", description: "可 Ban / Pick / Place / Rob" },
  { key: "redCaptain", label: "红方队长", description: "可请求 TB / 确认投降" },
  { key: "blueCaptain", label: "蓝方队长", description: "可请求 TB / 确认投降" },
  { key: "referee", label: "裁判", description: "可主持比赛、暂停、计时" },
  { key: "admin", label: "管理员", description: "覆盖裁判所有权限" },
];

// ---------------------------------------------------------------------------
// Fixture keys — the canonical six.
// ---------------------------------------------------------------------------

export type FixtureKey =
  | "pending"
  | "banning"
  | "picking"
  | "waitingResult"
  | "tbPreparation"
  | "finished";

export const FIXTURE_KEYS: FixtureKey[] = [
  "pending",
  "banning",
  "picking",
  "waitingResult",
  "tbPreparation",
  "finished",
];

export const FIXTURE_LABELS: Record<FixtureKey, { label: string; description: string }> = {
  pending: { label: "待开局", description: "PENDING：双方策略师待就绪" },
  banning: { label: "Ban 阶段", description: "BAN：红方先手禁图" },
  picking: { label: "Pick 阶段", description: "PICK：蓝方先手选图" },
  waitingResult: { label: "等待结果", description: "WAITING_FOR_RESULT：等待裁判/IRC 确认" },
  tbPreparation: { label: "TB 准备", description: "TB_PREPARATION：进入 TB 前准备" },
  finished: { label: "已结束", description: "FINISHED：红方胜利" },
};

// ---------------------------------------------------------------------------
// Shared base — mappool, rosters, room metadata; reused across all fixtures.
// ---------------------------------------------------------------------------

const FIXTURE_MATCH_ID = "000000000000000000000001";
const FIXTURE_ROOM_ID = "000000000000000000000002";
const FIXTURE_CODE = "SANDBOX";
const FIXTURE_NAME = "Sandbox 对局";
const FIXTURE_MP_LINK = "https://osu.ppy.sh/mp/99999999";

/** Stable mappool used by every fixture. 11 slots: 3×NM, 1×HD, 1×HR, 1×DT, 1×FM, 1×Shiro, 1×TB, 1×NM(extra). */
function makeFixturePool() {
  const baseSlot = (i: number) => ({
    poolSlotID: `pool-${i.toString().padStart(2, "0")}`,
    metadataStatus: "RESOLVED" as BeatmapMetadataStatus,
    beatmap: {
      onlineID: String(1000000 + i),
      title: `Sandbox 曲目 ${i}`,
      artist: "Sandbox Artist",
      difficultyName: ["Normal", "Hard", "Insane", "Extra"][i % 4],
      starRating: 4 + (i % 6) * 0.3,
      bpm: 160 + (i % 5) * 10,
      totalLength: 120 + (i % 4) * 30,
      coverUrl: `https://assets.ppy.sh/beatmaps/${1000 + i}/covers/cover.jpg`,
    },
  });
  const shiroSlot = {
    poolSlotID: "pool-shiro",
    metadataStatus: "RESOLVED" as BeatmapMetadataStatus,
    beatmap: {
      onlineID: "1000200",
      title: "Sandbox Shiro",
      artist: "Sandbox Artist",
      difficultyName: "Shiro",
      starRating: 6.66,
      bpm: 200,
      totalLength: 180,
      coverUrl: "https://assets.ppy.sh/beatmaps/1200/covers/cover.jpg",
    },
  };
  const tbSlot = {
    poolSlotID: "pool-tb",
    metadataStatus: "RESOLVED" as BeatmapMetadataStatus,
    beatmap: {
      onlineID: "1000300",
      title: "Sandbox Tiebreaker",
      artist: "Sandbox Artist",
      difficultyName: "TB",
      starRating: 5.5,
      bpm: 180,
      totalLength: 150,
      coverUrl: "https://assets.ppy.sh/beatmaps/1300/covers/cover.jpg",
    },
  };
  return [baseSlot(1), baseSlot(2), baseSlot(3), baseSlot(4), baseSlot(5), baseSlot(6), shiroSlot, tbSlot, baseSlot(7)];
}

/** Stable roster: 5 players per team (≥4 satisfies match start). */
const FIXTURE_ROSTER_RED = {
  leaderID: "1",
  playerIDs: ["1", "11", "12", "13", "14"],
};
const FIXTURE_ROSTER_BLUE = {
  leaderID: "2",
  playerIDs: ["2", "21", "22", "23", "24"],
};

// ---------------------------------------------------------------------------
// Empty board helper — produces a 4×4 grid of cells with no pieces.
// ---------------------------------------------------------------------------

function emptyBoard(): BootstrapMatch["snapshot"]["board"] {
  const cells = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const cell = String.fromCharCode(65 + col) + String(row + 1);
      // Zone quadrants mirror backend `board.go` `ZoneAt`:
      //   DT DT | HD HD
      //   DT DT | HD HD
      //   ------+------
      //   HR HR | DT DT
      //   HR HR | DT DT
      let zone: "DT" | "HD" | "HR";
      if (row < 2) zone = col < 2 ? "DT" : "HD";
      else zone = col < 2 ? "HR" : "DT";
      cells.push({ cell, row, col, zone, piece: null });
    }
  }
  return { cells };
}

/** Convert a "loose" cell description to the backend-shape piece object. */
function piece(opts: {
  id: string;
  sourcePoolSlotID: string;
  mod: "NM" | "HD" | "HR" | "DT" | "FM" | "SHIRO" | "TB";
  forceMod?: "NM" | "HD" | "HR" | null;
  selectedBy: "RED" | "BLUE";
  owner?: "RED" | "BLUE" | null;
  outcome: "WAITING_RESULT" | "WON" | "WHITE" | "DEAD";
}): NonNullable<BootstrapMatch["snapshot"]["board"]["cells"][number]["piece"]> {
  return {
    id: opts.id,
    sourcePoolSlotID: opts.sourcePoolSlotID,
    mod: opts.mod,
    forceMod: opts.forceMod ?? null,
    selectedBy: opts.selectedBy,
    owner: opts.owner ?? null,
    outcome: opts.outcome,
  };
}

// ---------------------------------------------------------------------------
// Fixture snapshots — six canonical phases.
// ---------------------------------------------------------------------------

const FIXTURE_SNAPSHOTS: Record<FixtureKey, BootstrapMatch["snapshot"]> = {
  // PENDING — wait for both strategists to mark ready. Board empty, lifecycle
  // is "READY" on the engine side; engine status is "PENDING" pre-start.
  pending: {
    version: "1",
    lifecycle: "READY",
    phase: "NONE",
    firstBan: "RED",
    firstPick: "RED",
    turn: 0,
    activeTeam: null,
    poolSlots: [],
    board: emptyBoard(),
    wonCounts: { red: 0, blue: 0 },
    timer: { durationMilliseconds: 0, paused: true, startedAt: null, remainingAtPauseMilliseconds: null },
    robberyUsed: { red: false, blue: false },
    teamPauseUsed: { red: false, blue: false },
    rosters: { red: FIXTURE_ROSTER_RED, blue: FIXTURE_ROSTER_BLUE },
    pendingPieceID: null,
    pendingTBRequest: null,
    tbEntry: null,
    winner: null,
    result: null,
    stalemate: null,
  },

  // BAN — engine is running, red is banning. 3 NM slots already banned.
  banning: {
    version: "5",
    lifecycle: "RUNNING",
    phase: "BAN",
    firstBan: "RED",
    firstPick: "RED",
    turn: 3,
    activeTeam: "RED",
    poolSlots: [
      { id: "pool-01", mod: "NM", state: "BANNED" },
      { id: "pool-02", mod: "NM", state: "BANNED" },
      { id: "pool-03", mod: "NM", state: "BANNED" },
      { id: "pool-04", mod: "HD", state: "AVAILABLE" },
      { id: "pool-05", mod: "HR", state: "AVAILABLE" },
      { id: "pool-06", mod: "DT", state: "AVAILABLE" },
      { id: "pool-shiro", mod: "SHIRO", state: "AVAILABLE" },
      { id: "pool-tb", mod: "TB", state: "AVAILABLE" },
      { id: "pool-07", mod: "NM", state: "AVAILABLE" },
    ],
    board: emptyBoard(),
    wonCounts: { red: 0, blue: 0 },
    timer: { durationMilliseconds: 90_000, paused: false, startedAt: null, remainingAtPauseMilliseconds: null },
    robberyUsed: { red: false, blue: false },
    teamPauseUsed: { red: false, blue: false },
    rosters: { red: FIXTURE_ROSTER_RED, blue: FIXTURE_ROSTER_BLUE },
    pendingPieceID: null,
    pendingTBRequest: null,
    tbEntry: null,
    winner: null,
    result: null,
    stalemate: null,
  },

  // PICK — board has 2 red and 2 blue pieces; blue to pick next.
  picking: {
    version: "12",
    lifecycle: "RUNNING",
    phase: "PICK",
    firstBan: "RED",
    firstPick: "RED",
    turn: 5,
    activeTeam: "BLUE",
    poolSlots: [
      { id: "pool-01", mod: "NM", state: "BANNED" },
      { id: "pool-02", mod: "NM", state: "BANNED" },
      { id: "pool-03", mod: "NM", state: "BANNED" },
      { id: "pool-04", mod: "HD", state: "SELECTED" },
      { id: "pool-05", mod: "HR", state: "AVAILABLE" },
      { id: "pool-06", mod: "DT", state: "AVAILABLE" },
      { id: "pool-shiro", mod: "SHIRO", state: "AVAILABLE" },
      { id: "pool-tb", mod: "TB", state: "AVAILABLE" },
      { id: "pool-07", mod: "NM", state: "AVAILABLE" },
    ],
    board: {
      cells: emptyBoard().cells.map((c) => {
        // Place four pieces: two red (NM@A1, HR@B1), two blue (HD@C3, DT@D4).
        if (c.cell === "A1") return { ...c, piece: piece({ id: "p-red-1", sourcePoolSlotID: "pool-01", mod: "NM", selectedBy: "RED", owner: "RED", outcome: "WON" }) };
        if (c.cell === "B1") return { ...c, piece: piece({ id: "p-red-2", sourcePoolSlotID: "pool-05", mod: "HR", selectedBy: "RED", owner: "RED", outcome: "WON" }) };
        if (c.cell === "C3") return { ...c, piece: piece({ id: "p-blue-1", sourcePoolSlotID: "pool-04", mod: "HD", selectedBy: "BLUE", owner: "BLUE", outcome: "WON" }) };
        if (c.cell === "D4") return { ...c, piece: piece({ id: "p-blue-2", sourcePoolSlotID: "pool-06", mod: "DT", selectedBy: "BLUE", owner: "BLUE", outcome: "WON" }) };
        return c;
      }),
    },
    wonCounts: { red: 0, blue: 0 },
    timer: { durationMilliseconds: 60_000, paused: false, startedAt: null, remainingAtPauseMilliseconds: null },
    robberyUsed: { red: false, blue: false },
    teamPauseUsed: { red: false, blue: false },
    rosters: { red: FIXTURE_ROSTER_RED, blue: FIXTURE_ROSTER_BLUE },
    pendingPieceID: null,
    pendingTBRequest: null,
    tbEntry: null,
    winner: null,
    result: null,
    stalemate: null,
  },

  // WAITING_FOR_RESULT — a piece is placed and awaiting IRC / captain confirm.
  waitingResult: {
    version: "14",
    lifecycle: "RUNNING",
    phase: "WAITING_FOR_RESULT",
    firstBan: "RED",
    firstPick: "RED",
    turn: 7,
    activeTeam: null,
    poolSlots: [
      { id: "pool-01", mod: "NM", state: "BANNED" },
      { id: "pool-02", mod: "NM", state: "BANNED" },
      { id: "pool-03", mod: "NM", state: "BANNED" },
      { id: "pool-04", mod: "HD", state: "SELECTED" },
      { id: "pool-05", mod: "HR", state: "SELECTED" },
      { id: "pool-06", mod: "DT", state: "SELECTED" },
      { id: "pool-shiro", mod: "SHIRO", state: "AVAILABLE" },
      { id: "pool-tb", mod: "TB", state: "AVAILABLE" },
      { id: "pool-07", mod: "NM", state: "AVAILABLE" },
    ],
    board: {
      cells: emptyBoard().cells.map((c) => {
        if (c.cell === "A1") return { ...c, piece: piece({ id: "p-red-1", sourcePoolSlotID: "pool-01", mod: "NM", selectedBy: "RED", owner: "RED", outcome: "WON" }) };
        if (c.cell === "B1") return { ...c, piece: piece({ id: "p-red-2", sourcePoolSlotID: "pool-05", mod: "HR", selectedBy: "RED", owner: "RED", outcome: "WON" }) };
        if (c.cell === "C3") return { ...c, piece: piece({ id: "p-blue-1", sourcePoolSlotID: "pool-04", mod: "HD", selectedBy: "BLUE", owner: "BLUE", outcome: "WON" }) };
        if (c.cell === "D4") return { ...c, piece: piece({ id: "p-blue-2", sourcePoolSlotID: "pool-06", mod: "DT", selectedBy: "BLUE", owner: "BLUE", outcome: "WON" }) };
        if (c.cell === "B2") return { ...c, piece: piece({ id: "p-pending", sourcePoolSlotID: "pool-07", mod: "NM", selectedBy: "RED", owner: "RED", outcome: "WAITING_RESULT" }) };
        return c;
      }),
    },
    wonCounts: { red: 1, blue: 1 },
    timer: { durationMilliseconds: 60_000, paused: true, startedAt: null, remainingAtPauseMilliseconds: 30_000 },
    robberyUsed: { red: false, blue: false },
    teamPauseUsed: { red: false, blue: false },
    rosters: { red: FIXTURE_ROSTER_RED, blue: FIXTURE_ROSTER_BLUE },
    pendingPieceID: "p-pending",
    pendingTBRequest: null,
    tbEntry: null,
    winner: null,
    result: null,
    stalemate: null,
  },

  // TB_PREPARATION — captains agreed to TB. Shiro placed, TB slot selected.
  tbPreparation: {
    version: "22",
    lifecycle: "RUNNING",
    phase: "TB_PREPARATION",
    firstBan: "RED",
    firstPick: "RED",
    turn: 24,
    activeTeam: null,
    poolSlots: [
      { id: "pool-01", mod: "NM", state: "BANNED" },
      { id: "pool-02", mod: "NM", state: "BANNED" },
      { id: "pool-03", mod: "NM", state: "BANNED" },
      { id: "pool-04", mod: "HD", state: "SELECTED" },
      { id: "pool-05", mod: "HR", state: "SELECTED" },
      { id: "pool-06", mod: "DT", state: "SELECTED" },
      { id: "pool-shiro", mod: "SHIRO", state: "SELECTED" },
      { id: "pool-tb", mod: "TB", state: "AVAILABLE" },
      { id: "pool-07", mod: "NM", state: "BANNED" },
    ],
    board: {
      cells: emptyBoard().cells.map((c) => {
        // Shiro placed at center (B3 or C2), several pieces already on the board.
        if (c.cell === "A1") return { ...c, piece: piece({ id: "p-red-1", sourcePoolSlotID: "pool-01", mod: "NM", selectedBy: "RED", owner: "RED", outcome: "WON" }) };
        if (c.cell === "B2") return { ...c, piece: piece({ id: "p-shiro", sourcePoolSlotID: "pool-shiro", mod: "SHIRO", selectedBy: "BLUE", owner: null, outcome: "WHITE" }) };
        if (c.cell === "C3") return { ...c, piece: piece({ id: "p-blue-1", sourcePoolSlotID: "pool-04", mod: "HD", selectedBy: "BLUE", owner: "BLUE", outcome: "WON" }) };
        if (c.cell === "D4") return { ...c, piece: piece({ id: "p-blue-2", sourcePoolSlotID: "pool-06", mod: "DT", selectedBy: "BLUE", owner: "BLUE", outcome: "WON" }) };
        return c;
      }),
    },
    wonCounts: { red: 3, blue: 3 },
    timer: { durationMilliseconds: 0, paused: true, startedAt: null, remainingAtPauseMilliseconds: null },
    robberyUsed: { red: false, blue: false },
    teamPauseUsed: { red: true, blue: false },
    rosters: { red: FIXTURE_ROSTER_RED, blue: FIXTURE_ROSTER_BLUE },
    pendingPieceID: null,
    pendingTBRequest: {
      id: "tb-req-1",
      requestedBy: "RED",
      basis: "CAPTAIN_AGREEMENT",
    },
    tbEntry: {
      basis: "CAPTAIN_AGREEMENT",
      requestID: "tb-req-1",
      requestedBy: "RED",
    },
    winner: null,
    result: null,
    stalemate: null,
  },

  // FINISHED — red wins via four-alignment. Lifecycle FINISHED, result populated.
  finished: {
    version: "30",
    lifecycle: "FINISHED",
    phase: "NONE",
    firstBan: "RED",
    firstPick: "RED",
    turn: 28,
    activeTeam: null,
    poolSlots: [
      { id: "pool-01", mod: "NM", state: "BANNED" },
      { id: "pool-02", mod: "NM", state: "BANNED" },
      { id: "pool-03", mod: "NM", state: "BANNED" },
      { id: "pool-04", mod: "HD", state: "SELECTED" },
      { id: "pool-05", mod: "HR", state: "SELECTED" },
      { id: "pool-06", mod: "DT", state: "SELECTED" },
      { id: "pool-shiro", mod: "SHIRO", state: "SELECTED" },
      { id: "pool-tb", mod: "TB", state: "SELECTED" },
      { id: "pool-07", mod: "NM", state: "BANNED" },
    ],
    board: {
      cells: emptyBoard().cells.map((c) => {
        if (c.cell === "A1") return { ...c, piece: piece({ id: "p-red-1", sourcePoolSlotID: "pool-01", mod: "NM", selectedBy: "RED", owner: "RED", outcome: "WON" }) };
        if (c.cell === "A2") return { ...c, piece: piece({ id: "p-red-2", sourcePoolSlotID: "pool-05", mod: "HR", selectedBy: "RED", owner: "RED", outcome: "WON" }) };
        if (c.cell === "A3") return { ...c, piece: piece({ id: "p-red-3", sourcePoolSlotID: "pool-06", mod: "DT", selectedBy: "RED", owner: "RED", outcome: "WON" }) };
        if (c.cell === "A4") return { ...c, piece: piece({ id: "p-red-4", sourcePoolSlotID: "pool-04", mod: "HD", selectedBy: "RED", owner: "RED", outcome: "WON" }) };
        if (c.cell === "C2") return { ...c, piece: piece({ id: "p-blue-1", sourcePoolSlotID: "pool-shiro", mod: "SHIRO", selectedBy: "BLUE", owner: null, outcome: "DEAD" }) };
        if (c.cell === "D4") return { ...c, piece: piece({ id: "p-blue-2", sourcePoolSlotID: "pool-tb", mod: "TB", selectedBy: "BLUE", owner: "BLUE", outcome: "DEAD" }) };
        return c;
      }),
    },
    wonCounts: { red: 4, blue: 0 },
    timer: { durationMilliseconds: 0, paused: true, startedAt: null, remainingAtPauseMilliseconds: null },
    robberyUsed: { red: false, blue: false },
    teamPauseUsed: { red: true, blue: true },
    rosters: { red: FIXTURE_ROSTER_RED, blue: FIXTURE_ROSTER_BLUE },
    pendingPieceID: null,
    pendingTBRequest: null,
    tbEntry: null,
    winner: "RED",
    result: {
      winner: "RED",
      reason: "FOUR_ALIGNMENT",
      surrenderingTeam: null,
      confirmingPlayerIDs: ["1", "11", "12", "13"],
      wonCounts: { red: 4, blue: 0 },
    },
    stalemate: null,
  },
};

// ---------------------------------------------------------------------------
// Per-fixture matchStatus + strategistReadiness + actor views.
// ---------------------------------------------------------------------------

interface FixtureMeta {
  matchStatus: "PENDING" | "READY" | "ACTIVE" | "FINISHED" | "CANCELED";
  /** Pre-rendered readiness bits; PENDING shows partial readiness to exercise
   *  the "等待策略师确认准备" banner. */
  strategistReadiness: { redReady: boolean; blueReady: boolean };
}

const FIXTURE_META: Record<FixtureKey, FixtureMeta> = {
  pending: { matchStatus: "PENDING", strategistReadiness: { redReady: false, blueReady: false } },
  banning: { matchStatus: "ACTIVE", strategistReadiness: { redReady: true, blueReady: true } },
  picking: { matchStatus: "ACTIVE", strategistReadiness: { redReady: true, blueReady: true } },
  waitingResult: { matchStatus: "ACTIVE", strategistReadiness: { redReady: true, blueReady: true } },
  tbPreparation: { matchStatus: "ACTIVE", strategistReadiness: { redReady: true, blueReady: true } },
  finished: { matchStatus: "FINISHED", strategistReadiness: { redReady: true, blueReady: true } },
};

// ---------------------------------------------------------------------------
// Build a BootstrapMatch for a given (fixture, viewerRole).
// ---------------------------------------------------------------------------

/**
 * Build the per-role actor views (strategistView / captainView /
 * refereeView). The `analysis` payload is intentionally generous: sandbox is
 * about visual state, so every "currently allowed" action is reported as
 * allowed unless the role/snapshot forbids it. This avoids needing
 * per-fixture analysis tables.
 */
function buildActorViews(
  fixtureKey: FixtureKey,
  role: ViewerRole,
): Pick<BootstrapMatch, "strategistView" | "captainView" | "refereeView"> {
  const snapshot = FIXTURE_SNAPSHOTS[fixtureKey];
  const phase = snapshot.phase;
  const lifecycle = snapshot.lifecycle;
  const activeTeam = snapshot.activeTeam ?? "RED";

  // -- Strategist view: appears when role is red/blue strategist.
  if (role === "redStrategist" || role === "blueStrategist") {
    const myTeam = role === "redStrategist" ? "RED" : "BLUE";
    const isMyTurn = activeTeam === myTeam && lifecycle === "RUNNING";
    return {
      strategistView: {
        myTeam,
        isMyTurn,
        analysis: {
          allowedActions: isMyTurn
            ? phase === "BAN"
              ? ["BAN_POOL_SLOT"]
              : phase === "PICK"
                ? ["PLACE_PIECE", "PLACE_SHIRO", "ROB_PIECE"]
                : []
            : [],
          banPoolSlotIDs:
            phase === "BAN" && activeTeam === myTeam
              ? snapshot.poolSlots.filter((s) => s.state === "AVAILABLE").map((s) => s.id)
              : [],
          legalPlacements:
            phase === "PICK" && activeTeam === myTeam
              ? snapshot.poolSlots
                  .filter((s) => s.state === "AVAILABLE")
                  .slice(0, 2)
                  .flatMap((s) => [
                    { poolSlotID: s.id, cell: "B2", forceMod: null },
                    { poolSlotID: s.id, cell: "C2", forceMod: null },
                  ])
              : [],
          shiroCells:
            phase === "PICK" && activeTeam === myTeam ? ["B2", "C2", "B3", "C3"] : [],
          robberyPlans:
            phase === "PICK" && activeTeam === myTeam
              ? [
                  {
                    targetPieceID: "p-blue-1",
                    sacrificeSets: [["p-red-1"]],
                  },
                ]
              : [],
          pendingTBRequestID: snapshot.pendingTBRequest?.id ?? null,
          canAcceptTBRequest: Boolean(snapshot.pendingTBRequest),
          canRejectTBRequest: Boolean(snapshot.pendingTBRequest),
          tbRequestTeams: snapshot.pendingTBRequest ? ["RED", "BLUE"] : [],
          tbResponseTeams: snapshot.pendingTBRequest ? ["RED", "BLUE"] : [],
        },
      },
      captainView: null,
      refereeView: null,
    };
  }

  // -- Captain view: appears when role is red/blue captain.
  if (role === "redCaptain" || role === "blueCaptain") {
    const myTeam = role === "redCaptain" ? "RED" : "BLUE";
    return {
      strategistView: null,
      captainView: {
        myTeam,
        analysis: {
          allowedActions: ["REQUEST_TB", "RESPOND_TB_REQUEST", "CONFIRM_BEATMAP_RESULT", "RECORD_SURRENDER"],
          banPoolSlotIDs: [],
          legalPlacements: [],
          shiroCells: [],
          robberyPlans: [],
          pendingTBRequestID: snapshot.pendingTBRequest?.id ?? null,
          canAcceptTBRequest: Boolean(snapshot.pendingTBRequest),
          canRejectTBRequest: Boolean(snapshot.pendingTBRequest),
          tbRequestTeams: snapshot.pendingTBRequest ? ["RED", "BLUE"] : [],
          tbResponseTeams: snapshot.pendingTBRequest ? ["RED", "BLUE"] : [],
        },
      },
      refereeView: null,
    };
  }

  // -- Referee / admin view: full referee console.
  if (role === "referee" || role === "admin") {
    return {
      strategistView: null,
      captainView: null,
      refereeView: {
        matchID: FIXTURE_MATCH_ID,
        suspensionReason: null,
        abortReason: null,
        analysis: {
          allowedActions: [
            "START_MATCH",
            "BAN_POOL_SLOT",
            "PLACE_PIECE",
            "PLACE_SHIRO",
            "ROB_PIECE",
            "CONFIRM_BEATMAP_RESULT",
            "GRANT_ADDITIONAL_TIME",
            "CALIBRATE_TIMER",
            "PAUSE_TIMER",
            "RESUME_TIMER",
            "SUSPEND_MATCH",
            "RESUME_MATCH",
            "SKIP_CURRENT_ACTION",
            "ABORT_MATCH",
            "REQUEST_TB",
            "RESPOND_TB_REQUEST",
            "START_TB",
            "CONFIRM_TB_RESULT",
            "RECORD_SURRENDER",
          ],
          banPoolSlotIDs: [],
          legalPlacements: [],
          shiroCells: [],
          robberyPlans: [],
          pendingTBRequestID: snapshot.pendingTBRequest?.id ?? null,
          canAcceptTBRequest: Boolean(snapshot.pendingTBRequest),
          canRejectTBRequest: Boolean(snapshot.pendingTBRequest),
          tbRequestTeams: snapshot.pendingTBRequest ? ["RED", "BLUE"] : [],
          tbResponseTeams: snapshot.pendingTBRequest ? ["RED", "BLUE"] : [],
        },
        auditLog: [],
        automationIssues: [],
      },
    };
  }

  // -- Observer: no actor views, spectator-only.
  return {
    strategistView: null,
    captainView: null,
    refereeView: null,
  };
}

/**
 * Build a `BootstrapMatch` for the sandbox, given a fixture key and viewer
 * role. The returned object is consumed verbatim by `MatchStageContent` —
 * no GraphQL, no WS.
 */
export function buildSandboxMatch(fixtureKey: FixtureKey, role: ViewerRole): BootstrapMatch {
  const meta = FIXTURE_META[fixtureKey];
  const pool = makeFixturePool();
  const actorViews = buildActorViews(fixtureKey, role);

  return {
    id: FIXTURE_MATCH_ID,
    code: FIXTURE_CODE,
    name: FIXTURE_NAME,
    roomType: "MATCH",
    roomID: FIXTURE_ROOM_ID,
    status: meta.matchStatus,
    strategistReadiness: meta.strategistReadiness,
    room: {
      id: FIXTURE_ROOM_ID,
      name: FIXTURE_NAME,
      round: "小组赛",
      settings: { mpLink: FIXTURE_MP_LINK },
    },
    pool,
    snapshot: FIXTURE_SNAPSHOTS[fixtureKey],
    strategistView: actorViews.strategistView,
    captainView: actorViews.captainView,
    refereeView: actorViews.refereeView,
  };
}