"use client";

/**
 * Sandbox dispatcher — implements `MatchCommandDispatcher` for `/dev/room-sandbox`.
 *
 * Production wiring uses `realCommandDispatcher` (calls `commands.ts` which
 * POSTs GraphQL mutations). This stub does **not** touch the network, fetch
 * any server state, or read from `MatchLiveContext` — it only echoes the call
 * back through a toast describing what backend mutation *would* fire if this
 * were a real match. That keeps the sandbox hermetic (no JWT, no GraphQL
 * round-trip, no server state coupling) while still exercising every UI
 * affordance on the strategist / captain / referee rails.
 *
 * The toast payload is intentionally structured so devs can eyeball both the
 * high-level intent and the concrete args (`poolSlotId`, `position`, `reason`,
 * etc.) without needing a network tab open. Toast type is `info` for normal
 * commands, `success` for terminal actions (start / resume / confirm), and
 * `warning` for audit-trail proxies (referee acting on behalf of a side).
 *
 * Every method returns a synthetic `CommandResult { disposition: "APPLIED",
 * ... }` so downstream `useMatchCommand` hook logic (feedback wiring, isPending
 * flag, onSuccess cleanup) keeps running through its normal code paths.
 */

import { toast } from "@heroui/react";
import {
  newCommandId,
  type ActingTeam,
  type CommandMetaArgs,
  type CommandResult,
  type MarkStrategistReadyResult,
} from "@/app/rooms/[code]/match/lib/commands";
import type { MatchCommandDispatcher } from "@/app/rooms/[code]/match/lib/commandDispatcher";

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

/**
 * Construct a synthetic success response. We always report `APPLIED` (never
 * `REPLAYED`) because nothing actually went over the wire — there's no
 * retry detection to perform.
 */
function ok(): CommandResult {
  return { ok: true, disposition: "APPLIED" };
}

function okReady(): MarkStrategistReadyResult {
  return {
    matchId: "sandbox-match",
    status: "ACTIVE",
    redReady: true,
    blueReady: true,
    lifecycle: "RUNNING",
  };
}

function okBool(): boolean {
  return true;
}

/**
 * Cell coordinates are stored as `{ row, col }` (0-indexed) but UI labels them
 * with Excel-style letters (`A1`..`D4`). Convert for human-readable toasts.
 */
function coord({ row, col }: { row: number; col: number }): string {
  return `${String.fromCharCode(65 + col)}${row + 1}`;
}

function team(team: ActingTeam): string {
  return team === "RED" ? "红方" : "蓝方";
}

/**
 * Truncate long audit-trail reasons to one line so the toast stays compact.
 */
function trim(reason: string, max = 24): string {
  if (reason.length <= max) return reason;
  return `${reason.slice(0, max - 1)}…`;
}

function metaPreview(meta: CommandMetaArgs): string {
  // matchId is a Mongo ObjectID hex — show first 6 chars as a "match tag".
  return `match #${meta.matchId.slice(0, 6)} · v${meta.expectedVersion.slice(0, 6)} · cmd ${meta.commandId.slice(0, 8)}`;
}

// ---------------------------------------------------------------------------
// Per-command toast renderers — one per dispatcher method.
//
// Each renderer takes whatever args the dispatcher method takes, builds a
// short title + a description line that names the underlying GraphQL mutation
// (see schema.graphql) and shows the payload, then fires an `info`/`success`
// toast. Returning `void` keeps the dispatcher method signature honest
// (they all return a Promise<CommandResult> from the helper).
// ---------------------------------------------------------------------------

type ToastKind = "info" | "success" | "warning";

function announce(kind: ToastKind, title: string, description: string): void {
  // `toast.*` is bound by HeroUI v3 — all four variants share the same
  // signature: (title: string, description?: ReactNode) => void.
  if (kind === "success") toast.success(title, { description });
  else if (kind === "warning") toast.warning(title, { description });
  else toast.info(title, { description });
}

const synthMeta: CommandMetaArgs = {
  // Stable fake ids so the toast preview looks the same across clicks in a
  // single sandbox session. Real values would come from `useMatchLive()` +
  // `newCommandId()` in production wiring.
  matchId: "sandbox-match",
  expectedVersion: "sandbox-v0",
  commandId: "sandbox-cmd",
};

function previewMeta(): CommandMetaArgs {
  // Fresh `commandId` per click (mirrors the real `useMatchCommand` flow
  // which calls `newCommandId()` per invocation). matchId/expectedVersion
  // stay stable placeholders.
  return { ...synthMeta, commandId: newCommandId() };
}

// --- Strategist / captain ---------------------------------------------------

