"use client";

/**
 * Command submission layer (M2) — the single entry point for in-match
 * mutations. Wraps the GraphQL command mutations with the contract from
 * `internal/matchcommand/orchestrator.go`:
 *
 * - `commandId` must be a non-zero UUID; retries of the SAME logical action
 *   (network failures only) reuse the id → the backend replies REPLAYED and
 *   applies nothing twice (double-click / resend safe).
 * - `expectedVersion` comes from the latest WS snapshot; on
 *   `MATCH_VERSION_CONFLICT` the error carries `currentVersion` and the
 *   caller should refresh (resync) and let the user retry.
 * - Business errors return a structured `CommandError`; transport failures
 *   throw `CommandTransportError` (distinguishable so the UI can keep the
 *   commandId for a retry).
 *
 * The UI never renders raw errors — map via `errors.ts`.
 */

import { graphqlRequest } from "@/app/lib/api";
import type { TypedDocumentString } from "@/app/graphql/graphql";
import type { MarkStrategistReadyMutation } from "@/app/graphql/graphql";
import {
  AbortMatchDocument,
  BanPoolSlotDocument,
  CalibrateTimerDocument,
  ConfirmBeatmapResultDocument,
  ConfirmIRCResultDocument,
  ConfirmTbResultDocument,
  GrantAdditionalTimeDocument,
  MarkStrategistReadyDocument,
  PauseTimerDocument,
  PlacePieceDocument,
  PlaceShiroDocument,
  RecordSurrenderDocument,
  RefereeBanPoolSlotDocument,
  RefereePlacePieceDocument,
  RefereePlaceShiroDocument,
  RefereeRequestTbDocument,
  RefereeRespondTbRequestDocument,
  RefereeRobPieceDocument,
  RejectIRCObservationDocument,
  RequestTbDocument,
  RespondTbRequestDocument,
  ResumeMatchDocument,
  ResumeTimerDocument,
  RetryIRCJobDocument,
  RetryMatchAutomationDocument,
  RobPieceDocument,
  SkipCurrentActionDocument,
  StartMatchDocument,
  StartTbDocument,
  SuspendMatchDocument,
} from "@/app/lib/operations";
import type { MatchErrorShape } from "./errors";
import { matchErrorMessage } from "./errors";

// ---------------------------------------------------------------------------
// Result shapes
// ---------------------------------------------------------------------------

export type CommandDisposition = "APPLIED" | "REPLAYED";

export interface CommandResult {
  ok: boolean;
  disposition?: CommandDisposition;
  resultingVersion?: string;
  error?: MatchErrorShape;
}

/** Transport-level failure (offline, 5xx, malformed response). Retryable. */
export class CommandTransportError extends Error {
  constructor(message = "网络异常，请重试") {
    super(message);
    this.name = "CommandTransportError";
  }
}

/** Backend rejected the command with a structured error. */
export function commandErrorMessage(error: MatchErrorShape): string {
  // Errors.ts maps codes to Chinese text; reuse the existing mapping.
  return matchErrorMessage(error);
}

// ---------------------------------------------------------------------------
// Low-level submit helper
// ---------------------------------------------------------------------------

async function submitCommand<TResult, TVariables>(
  doc: TypedDocumentString<TResult, TVariables>,
  variables: TVariables,
): Promise<CommandResult> {
  let res: Awaited<ReturnType<typeof graphqlRequest<TResult, TVariables>>>;
  try {
    res = await graphqlRequest(doc, variables);
  } catch {
    throw new CommandTransportError();
  }

  if (res.errors?.length) {
    // GraphQL envelope-level failure (validation/authz short-circuits).
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: res.errors[0].message },
    };
  }

  const result = res.data as
    | {
        [k: string]: {
          success?: boolean;
          disposition?: CommandDisposition;
          resultingVersion?: string;
          error?: MatchErrorShape | null;
        };
      }
    | undefined;
  const payload = result ? Object.values(result)[0] : undefined;
  if (!payload) {
    return { ok: false, error: { code: "INTERNAL_ERROR", message: "空响应" } };
  }
  if (payload.error) {
    return { ok: false, error: payload.error, disposition: payload.disposition };
  }
  return {
    ok: payload.success !== false,
    disposition: payload.disposition,
    resultingVersion: payload.resultingVersion,
  };
}

