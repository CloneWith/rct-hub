"use client";

/**
 * MatchCommandDispatcher — single abstraction over the M2/M3 match command
 * surface. Both production and the dev sandbox speak through this interface,
 * so `useStrategistInteractions` / `useRefereeInteractions` never have to
 * know whether they're talking to the real GraphQL orchestrator or to a
 * sandbox stub.
 *
 * Production default (`realCommandDispatcher`) calls the existing
 * `commands.ts` builders; every method has the same shape (`CommandMetaArgs`
 * is supplied by `useMatchCommand` on the caller side, NOT here).
 *
 * The sandbox dispatcher in `/dev/room-sandbox/sandboxDispatcher.ts`
 * implements the same interface but never touches the network — it shows a
 * toast describing the backend op it would have triggered and returns a
 * synthetic success.
 *
 * Why not just expose individual functions: `useStrategistInteractions` and
 * `useRefereeInteractions` together import ~25 command builders from
 * `./commands`. Funneling them through one injected object keeps the
 * refactor surface tiny (replace one import per hook) and lets the sandbox
 * mode swap the entire submission layer in one line of provider wiring.
 */

import {
  abortMatch,
  banPoolSlot,
  calibrateTimer,
  confirmBeatmapResult,
  confirmIrcResult,
  confirmTbResult,
  grantAdditionalTime,
  markStrategistReady,
  pauseTimer,
  placePiece,
  placeShiro,
  recordSurrender,
  refereeBanPoolSlot,
  refereePlacePiece,
  refereePlaceShiro,
  refereeRequestTb,
  refereeRespondTbRequest,
  refereeRobPiece,
  rejectIrcObservation,
  requestTb,
  respondTbRequest,
  resumeMatch,
  resumeTimer,
  retryIrcJob,
  retryMatchAutomation,
  robPiece,
  skipCurrentAction,
  startMatch,
  startTb,
  suspendMatch,
  type ActingTeam,
  type CommandMetaArgs,
  type CommandResult,
  type MarkStrategistReadyResult,
} from "./commands";

export type {
  ActingTeam,
  CommandMetaArgs,
  CommandResult,
  MarkStrategistReadyResult,
};

/** Every in-match command the UI can fire. */
export interface MatchCommandDispatcher {
  // --- Strategist / captain
  banPoolSlot(args: CommandMetaArgs & { poolSlotId: string }): Promise<CommandResult>;
  placePiece(
    args: CommandMetaArgs & { poolSlotId: string; position: { row: number; col: number } },
  ): Promise<CommandResult>;
  placeShiro(
    args: CommandMetaArgs & { position: { row: number; col: number } },
  ): Promise<CommandResult>;
  robPiece(
    args: CommandMetaArgs & { targetPieceId: string; sacrificeSets: string[][] },
  ): Promise<CommandResult>;
  requestTb(args: CommandMetaArgs & { requestId: string }): Promise<CommandResult>;
  respondTbRequest(
    args: CommandMetaArgs & { requestId: string; accept: boolean },
  ): Promise<CommandResult>;
  markStrategistReady(args: { roomId: string }): Promise<MarkStrategistReadyResult>;

  // --- Referee console
  startMatch(args: CommandMetaArgs): Promise<CommandResult>;
  suspendMatch(args: CommandMetaArgs & { reason: string }): Promise<CommandResult>;
  resumeMatch(args: CommandMetaArgs & { reason: string }): Promise<CommandResult>;
  abortMatch(args: CommandMetaArgs & { reason: string }): Promise<CommandResult>;
  skipCurrentAction(args: CommandMetaArgs & { reason: string }): Promise<CommandResult>;
  pauseTimer(args: CommandMetaArgs & { reason: string }): Promise<CommandResult>;
  resumeTimer(args: CommandMetaArgs & { reason: string }): Promise<CommandResult>;
  calibrateTimer(
    args: CommandMetaArgs & { remainingMilliseconds: number; reason: string },
  ): Promise<CommandResult>;
  grantAdditionalTime(args: CommandMetaArgs & { reason: string }): Promise<CommandResult>;
  startTb(args: CommandMetaArgs & { reason: string }): Promise<CommandResult>;
  confirmBeatmapResult(
    args: CommandMetaArgs & { boardPieceId: string; winningTeam: ActingTeam },
  ): Promise<CommandResult>;
  confirmTbResult(
    args: CommandMetaArgs & { winningTeam: ActingTeam },
  ): Promise<CommandResult>;
  recordSurrender(
    args: CommandMetaArgs & {
      surrenderingTeam: ActingTeam;
      confirmingPlayerIds: string[];
      reason: string;
    },
  ): Promise<CommandResult>;
  refereeBanPoolSlot(
    args: CommandMetaArgs & { actingTeam: ActingTeam; poolSlotId: string; reason: string },
  ): Promise<CommandResult>;
  refereePlacePiece(
    args: CommandMetaArgs & {
      actingTeam: ActingTeam;
      poolSlotId: string;
      position: { row: number; col: number };
      reason: string;
    },
  ): Promise<CommandResult>;
  refereePlaceShiro(
    args: CommandMetaArgs & {
      actingTeam: ActingTeam;
      position: { row: number; col: number };
      reason: string;
    },
  ): Promise<CommandResult>;
  refereeRobPiece(
    args: CommandMetaArgs & {
      actingTeam: ActingTeam;
      targetPieceId: string;
      sacrificeSets: string[][];
      reason: string;
    },
  ): Promise<CommandResult>;
  refereeRequestTb(
    args: CommandMetaArgs & { actingTeam: ActingTeam; requestId: string; reason: string },
  ): Promise<CommandResult>;
  refereeRespondTbRequest(
    args: CommandMetaArgs & {
      actingTeam: ActingTeam;
      requestId: string;
      accept: boolean;
      reason: string;
    },
  ): Promise<CommandResult>;
  confirmIrcResult(
    args: CommandMetaArgs & {
      observationId: string;
      boardPieceId: string;
      winningTeam: ActingTeam;
    },
  ): Promise<CommandResult>;

  // --- Plain-Boolean referee utilities (no CommandMeta, no command id)
  rejectIrcObservation(args: {
    matchId: string;
    observationId: string;
    reason: string;
  }): Promise<boolean>;
  retryMatchAutomation(args: { matchId: string; eventId: string }): Promise<boolean>;
  retryIrcJob(args: { matchId: string; jobId: string }): Promise<boolean>;
}

/** Default dispatcher — talks to the real backend via `commands.ts`. */
export const realCommandDispatcher: MatchCommandDispatcher = {
  banPoolSlot,
  placePiece,
  placeShiro,
  robPiece,
  requestTb,
  respondTbRequest,
  markStrategistReady,

  startMatch,
  suspendMatch,
  resumeMatch,
  abortMatch,
  skipCurrentAction,
  pauseTimer,
  resumeTimer,
  calibrateTimer,
  grantAdditionalTime,
  startTb,
  confirmBeatmapResult,
  confirmTbResult,
  recordSurrender,
  refereeBanPoolSlot,
  refereePlacePiece,
  refereePlaceShiro,
  refereeRobPiece,
  refereeRequestTb,
  refereeRespondTbRequest,
  confirmIrcResult,

  rejectIrcObservation,
  retryMatchAutomation,
  retryIrcJob,
};