const banPoolSlot: MatchCommandDispatcher["banPoolSlot"] = (args) => {
  announce(
    "info",
    `[沙盒] 禁图 slot=${args.poolSlotId.slice(0, 12)}`,
    `GraphQL: mutation banPoolSlot\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const placePiece: MatchCommandDispatcher["placePiece"] = (args) => {
  announce(
    "info",
    `[沙盒] 落子 slot=${args.poolSlotId.slice(0, 12)} → ${coord(args.position)}`,
    `GraphQL: mutation placePiece\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const placeShiro: MatchCommandDispatcher["placeShiro"] = (args) => {
  announce(
    "info",
    `[沙盒] 落 Shiro @ ${coord(args.position)}`,
    `GraphQL: mutation placeShiro\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const robPiece: MatchCommandDispatcher["robPiece"] = (args) => {
  announce(
    "warning",
    `[沙盒] 夺棋 target=${args.targetPieceId.slice(0, 8)}`,
    `GraphQL: mutation robPiece · sacrificePlans=${args.sacrificeSets.length}\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const requestTb: MatchCommandDispatcher["requestTb"] = (args) => {
  announce(
    "info",
    `[沙盒] 申请 TB rid=${args.requestId.slice(0, 8)}`,
    `GraphQL: mutation requestTb\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const respondTbRequest: MatchCommandDispatcher["respondTbRequest"] = (args) => {
  announce(
    args.accept ? "success" : "info",
    `[沙盒] ${args.accept ? "接受" : "拒绝"} TB rid=${args.requestId.slice(0, 8)}`,
    `GraphQL: mutation respondTbRequest(accept: ${args.accept})\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const markStrategistReady: MatchCommandDispatcher["markStrategistReady"] = (args) => {
  announce(
    "success",
    `[沙盒] 已确认准备 room=${args.roomId.slice(0, 8)}`,
    `REST: PUT /api/v1/rooms/${args.roomId}/ready`,
  );
  return Promise.resolve(okReady());
};

// --- Referee console --------------------------------------------------------

const startMatch: MatchCommandDispatcher["startMatch"] = (args) => {
  announce(
    "success",
    `[沙盒] 开赛 match=${args.matchId.slice(0, 8)}`,
    `GraphQL: mutation startMatch\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const suspendMatch: MatchCommandDispatcher["suspendMatch"] = (args) => {
  announce(
    "warning",
    `[沙盒] 暂停 match=${args.matchId.slice(0, 8)}`,
    `GraphQL: mutation suspendMatch(reason="${trim(args.reason)}")\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const resumeMatch: MatchCommandDispatcher["resumeMatch"] = (args) => {
  announce(
    "success",
    `[沙盒] 恢复 match=${args.matchId.slice(0, 8)}`,
    `GraphQL: mutation resumeMatch(reason="${trim(args.reason)}")\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const abortMatch: MatchCommandDispatcher["abortMatch"] = (args) => {
  announce(
    "warning",
    `[沙盒] 终止 match=${args.matchId.slice(0, 8)}`,
    `GraphQL: mutation abortMatch(reason="${trim(args.reason)}")\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const skipCurrentAction: MatchCommandDispatcher["skipCurrentAction"] = (args) => {
  announce(
    "warning",
    `[沙盒] 跳过当前动作`,
    `GraphQL: mutation skipCurrentAction(reason="${trim(args.reason)}")\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const pauseTimer: MatchCommandDispatcher["pauseTimer"] = (args) => {
  announce(
    "info",
    `[沙盒] 暂停计时器`,
    `GraphQL: mutation pauseTimer(reason="${trim(args.reason)}")\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const resumeTimer: MatchCommandDispatcher["resumeTimer"] = (args) => {
  announce(
    "success",
    `[沙盒] 恢复计时器`,
    `GraphQL: mutation resumeTimer(reason="${trim(args.reason)}")\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const calibrateTimer: MatchCommandDispatcher["calibrateTimer"] = (args) => {
  announce(
    "info",
    `[沙盒] 校准计时器 → ${args.remainingMilliseconds}ms`,
    `GraphQL: mutation calibrateTimer(reason="${trim(args.reason)}")\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const grantAdditionalTime: MatchCommandDispatcher["grantAdditionalTime"] = (args) => {
  announce(
    "info",
    `[沙盒] 增加时间`,
    `GraphQL: mutation grantAdditionalTime(reason="${trim(args.reason)}")\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const startTb: MatchCommandDispatcher["startTb"] = (args) => {
  announce(
    "success",
    `[沙盒] 启动 TB`,
    `GraphQL: mutation startTb(reason="${trim(args.reason)}")\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const confirmBeatmapResult: MatchCommandDispatcher["confirmBeatmapResult"] = (args) => {
  announce(
    "success",
    `[沙盒] 确认成绩 ${team(args.winningTeam)} 胜`,
    `GraphQL: mutation confirmBeatmapResult(piece=${args.boardPieceId.slice(0, 8)}, winner=${args.winningTeam})\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const confirmTbResult: MatchCommandDispatcher["confirmTbResult"] = (args) => {
  announce(
    "success",
    `[沙盒] 确认 TB 成绩 ${team(args.winningTeam)} 胜`,
    `GraphQL: mutation confirmTbResult(winner=${args.winningTeam})\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const recordSurrender: MatchCommandDispatcher["recordSurrender"] = (args) => {
  announce(
    "warning",
    `[沙盒] 记录投降 ${team(args.surrenderingTeam)}`,
    `GraphQL: mutation recordSurrender(confirming=${args.confirmingPlayerIds.length}, reason="${trim(args.reason)}")\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const refereeBanPoolSlot: MatchCommandDispatcher["refereeBanPoolSlot"] = (args) => {
  announce(
    "warning",
    `[沙盒] 裁判代${team(args.actingTeam)}禁图 slot=${args.poolSlotId.slice(0, 12)}`,
    `GraphQL: mutation refereeBanPoolSlot(reason="${trim(args.reason)}")\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const refereePlacePiece: MatchCommandDispatcher["refereePlacePiece"] = (args) => {
  announce(
    "warning",
    `[沙盒] 裁判代${team(args.actingTeam)}落子 slot=${args.poolSlotId.slice(0, 12)} → ${coord(args.position)}`,
    `GraphQL: mutation refereePlacePiece(reason="${trim(args.reason)}")\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const refereePlaceShiro: MatchCommandDispatcher["refereePlaceShiro"] = (args) => {
  announce(
    "warning",
    `[沙盒] 裁判代${team(args.actingTeam)}落 Shiro @ ${coord(args.position)}`,
    `GraphQL: mutation refereePlaceShiro(reason="${trim(args.reason)}")\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const refereeRobPiece: MatchCommandDispatcher["refereeRobPiece"] = (args) => {
  announce(
    "warning",
    `[沙盒] 裁判代${team(args.actingTeam)}夺棋 target=${args.targetPieceId.slice(0, 8)}`,
    `GraphQL: mutation refereeRobPiece(plans=${args.sacrificeSets.length}, reason="${trim(args.reason)}")\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const refereeRequestTb: MatchCommandDispatcher["refereeRequestTb"] = (args) => {
  announce(
    "warning",
    `[沙盒] 裁判代${team(args.actingTeam)}申请 TB rid=${args.requestId.slice(0, 8)}`,
    `GraphQL: mutation refereeRequestTb(reason="${trim(args.reason)}")\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const refereeRespondTbRequest: MatchCommandDispatcher["refereeRespondTbRequest"] = (args) => {
  announce(
    args.accept ? "success" : "info",
    `[沙盒] 裁判${args.accept ? "接受" : "拒绝"} TB ${team(args.actingTeam)} rid=${args.requestId.slice(0, 8)}`,
    `GraphQL: mutation refereeRespondTbRequest(accept=${args.accept}, reason="${trim(args.reason)}")\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const confirmIrcResult: MatchCommandDispatcher["confirmIrcResult"] = (args) => {
  announce(
    "success",
    `[沙盒] 确认 IRC 成绩 ${team(args.winningTeam)} 胜`,
    `GraphQL: mutation confirmIrcResult(obs=${args.observationId.slice(0, 8)}, piece=${args.boardPieceId.slice(0, 8)})\n${metaPreview(args)}`,
  );
  return Promise.resolve(ok());
};

const rejectIrcObservation: MatchCommandDispatcher["rejectIrcObservation"] = (args) => {
  announce(
    "warning",
    `[沙盒] 驳回 IRC 观测 obs=${args.observationId.slice(0, 8)}`,
    `REST: POST /api/v1/matches/${args.matchId}/irc/observations/${args.observationId}/reject`,
  );
  return Promise.resolve(okBool());
};

const retryMatchAutomation: MatchCommandDispatcher["retryMatchAutomation"] = (args) => {
  announce(
    "info",
    `[沙盒] 重试自动化事件 ev=${args.eventId.slice(0, 8)}`,
    `REST: POST /api/v1/matches/${args.matchId}/automations/${args.eventId}/retry`,
  );
  return Promise.resolve(okBool());
};

const retryIrcJob: MatchCommandDispatcher["retryIrcJob"] = (args) => {
  announce(
    "info",
    `[沙盒] 重试 IRC 抓取 job=${args.jobId.slice(0, 8)}`,
    `REST: POST /api/v1/matches/${args.matchId}/irc/jobs/${args.jobId}/retry`,
  );
  return Promise.resolve(okBool());
};

/**
 * Final dispatcher object. Every method is wrapped so that we can splice in
 * `previewMeta()` (stable fake ids for the toast preview) without touching
 * the caller's args — the dispatcher as a whole is the contract, the wrappers
 * are an implementation detail.
 *
 * Each wrapper is typed `Parameters<Dispatcher[K]>[0]` so the inner `args`
 * is fully inferred. The wrappers then forward to the per-command toast
 * renderers which do their real work.
 *
 * Importantly: this dispatcher never inspects `matchId`, `expectedVersion`
 * or `commandId` from the caller's args (the `previewMeta()` helper just
 * uses stable placeholders for the toast text). That fulfills the
 * "doesn't use server info" requirement.
 */
type Dispatcher = MatchCommandDispatcher;

/** Helper: pull out the args type of a dispatcher method. */
type ArgsOf<K extends keyof Dispatcher> = Parameters<Dispatcher[K]>[0];

export const sandboxDispatcher: MatchCommandDispatcher = {
  banPoolSlot: (args: ArgsOf<"banPoolSlot">) => banPoolSlot({ ...args, ...previewMeta() }),
  placePiece: (args: ArgsOf<"placePiece">) => placePiece({ ...args, ...previewMeta() }),
  placeShiro: (args: ArgsOf<"placeShiro">) => placeShiro({ ...args, ...previewMeta() }),
  robPiece: (args: ArgsOf<"robPiece">) => robPiece({ ...args, ...previewMeta() }),
  requestTb: (args: ArgsOf<"requestTb">) => requestTb({ ...args, ...previewMeta() }),
  respondTbRequest: (args: ArgsOf<"respondTbRequest">) =>
    respondTbRequest({ ...args, ...previewMeta() }),
  markStrategistReady,

  startMatch: (args: ArgsOf<"startMatch">) => startMatch({ ...args, ...previewMeta() }),
  suspendMatch: (args: ArgsOf<"suspendMatch">) => suspendMatch({ ...args, ...previewMeta() }),
  resumeMatch: (args: ArgsOf<"resumeMatch">) => resumeMatch({ ...args, ...previewMeta() }),
  abortMatch: (args: ArgsOf<"abortMatch">) => abortMatch({ ...args, ...previewMeta() }),
  skipCurrentAction: (args: ArgsOf<"skipCurrentAction">) =>
    skipCurrentAction({ ...args, ...previewMeta() }),
  pauseTimer: (args: ArgsOf<"pauseTimer">) => pauseTimer({ ...args, ...previewMeta() }),
  resumeTimer: (args: ArgsOf<"resumeTimer">) => resumeTimer({ ...args, ...previewMeta() }),
  calibrateTimer: (args: ArgsOf<"calibrateTimer">) =>
    calibrateTimer({ ...args, ...previewMeta() }),
  grantAdditionalTime: (args: ArgsOf<"grantAdditionalTime">) =>
    grantAdditionalTime({ ...args, ...previewMeta() }),
  startTb: (args: ArgsOf<"startTb">) => startTb({ ...args, ...previewMeta() }),
  confirmBeatmapResult: (args: ArgsOf<"confirmBeatmapResult">) =>
    confirmBeatmapResult({ ...args, ...previewMeta() }),
  confirmTbResult: (args: ArgsOf<"confirmTbResult">) =>
    confirmTbResult({ ...args, ...previewMeta() }),
  recordSurrender: (args: ArgsOf<"recordSurrender">) =>
    recordSurrender({ ...args, ...previewMeta() }),
  refereeBanPoolSlot: (args: ArgsOf<"refereeBanPoolSlot">) =>
    refereeBanPoolSlot({ ...args, ...previewMeta() }),
  refereePlacePiece: (args: ArgsOf<"refereePlacePiece">) =>
    refereePlacePiece({ ...args, ...previewMeta() }),
  refereePlaceShiro: (args: ArgsOf<"refereePlaceShiro">) =>
    refereePlaceShiro({ ...args, ...previewMeta() }),
  refereeRobPiece: (args: ArgsOf<"refereeRobPiece">) =>
    refereeRobPiece({ ...args, ...previewMeta() }),
  refereeRequestTb: (args: ArgsOf<"refereeRequestTb">) =>
    refereeRequestTb({ ...args, ...previewMeta() }),
  refereeRespondTbRequest: (args: ArgsOf<"refereeRespondTbRequest">) =>
    refereeRespondTbRequest({ ...args, ...previewMeta() }),
  confirmIrcResult: (args: ArgsOf<"confirmIrcResult">) =>
    confirmIrcResult({ ...args, ...previewMeta() }),

  rejectIrcObservation,
  retryMatchAutomation,
  retryIrcJob,
};