// ---------------------------------------------------------------------------
// Typed command builders
// ---------------------------------------------------------------------------

export interface CommandMetaArgs {
  matchId: string;
  /** Latest WS snapshot.version — optimistic concurrency guard. */
  expectedVersion: string;
  commandId: string;
}

/** Fresh UUID per logical action; transport retries reuse the same id. */
export function newCommandId(): string {
  return crypto.randomUUID();
}

export function banPoolSlot(args: CommandMetaArgs & { poolSlotId: string }): Promise<CommandResult> {
  return submitCommand(BanPoolSlotDocument, {
    input: { meta: metaOf(args), poolSlotId: args.poolSlotId },
  });
}

export function placePiece(
  args: CommandMetaArgs & { poolSlotId: string; position: { row: number; col: number } },
): Promise<CommandResult> {
  return submitCommand(PlacePieceDocument, {
    input: { meta: metaOf(args), poolSlotId: args.poolSlotId, position: args.position },
  });
}

export function placeShiro(
  args: CommandMetaArgs & { position: { row: number; col: number } },
): Promise<CommandResult> {
  return submitCommand(PlaceShiroDocument, {
    input: { meta: metaOf(args), position: args.position },
  });
}

export function robPiece(
  args: CommandMetaArgs & { targetPieceId: string; sacrificeSets: string[][] },
): Promise<CommandResult> {
  return submitCommand(RobPieceDocument, {
    input: {
      meta: metaOf(args),
      targetPieceId: args.targetPieceId,
      sacrificeSets: args.sacrificeSets,
    },
  });
}

export function requestTb(args: CommandMetaArgs & { requestId: string }): Promise<CommandResult> {
  return submitCommand(RequestTbDocument, { input: { meta: metaOf(args), requestId: args.requestId } });
}

export function respondTbRequest(
  args: CommandMetaArgs & { requestId: string; accept: boolean },
): Promise<CommandResult> {
  return submitCommand(RespondTbRequestDocument, {
    input: { meta: metaOf(args), requestId: args.requestId, accept: args.accept },
  });
}

// ---------------------------------------------------------------------------
// Referee command builders (M3)
//
// Proxy commands (`referee*`) act on behalf of a team: `actingTeam` records
// the side, `reason` is mandatory for the audit trail. Everything still goes
// through the same idempotent command layer (commandId/expectedVersion).
// ---------------------------------------------------------------------------

/** Action performed by a referee on behalf of one side. */
export type ActingTeam = "RED" | "BLUE";

// NOTE: a type alias (not an interface) on purpose — object literal /
// intersection types get an implicit index signature, so `RefereeProxyArgs`
// satisfies the `Record<string, unknown>` constraint in `useMatchCommand`.
export type RefereeProxyArgs = CommandMetaArgs & {
  actingTeam: ActingTeam;
  reason: string;
};

export function startMatch(args: CommandMetaArgs): Promise<CommandResult> {
  return submitCommand(StartMatchDocument, { input: metaOf(args) });
}

export function refereeBanPoolSlot(
  args: RefereeProxyArgs & { poolSlotId: string },
): Promise<CommandResult> {
  return submitCommand(RefereeBanPoolSlotDocument, {
    input: {
      meta: metaOf(args),
      actingTeam: args.actingTeam,
      poolSlotId: args.poolSlotId,
      reason: args.reason,
    },
  });
}

export function refereePlacePiece(
  args: RefereeProxyArgs & { poolSlotId: string; position: { row: number; col: number } },
): Promise<CommandResult> {
  return submitCommand(RefereePlacePieceDocument, {
    input: {
      meta: metaOf(args),
      actingTeam: args.actingTeam,
      poolSlotId: args.poolSlotId,
      position: args.position,
      reason: args.reason,
    },
  });
}

export function refereePlaceShiro(
  args: RefereeProxyArgs & { position: { row: number; col: number } },
): Promise<CommandResult> {
  return submitCommand(RefereePlaceShiroDocument, {
    input: {
      meta: metaOf(args),
      actingTeam: args.actingTeam,
      position: args.position,
      reason: args.reason,
    },
  });
}

