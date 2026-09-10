"use client";

/**
 * useRefereeInteractions — interaction hub for the referee console (M3).
 *
 * Wires the M3 command builders (`commands.ts`) to the referee UI:
 * - every command goes through `useMatchCommand` (commandId idempotency,
 *   expectedVersion guard, version-conflict → resync)
 * - proxy commands require `actingTeam` + a mandatory `reason`
 * - suspend/abort get a second `window.confirm` after the reason dialog
 *   (roadmap M3: "后两者 reason+二次确认")
 * - IRC connection/observations/jobs are polled GraphQL queries; the channel
 *   is derived from the room MP link
 * - IRC observation reject goes through the reason dialog so the audit trail
 *   has a meaningful reason
 *
 * Returns the mounted `refereeBar` (RefereeConsole) + `dialogs` to place in
 * the page layout, mirroring `useStrategistInteractions`.
 */

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { MatchByCodeResult, MatchIrcObservation } from "@/app/lib/hooks";
import {
  useIrcConnectionStatus,
  useIrcJobs,
  useIrcObservations,
} from "@/app/lib/hooks";
import { useMatchLive } from "../MatchLiveProvider";
import {
  abortMatch,
  calibrateTimer,
  confirmBeatmapResult,
  confirmIrcResult,
  confirmTbResult,
  grantAdditionalTime,
  pauseTimer,
  recordSurrender,
  refereeBanPoolSlot,
  refereePlacePiece,
  refereePlaceShiro,
  refereeRobPiece,
  rejectIrcObservation,
  resumeMatch,
  resumeTimer,
  retryIrcJob,
  retryMatchAutomation,
  skipCurrentAction,
  startMatch,
  startTb,
  suspendMatch,
  type ActingTeam,
} from "./commands";
import { useMatchCommand, type CommandFeedback } from "./useMatchCommands";
import { channelFromMPLink } from "./channel";
import RefereeConsole from "../components/referee/RefereeConsole";
import RefereeReasonDialog, {
  type ReasonIntent,
} from "../components/referee/RefereeReasonDialog";
import CalibrateTimerDialog from "../components/referee/CalibrateTimerDialog";
import SurrenderDialog from "../components/referee/SurrenderDialog";
import RefereeProxyDialog, {
  type ProxyIntent,
} from "../components/referee/RefereeProxyDialog";
import ResultConfirmationDialog from "../components/referee/ResultConfirmationDialog";

const FEEDBACK_TTL_MS = 5000;

