/**
 * WebSocket realtime protocol types (read-only `/ws/match` channel).
 *
 * Hand-mirrored from the backend `internal/realtime` package:
 * - `gateway.go`  — inbound/outbound message envelopes
 * - `snapshot.go` — the stable browser projection snapshot
 * - `internal/matchengine/model.go` — enum values (lifecycle/phase/mod/…)
 *
 * The WS channel is intentionally NOT part of the GraphQL schema, so these
 * types live here instead of the codegen output. Keep them in sync with the
 * backend structs; the `schemaVersion: 1` handshake guards drift.
 */

// ---------------------------------------------------------------------------
// matchengine enums (wire values)
// ---------------------------------------------------------------------------

export type TeamSide = "RED" | "BLUE";

export type MatchLifecycle =
  | "READY"
  | "RUNNING"
  | "SUSPENDED"
  | "ADJUDICATION_REQUIRED"
  | "FINISHED"
  | "ABORTED";

export type MatchPhase =
  | "NONE"
  | "BAN"
  | "PICK"
  | "WAITING_FOR_RESULT"
  | "TB_PREPARATION"
  | "TB_PLAYING";

export type PieceMod = "NM" | "HD" | "HR" | "DT" | "FM" | "SHIRO" | "TB";

export type ForceMod = "NM" | "HD" | "HR";

export type BoardZone = "DT" | "HD" | "HR";

export type PoolSlotState = "AVAILABLE" | "BANNED" | "SELECTED";

export type BoardPieceOutcome = "WAITING_RESULT" | "WON" | "WHITE" | "DEAD";

export type TBBasis = "CAPTAIN_AGREEMENT" | "FORCED_AFTER_ROBBERY_CHECKS";

export type MatchResultReason =
  | "FOUR_ALIGNMENT"
  | "TB"
  | "SURRENDER"
  | "STALEMATE_WON_COUNT";

export type MatchEventType =
  | "MATCH_STARTED"
  | "BAN_PHASE_STARTED"
  | "POOL_SLOT_BANNED"
  | "TURN_ADVANCED"
  | "PICK_PHASE_STARTED"
  | "PIECE_PLACED"
  | "SHIRO_PLACED"
  | "RESULT_CONFIRMATION_REQUESTED"
  | "BEATMAP_RESULT_CONFIRMED"
  | "PIECE_WON"
  | "PIECES_SACRIFICED"
  | "PIECE_ROBBED"
  | "ADDITIONAL_TIME_GRANTED"
  | "TIMER_CALIBRATED"
  | "TIMER_PAUSED"
  | "TIMER_RESUMED"
  | "MATCH_SUSPENDED"
  | "MATCH_RESUMED"
  | "ACTION_SKIPPED"
  | "MATCH_ABORTED"
  | "REFEREE_PROXY_ACTION_RECORDED"
  | "TB_REQUESTED"
  | "TB_REQUEST_ACCEPTED"
  | "TB_REQUEST_REJECTED"
  | "TB_REQUEST_EXPIRED"
  | "TB_FORCED"
  | "TB_PREPARATION_STARTED"
  | "TB_STARTED"
  | "TB_RESULT_CONFIRMED"
  | "SURRENDER_RECORDED";

// ---------------------------------------------------------------------------
// Snapshot (backend `realtime.snapshot`, camelCase JSON)
// ---------------------------------------------------------------------------

export interface WSPoolSlot {
  id: string;
  mod: PieceMod;
  state: PoolSlotState;
}

export interface WSBoardPiece {
  id: string;
  sourcePoolSlotId: string;
  mod: PieceMod;
  forceMod?: ForceMod;
  selectedBy: TeamSide;
  owner?: TeamSide;
  outcome: BoardPieceOutcome;
}

export interface WSBoardCell {
  cell: string;
  row: number;
  col: number;
  zone: BoardZone;
  piece?: WSBoardPiece;
}

export interface WSBoard {
  cells: WSBoardCell[];
}

export interface WSTimer {
  startedAt?: string;
  durationMilliseconds: number;
  paused: boolean;
  remainingAtPauseMilliseconds?: number;
}

export interface WSTeamCounts {
  red: number;
  blue: number;
}

export interface WSTeamFlags {
  red: boolean;
  blue: boolean;
}

export interface WSRoster {
  leaderId: string;
  playerIds: string[];
}

export interface WSRosters {
  red: WSRoster;
  blue: WSRoster;
}

export interface WSTBRequest {
  id: string;
  requestedBy: TeamSide;
  basis: TBBasis;
}

export interface WSTBEntry {
  basis: TBBasis;
  requestId?: string;
  requestedBy?: TeamSide;
}

export interface WSMatchResult {
  winner: TeamSide;
  reason: MatchResultReason;
  surrenderingTeam?: TeamSide;
  confirmingPlayerIds: string[];
  wonCounts: WSTeamCounts;
}

export interface WSStalemateEvidence {
  wonCounts: WSTeamCounts;
}

/** Full state projection attached to every snapshot/event message. */
export interface WSSnapshot {
  version: number;
  lifecycle: MatchLifecycle;
  phase: MatchPhase;
  firstBan: TeamSide;
  firstPick: TeamSide;
  turn: number;
  activeTeam?: TeamSide;
  poolSlots: WSPoolSlot[];
  board: WSBoard;
  wonCounts: WSTeamCounts;
  timer: WSTimer;
  robberyUsed: WSTeamFlags;
  teamPauseUsed: WSTeamFlags;
  rosters: WSRosters;
  pendingPieceId?: string;
  pendingTBRequest?: WSTBRequest;
  tbEntry?: WSTBEntry;
  winner?: TeamSide;
  result?: WSMatchResult;
  stalemate?: WSStalemateEvidence;
}

// ---------------------------------------------------------------------------
// Events (backend `realtime.publicEvent`)
// ---------------------------------------------------------------------------

export interface WSPublicEventFact {
  team?: TeamSide;
  poolSlotId?: string;
  boardPieceId?: string;
  boardPieceIds: string[];
  cell?: string;
  durationMilliseconds?: number;
  requestId?: string;
  tbBasis?: TBBasis;
  playerIds: string[];
}

export interface WSPublicEvent {
  id: string;
  type: MatchEventType;
  resultingVersion: number;
  fact: WSPublicEventFact;
  occurredAt: string;
}

// ---------------------------------------------------------------------------
// Message envelopes (backend `realtime.outbound` / inbound subscribe)
// ---------------------------------------------------------------------------

/** The single client → server message. Must arrive within 10s of connect. */
export interface WSSubscribeMessage {
  type: "subscribe";
  schemaVersion: 1;
  matchId: string;
}

export type WSOutboundMessage =
  | {
      type: "snapshot";
      serverTime?: string;
      matchId: string;
      version: number;
      sequence: number;
      snapshot: WSSnapshot;
    }
  | {
      type: "event";
      serverTime?: string;
      matchId: string;
      sequence: number;
      version: number;
      event: WSPublicEvent;
      snapshot: WSSnapshot;
    }
  | {
      type: "error";
      serverTime?: string;
      code: string;
      message: string;
    }
  | {
      type: "resync_required";
      serverTime?: string;
      matchId: string;
      code: string;
      nextSequence: number;
    };

/** Terminal error codes that make reconnects pointless. */
export const FATAL_ERROR_CODES = new Set([
  "INVALID_SUBSCRIPTION",
  "UNSUPPORTED_SCHEMA_VERSION",
  "INVALID_MATCH_ID",
  "FORBIDDEN",
  "MATCH_NOT_FOUND",
]);