export function refereeRobPiece(
  args: RefereeProxyArgs & { targetPieceId: string; sacrificeSets: string[][] },
): Promise<CommandResult> {
  return submitCommand(RefereeRobPieceDocument, {
    input: {
      meta: metaOf(args),
      actingTeam: args.actingTeam,
      targetPieceId: args.targetPieceId,
      sacrificeSets: args.sacrificeSets,
      reason: args.reason,
    },
  });
}

export function refereeRequestTb(
  args: RefereeProxyArgs & { requestId: string },
): Promise<CommandResult> {
  return submitCommand(RefereeRequestTbDocument, {
    input: {
      meta: metaOf(args),
      actingTeam: args.actingTeam,
      requestId: args.requestId,
      reason: args.reason,
    },
  });
}

export function refereeRespondTbRequest(
  args: RefereeProxyArgs & { requestId: string; accept: boolean },
): Promise<CommandResult> {
  return submitCommand(RefereeRespondTbRequestDocument, {
    input: {
      meta: metaOf(args),
      actingTeam: args.actingTeam,
      requestId: args.requestId,
      accept: args.accept,
      reason: args.reason,
    },
  });
}

export function confirmBeatmapResult(
  args: CommandMetaArgs & { boardPieceId: string; winningTeam: ActingTeam },
): Promise<CommandResult> {
  return submitCommand(ConfirmBeatmapResultDocument, {
    input: { meta: metaOf(args), boardPieceId: args.boardPieceId, winningTeam: args.winningTeam },
  });
}

export function confirmTbResult(
  args: CommandMetaArgs & { winningTeam: ActingTeam },
): Promise<CommandResult> {
  return submitCommand(ConfirmTbResultDocument, {
    input: { meta: metaOf(args), winningTeam: args.winningTeam },
  });
}

export function grantAdditionalTime(
  args: CommandMetaArgs & { reason: string },
): Promise<CommandResult> {
  return submitCommand(GrantAdditionalTimeDocument, {
    input: { meta: metaOf(args), reason: args.reason },
  });
}

export function calibrateTimer(
  args: CommandMetaArgs & { remainingMilliseconds: number; reason: string },
): Promise<CommandResult> {
  return submitCommand(CalibrateTimerDocument, {
    input: { meta: metaOf(args), remainingMilliseconds: args.remainingMilliseconds, reason: args.reason },
  });
}

export function pauseTimer(args: CommandMetaArgs & { reason: string }): Promise<CommandResult> {
  return submitCommand(PauseTimerDocument, { input: { meta: metaOf(args), reason: args.reason } });
}

export function resumeTimer(args: CommandMetaArgs & { reason: string }): Promise<CommandResult> {
  return submitCommand(ResumeTimerDocument, { input: { meta: metaOf(args), reason: args.reason } });
}

export function suspendMatch(args: CommandMetaArgs & { reason: string }): Promise<CommandResult> {
  return submitCommand(SuspendMatchDocument, { input: { meta: metaOf(args), reason: args.reason } });
}

export function resumeMatch(args: CommandMetaArgs & { reason: string }): Promise<CommandResult> {
  return submitCommand(ResumeMatchDocument, { input: { meta: metaOf(args), reason: args.reason } });
}

export function skipCurrentAction(
  args: CommandMetaArgs & { reason: string },
): Promise<CommandResult> {
  return submitCommand(SkipCurrentActionDocument, {
    input: { meta: metaOf(args), reason: args.reason },
  });
}

export function abortMatch(args: CommandMetaArgs & { reason: string }): Promise<CommandResult> {
  return submitCommand(AbortMatchDocument, { input: { meta: metaOf(args), reason: args.reason } });
}

export function startTb(args: CommandMetaArgs & { reason: string }): Promise<CommandResult> {
  return submitCommand(StartTbDocument, { input: { meta: metaOf(args), reason: args.reason } });
}

export function recordSurrender(
  args: CommandMetaArgs & { surrenderingTeam: ActingTeam; confirmingPlayerIds: string[]; reason: string },
): Promise<CommandResult> {
  return submitCommand(RecordSurrenderDocument, {
    input: {
      meta: metaOf(args),
      surrenderingTeam: args.surrenderingTeam,
      confirmingPlayerIds: args.confirmingPlayerIds,
      reason: args.reason,
    },
  });
}

/**
 * Confirm an IRC-suggested result. Unlike the other commands, the input is
 * FLAT (`ConfirmIRCResultInput`), because the observation claim binds the
 * commandId — the meta fields sit at the top level of the input.
 */