export function useRefereeInteractions(match: MatchByCodeResult) {
  const { snapshot, matchId } = useMatchLive();
  const qc = useQueryClient();
  const referee = match.refereeView;

  const phase = snapshot?.phase ?? null;
  const lifecycle = snapshot?.lifecycle ?? null;
  const activeTeam = snapshot?.activeTeam ?? null;
  const matchStatus = match.status;
  const readiness = match.strategistReadiness;
  // surface two-phase start info into the console; only meaningful when the
  // match is still in PENDING status (engine lifecycle is still "READY").
  const awaitingStrategists =
    matchStatus === "PENDING" &&
    !(readiness?.redReady && readiness?.blueReady);

  // --- local UI state
  const [actingTeam, setActingTeam] = useState<ActingTeam>("RED");
  const [reasonIntent, setReasonIntent] = useState<ReasonIntent | null>(null);
  const [calibrateOpen, setCalibrateOpen] = useState(false);
  const [surrenderOpen, setSurrenderOpen] = useState(false);
  const [proxyIntent, setProxyIntent] = useState<ProxyIntent | null>(null);
  const [resultOpen, setResultOpen] = useState(false);

  // --- command hooks (one per referee command)
  const start = useMatchCommand(startMatch);
  const suspend = useMatchCommand(suspendMatch);
  const resume = useMatchCommand(resumeMatch);
  const abort = useMatchCommand(abortMatch);
  const skip = useMatchCommand(skipCurrentAction);
  const pause = useMatchCommand(pauseTimer);
  const resumeT = useMatchCommand(resumeTimer);
  const calibrate = useMatchCommand(calibrateTimer);
  const grant = useMatchCommand(grantAdditionalTime);
  const startTbCmd = useMatchCommand(startTb);
  const confirmBm = useMatchCommand(confirmBeatmapResult);
  const confirmTb = useMatchCommand(confirmTbResult);
  const surrender = useMatchCommand(recordSurrender);
  const proxyBan = useMatchCommand(refereeBanPoolSlot);
  const proxyPlace = useMatchCommand(refereePlacePiece);
  const proxyShiro = useMatchCommand(refereePlaceShiro);
  const proxyRob = useMatchCommand(refereeRobPiece);
  const ircConfirm = useMatchCommand(confirmIrcResult, {
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["match", matchId, "irc"] }),
  });

  // --- IRC queries (polled; channel derived from MP link)
  const channel = useMemo(
    () => channelFromMPLink(match.room?.settings?.mpLink),
    [match.room?.settings?.mpLink],
  );
  const ircStatus = useIrcConnectionStatus(matchId, Boolean(referee));
  const ircObs = useIrcObservations(matchId, channel, Boolean(referee));
  const ircJobs = useIrcJobs(matchId, Boolean(referee));

  // --- local feedback for the plain-Boolean mutations (no CommandMeta)
  const [ircFeedback, setIrcFeedback] = useState<CommandFeedback | null>(null);
  const [ircBusy, setIrcBusy] = useState(false);

  const showIrcFeedback = useCallback((fb: CommandFeedback) => {
    setIrcFeedback(fb);
    window.setTimeout(() => setIrcFeedback(null), FEEDBACK_TTL_MS);
  }, []);

  const invalidateIrc = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["match", matchId, "irc"] });
  }, [qc, matchId]);

  const onRejectObservation = useCallback(
    (observation: MatchIrcObservation) => {
      setReasonIntent({
        title: "拒绝 IRC 观察建议",
        description: `来自 ${observation.sender}：${observation.raw}`,
        confirmLabel: "确认拒绝",
        danger: true,
        onConfirm: async (reason: string) => {
          setReasonIntent(null);
          setIrcBusy(true);
          try {
            await rejectIrcObservation({ matchId, observationId: observation.id, reason });
            invalidateIrc();
            showIrcFeedback({ kind: "ok", message: "已拒绝该建议" });
          } catch {
            showIrcFeedback({ kind: "error", message: "拒绝失败，请重试" });
          } finally {
            setIrcBusy(false);
          }
        },
      });
    },
    [matchId, invalidateIrc, showIrcFeedback],
  );

  const onConfirmObservation = useCallback(
    (observation: MatchIrcObservation) => {
      const suggested = observation.suggestedResult;
      if (!suggested) return;
      void ircConfirm.mutate({
        observationId: observation.id,
        boardPieceId: suggested.boardPieceID,
        winningTeam: suggested.winningTeam,
      });
    },
    [ircConfirm],
  );

  const onRetryJob = useCallback(
    async (job: { id: string }) => {
      setIrcBusy(true);
      try {
        await retryIrcJob({ matchId, jobId: job.id });
        invalidateIrc();
        showIrcFeedback({ kind: "ok", message: "已重新发送" });
      } catch {
        showIrcFeedback({ kind: "error", message: "重试失败" });
      } finally {
        setIrcBusy(false);
      }
    },
    [matchId, invalidateIrc, showIrcFeedback],
  );

  const onRetryAutomation = useCallback(
    async (eventId: string) => {
      setIrcBusy(true);
      try {
        await retryMatchAutomation({ matchId, eventId });
        void qc.invalidateQueries({ queryKey: ["match", match.code] });
        showIrcFeedback({ kind: "ok", message: "已重试自动化任务" });
      } catch {
        showIrcFeedback({ kind: "error", message: "重试失败" });
      } finally {
        setIrcBusy(false);
      }
    },
    [matchId, match.code, qc, showIrcFeedback],
  );

  // --- dangerous flow actions: reason dialog + window.confirm second step
  const openDangerReason = useCallback(
    (
      title: string,
      description: string,
      confirmLabel: string,
      action: (reason: string) => void,
    ) => {
      setReasonIntent({
        title,
        description,
        confirmLabel,
        danger: true,
        onConfirm: (reason: string) => {
          if (!window.confirm(`确认${title}？\n原因：${reason}`)) return;
          setReasonIntent(null);
          action(reason);
        },
      });
    },
    [],
  );

  const openReason = useCallback(
    (title: string, description: string, confirmLabel: string, action: (reason: string) => void) => {
      setReasonIntent({
        title,
        description,
        confirmLabel,
        onConfirm: (reason: string) => {
          setReasonIntent(null);
          action(reason);
        },
      });
    },
    [],
  );

  // --- proxy confirm (dispatch by intent kind)
  const onProxyConfirm = useCallback(
    (reason: string, sacrificeSets?: string[][]) => {
      const intent = proxyIntent;
      if (!intent) return;
      setProxyIntent(null);
      if (intent.kind === "BAN" && intent.poolSlotId) {
        void proxyBan.mutate({ actingTeam, poolSlotId: intent.poolSlotId, reason });
      } else if (intent.kind === "PLACE" && intent.poolSlotId && intent.position) {
        void proxyPlace.mutate({
          actingTeam,
          poolSlotId: intent.poolSlotId,
          position: intent.position,
          reason,
        });
      } else if (intent.kind === "SHIRO" && intent.position) {
        void proxyShiro.mutate({ actingTeam, position: intent.position, reason });
      } else if (intent.kind === "ROB" && intent.targetPieceId && sacrificeSets) {
        void proxyRob.mutate({
          actingTeam,
          targetPieceId: intent.targetPieceId,
          sacrificeSets,
          reason,
        });
      }
    },
    [proxyIntent, actingTeam, proxyBan, proxyPlace, proxyShiro, proxyRob],
  );

  // --- result confirmation (beatmap piece vs TB)
  const resultPhase: "WAITING_FOR_RESULT" | "TB_PLAYING" =
    phase === "TB_PLAYING" ? "TB_PLAYING" : "WAITING_FOR_RESULT";

  const waitingPieces = useMemo(
    () =>
      (snapshot?.board.cells ?? [])
        .filter((c) => c.piece?.outcome === "WAITING_RESULT")
        .map((c) => ({
          id: c.piece!.id,
          mod: c.piece!.mod,
          owner: c.piece!.owner,
          cell: c.cell,
        })),
    [snapshot],
  );

  const onResultConfirm = useCallback(
    (payload: { winningTeam: ActingTeam; boardPieceId?: string }) => {
      setResultOpen(false);
      if (resultPhase === "TB_PLAYING") {
        void confirmTb.mutate({ winningTeam: payload.winningTeam });
      } else if (payload.boardPieceId) {
        void confirmBm.mutate({
          boardPieceId: payload.boardPieceId,
          winningTeam: payload.winningTeam,
        });
      }
    },
    [resultPhase, confirmTb, confirmBm],
  );

  const onSurrenderConfirm = useCallback(
    (surrenderingTeam: ActingTeam, confirmingPlayerIds: string[], reason: string) => {
      setSurrenderOpen(false);
      void surrender.mutate({ surrenderingTeam, confirmingPlayerIds, reason });
    },
    [surrender],
  );

  const onCalibrateConfirm = useCallback(
    (remainingMilliseconds: number, reason: string) => {
      setCalibrateOpen(false);
      void calibrate.mutate({ remainingMilliseconds, reason });
    },
    [calibrate],
  );

  // --- pending & feedback aggregation
  const anyPending =
    start.isPending ||
    suspend.isPending ||
    resume.isPending ||
    abort.isPending ||
    skip.isPending ||
    pause.isPending ||
    resumeT.isPending ||
    calibrate.isPending ||
    grant.isPending ||
    startTbCmd.isPending ||
    confirmBm.isPending ||
    confirmTb.isPending ||
    surrender.isPending ||
    proxyBan.isPending ||
    proxyPlace.isPending ||
    proxyShiro.isPending ||
    proxyRob.isPending ||
    ircConfirm.isPending ||
    ircBusy;

  const feedback =
    suspend.feedback ??
    resume.feedback ??
    abort.feedback ??
    skip.feedback ??
    start.feedback ??
    pause.feedback ??
    resumeT.feedback ??
    calibrate.feedback ??
    grant.feedback ??
    startTbCmd.feedback ??
    confirmBm.feedback ??
    confirmTb.feedback ??
    surrender.feedback ??
    proxyBan.feedback ??
    proxyPlace.feedback ??
    proxyShiro.feedback ??
    proxyRob.feedback ??
    ircConfirm.feedback ??
    ircFeedback;

  const clearFeedback = useCallback(() => {
    start.clearFeedback();
    suspend.clearFeedback();
    resume.clearFeedback();
    abort.clearFeedback();
    skip.clearFeedback();
    pause.clearFeedback();
    resumeT.clearFeedback();
    calibrate.clearFeedback();
    grant.clearFeedback();
    startTbCmd.clearFeedback();
    confirmBm.clearFeedback();
    confirmTb.clearFeedback();
    surrender.clearFeedback();
    proxyBan.clearFeedback();
    proxyPlace.clearFeedback();
    proxyShiro.clearFeedback();
    proxyRob.clearFeedback();
    ircConfirm.clearFeedback();
    setIrcFeedback(null);
  }, [
    start, suspend, resume, abort, skip, pause, resumeT, calibrate, grant,
    startTbCmd, confirmBm, confirmTb, surrender, proxyBan, proxyPlace, proxyShiro,
    proxyRob, ircConfirm,
  ]);

  // --- mounted UI
  const refereeBar: ReactNode = referee ? (
    <RefereeConsole
      referee={referee}
      lifecycle={lifecycle}
      phase={phase}
      activeTeam={activeTeam}
      actingTeam={actingTeam}
      isPending={anyPending}
      feedback={feedback}
      matchStatus={matchStatus}
      redReady={readiness?.redReady ?? false}
      blueReady={readiness?.blueReady ?? false}
      awaitingStrategists={awaitingStrategists}
      onClearFeedback={clearFeedback}
      onToggleActingTeam={setActingTeam}
      onStartMatch={() => void start.mutate({})}
      onSuspendMatch={() =>
        openDangerReason(
          "挂起比赛",
          "挂起后双方计时暂停，可稍后恢复。",
          "确认挂起",
          (reason) => void suspend.mutate({ reason }),
        )
      }
      onResumeMatch={() =>
        openReason(
          "恢复比赛",
          "恢复后按原状态继续计时。",
          "确认恢复",
          (reason) => void resume.mutate({ reason }),
        )
      }
      onAbortMatch={() =>
        openDangerReason(
          "中止比赛",
          "中止将结束本场比赛，此操作不可恢复。",
          "确认中止",
          (reason) => void abort.mutate({ reason }),
        )
      }
      onSkipCurrentAction={() =>
        openReason(
          "跳过当前行动",
          "将当前回合视为放弃并推进到下一行动。",
          "确认跳过",
          (reason) => void skip.mutate({ reason }),
        )
      }
      onRecordSurrender={() => setSurrenderOpen(true)}
      onPauseTimer={() =>
        openReason(
          "暂停计时",
          "暂停本回合计时。",
          "确认暂停",
          (reason) => void pause.mutate({ reason }),
        )
      }
      onResumeTimer={() =>
        openReason(
          "恢复计时",
          "继续本回合计时。",
          "确认恢复",
          (reason) => void resumeT.mutate({ reason }),
        )
      }
      onCalibrateTimer={() => setCalibrateOpen(true)}
      onGrantAdditionalTime={() =>
        openReason(
          "授予加时",
          "为当前回合追加额外时间。",
          "确认加时",
          (reason) => void grant.mutate({ reason }),
        )
      }
      onStartTb={() =>
        openReason(
          "开始 TB",
          "进入 TB 决胜局。",
          "确认开始",
          (reason) => void startTbCmd.mutate({ reason }),
        )
      }
      onConfirmResult={() => setResultOpen(true)}
      onProxyBan={(poolSlotId) => setProxyIntent({ kind: "BAN", poolSlotId })}
      onProxyPlace={(poolSlotId, position) =>
        setProxyIntent({ kind: "PLACE", poolSlotId, position })
      }
      onProxyShiro={(position) => setProxyIntent({ kind: "SHIRO", position })}
      onProxyRob={(targetPieceId, plans) =>
        setProxyIntent({ kind: "ROB", targetPieceId, plans })
      }
      onRetryAutomation={(eventId) => void onRetryAutomation(eventId)}
      irc={{
        status: ircStatus.data ?? null,
        observations: ircObs.data ?? [],
        jobs: ircJobs.data ?? [],
        channel,
        isConfirming: ircConfirm.isPending || ircBusy,
        onConfirm: onConfirmObservation,
        onReject: onRejectObservation,
        onRetryJob: (job) => void onRetryJob(job),
      }}
    />
  ) : null;

  const dialogs: ReactNode = (
    <>
      {reasonIntent && (
        <RefereeReasonDialog
          intent={reasonIntent}
          isPending={anyPending}
          onClose={() => setReasonIntent(null)}
        />
      )}
      {calibrateOpen && (
        <CalibrateTimerDialog
          isPending={calibrate.isPending}
          onConfirm={onCalibrateConfirm}
          onClose={() => setCalibrateOpen(false)}
        />
      )}
      {surrenderOpen && (
        <SurrenderDialog
          rosters={snapshot?.rosters ?? null}
          isPending={surrender.isPending}
          onConfirm={onSurrenderConfirm}
          onClose={() => setSurrenderOpen(false)}
        />
      )}
      {proxyIntent && (
        <RefereeProxyDialog
          intent={proxyIntent}
          actingTeam={actingTeam}
          isPending={anyPending}
          onConfirm={onProxyConfirm}
          onClose={() => setProxyIntent(null)}
        />
      )}
      {resultOpen && (
        <ResultConfirmationDialog
          phase={resultPhase}
          waitingPieces={waitingPieces}
          isPending={confirmBm.isPending || confirmTb.isPending}
          onConfirm={onResultConfirm}
          onClose={() => setResultOpen(false)}
        />
      )}
    </>
  );

  return {
    refereeBar,
    dialogs,
    hasReferee: Boolean(referee),
    channel,
  };
}