export function confirmIrcResult(
  args: CommandMetaArgs & { observationId: string; boardPieceId: string; winningTeam: ActingTeam },
): Promise<CommandResult> {
  return submitCommand(ConfirmIRCResultDocument, {
    input: {
      matchId: args.matchId,
      expectedVersion: args.expectedVersion,
      commandId: args.commandId,
      observationId: args.observationId,
      boardPieceId: args.boardPieceId,
      winningTeam: args.winningTeam,
    },
  });
}

function metaOf(args: CommandMetaArgs): CommandMetaArgs {
  return {
    matchId: args.matchId,
    expectedVersion: args.expectedVersion,
    commandId: args.commandId,
  };
}

// ---------------------------------------------------------------------------
// Two-phase start: strategist readiness
//
// 与正式 match command 不同，此 mutation 不需要 CommandMeta（没有
// expectedVersion / commandId）：它直接操作 `Match.status` 的 readiness 子文档，
// 后端用 status filter 原子地翻转 readiness 位，并以原子事务触发系统级
// START_MATCH (casual/private) 或保留 READY 等待裁判 (match)。
//
// 返回更新后的 Match (id/status/strategistReadiness/snapshot.lifecycle)，
// 调用方负责把 readiness 状态合并回本地视图/缓存。
// ---------------------------------------------------------------------------

export interface MarkStrategistReadyResult {
  matchId: string;
  status: "PENDING" | "READY" | "ACTIVE" | "FINISHED" | "CANCELED";
  redReady: boolean;
  blueReady: boolean;
  lifecycle: string;
}

export async function markStrategistReady(args: {
  roomId: string;
}): Promise<MarkStrategistReadyResult> {
  let res: Awaited<ReturnType<typeof graphqlRequest<MarkStrategistReadyMutation, { roomId: string }>>>;
  try {
    res = await graphqlRequest(MarkStrategistReadyDocument, { roomId: args.roomId });
  } catch {
    throw new CommandTransportError();
  }
  if (res.errors?.length) {
    throw new CommandTransportError(res.errors[0].message);
  }
  const m = res.data?.markStrategistReady;
  if (!m) {
    throw new CommandTransportError("空响应");
  }
  return {
    matchId: m.id,
    status: m.status,
    redReady: m.strategistReadiness.redReady,
    blueReady: m.strategistReadiness.blueReady,
    lifecycle: m.snapshot.lifecycle,
  };
}

// ---------------------------------------------------------------------------
// Error code helpers
// ---------------------------------------------------------------------------

export function isVersionConflict(error?: MatchErrorShape): boolean {
  return error?.code === "MATCH_VERSION_CONFLICT";
}

export function isReplay(result: CommandResult): boolean {
  return result.disposition === "REPLAYED";
}

// ---------------------------------------------------------------------------
// Non-command referee utilities (plain Boolean mutations, no command id)
// ---------------------------------------------------------------------------

async function submitBooleanMutation<TVariables>(
  doc: TypedDocumentString<{ [k: string]: boolean }, TVariables>,
  variables: TVariables,
): Promise<boolean> {
  let res: Awaited<ReturnType<typeof graphqlRequest>>;
  try {
    res = await graphqlRequest(doc, variables);
  } catch {
    throw new CommandTransportError();
  }
  if (res.errors?.length) {
    throw new CommandTransportError(res.errors[0].message);
  }
  const value = res.data ? Object.values(res.data)[0] : undefined;
  return Boolean(value);
}

/** Reject a pending IRC observation (returns true on success). */
export function rejectIrcObservation(
  args: { matchId: string; observationId: string; reason: string },
): Promise<boolean> {
  return submitBooleanMutation(RejectIRCObservationDocument, args);
}

/** Retry a failed match automation event. */
export function retryMatchAutomation(args: { matchId: string; eventId: string }): Promise<boolean> {
  return submitBooleanMutation(RetryMatchAutomationDocument, {
    input: { matchID: args.matchId, eventID: args.eventId },
  });
}

/** Retry a failed IRC job. */
export function retryIrcJob(args: { matchId: string; jobId: string }): Promise<boolean> {
  return submitBooleanMutation(RetryIRCJobDocument, {
    input: { matchID: args.matchId, jobID: args.jobId },
  });
}
