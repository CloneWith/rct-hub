"use client";

/**
 * useStrategistInteractions — interaction hub for the strategist & captain
 * roles (M2).
 *
 * Derives every interaction affordance from the backend `analysis` views
 * (D5 — no client-side rule engine):
 * - `selectableSlotIDs`: ban candidates (BAN phase) / pickable slots (PICK)
 * - `highlightedCells`: legal drop cells for the selected slot, or Shiro
 *   candidates
 * - `robTargetIDs`: valid robbery targets (click a piece to open the flow)
 *
 * Optimistic mode is deliberately light (D5): we never pre-render a future
 * board — only pending/transition UI states; the next WS snapshot is the
 * authority. D9: WAITING_FOR_RESULT is read-only here.
 *
 * Returns prepared props for BoardGrid / MapPoolPanel plus the action bars,
 * dialogs and the result-waiting banner to mount in the page layout.
 */

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { MatchByCodeResult } from "@/app/lib/hooks";
import { useMatchLive } from "../MatchLiveProvider";
import { CommandTransportError } from "./commands";
import { cellToPosition } from "./board";
import { loadSoundEnabled, playEffect } from "./sounds";
import {
  newTbRequestId,
  useMatchCommand,
  type CommandFeedback,
} from "./useMatchCommands";
import CaptainActionBar from "../components/strategist/CaptainActionBar";
import ResultWaitingBanner from "../components/strategist/ResultWaitingBanner";
import RobberyFlowDialog from "../components/strategist/RobberyFlowDialog";
import StrategistActionBar from "../components/strategist/StrategistActionBar";
import TBRequestDialog from "../components/strategist/TBRequestDialog";

export function useStrategistInteractions(match: MatchByCodeResult) {
  const { snapshot, matchId, resync, commandDispatcher: dispatcher } = useMatchLive();
  const qc = useQueryClient();
  const strategist = match.strategistView;
  const captain = match.captainView;
  const phase = snapshot?.phase;
  const lifecycle = snapshot?.lifecycle;
  const matchStatus = match.status;
  const readiness = match.strategistReadiness;

  // --- local UI state (all selection happens locally; submit is the only write)
  const [selectedSlotID, setSelectedSlotID] = useState<string | null>(null);
  const [robTarget, setRobTarget] = useState<{
    pieceId: string;
    plans: { targetPieceID: string; sacrificeSets: string[][] }[];
  } | null>(null);
  const [tbOpen, setTbOpen] = useState(false);

  // --- readiness feedback (local-only — readiness is one-shot per strategist)
  const [readyPending, setReadyPending] = useState(false);
  const [readyFeedback, setReadyFeedback] = useState<CommandFeedback | null>(null);

  // --- command hooks (dispatch through the injected dispatcher so the dev
  //     sandbox can swap in a no-op stub without touching this hook)
  const ban = useMatchCommand(dispatcher.banPoolSlot);
  const place = useMatchCommand(dispatcher.placePiece, { onSuccess: () => setSelectedSlotID(null) });
  const shiro = useMatchCommand(dispatcher.placeShiro);
  const rob = useMatchCommand(dispatcher.robPiece, { onSuccess: () => setRobTarget(null) });
  const tbReq = useMatchCommand(dispatcher.requestTb, { onSuccess: () => setTbOpen(false) });
  const tbResp = useMatchCommand(dispatcher.respondTbRequest);

  // Strategy-side readiness is fixed at fetch time; use the bootstrap result,
  // refreshed whenever the bootstrap query is invalidated (e.g. via
  // `markStrategistReady` mutation onSuccess below).
  const myReadyBit =
    strategist?.myTeam === "RED"
      ? readiness?.redReady ?? false
      : readiness?.blueReady ?? false;
  const bothReady =
    (readiness?.redReady ?? false) && (readiness?.blueReady ?? false);
  const showReadyButton =
    Boolean(strategist) && matchStatus === "PENDING" && !myReadyBit;

  const canAct = Boolean(
    strategist?.isMyTurn && lifecycle === "RUNNING" && strategist,
  );
  const analysis = strategist?.analysis;
  const captainAnalysis = captain?.analysis;

  const anyPending =
    ban.isPending || place.isPending || shiro.isPending || rob.isPending;

  // --- pool affordances
  const selectableSlotIDs = useMemo(() => {
    const s = new Set<string>();
    if (!canAct || !analysis) return s;
    if (phase === "BAN" && analysis.allowedActions.includes("BAN_POOL_SLOT")) {
      for (const id of analysis.banPoolSlotIDs) s.add(id);
    } else if (
      phase === "PICK" &&
      analysis.allowedActions.includes("PLACE_PIECE")
    ) {
      for (const p of analysis.legalPlacements) s.add(p.poolSlotID);
    }
    return s;
  }, [canAct, analysis, phase]);

  const onSelectSlot = useCallback(
    (slotId: string) => {
      if (anyPending) return;
      if (phase === "BAN" && strategist) {
        void ban.mutate({ poolSlotId: slotId });
      } else if (phase === "PICK" && strategist) {
        setSelectedSlotID((cur) => (cur === slotId ? null : slotId));
      }
    },
    [anyPending, phase, strategist, ban],
  );

  // --- board affordances
  const highlightedCells = useMemo(() => {
    const s = new Set<string>();
    if (!canAct || !analysis) return s;
    if (phase === "PICK") {
      if (selectedSlotID) {
        for (const p of analysis.legalPlacements) {
          if (p.poolSlotID === selectedSlotID) s.add(p.cell);
        }
      } else if (analysis.allowedActions.includes("PLACE_SHIRO")) {
        for (const c of analysis.shiroCells) s.add(c);
      }
    }
    return s;
  }, [canAct, analysis, phase, selectedSlotID]);

  const robTargetIDs = useMemo(() => {
    const s = new Set<string>();
    if (!canAct || !analysis) return s;
    if (analysis.allowedActions.includes("ROB_PIECE")) {
      for (const p of analysis.robberyPlans) s.add(p.targetPieceID);
    }
    return s;
  }, [canAct, analysis]);

  const onCellClick = useCallback(
    (cell: string) => {
      if (robTarget || place.isPending || shiro.isPending) return;
      const pos = cellToPosition(cell);
      if (!pos || !snapshot) return;

      // Robbery target first: a piece sits on the clicked cell.
      if (robTargetIDs.size > 0 && analysis?.allowedActions.includes("ROB_PIECE")) {
        const boardCell = snapshot.board.cells.find((c) => c.cell === cell);
        const pieceId = boardCell?.piece?.id;
        if (pieceId && robTargetIDs.has(pieceId)) {
          const plans = analysis.robberyPlans.filter((p) => p.targetPieceID === pieceId);
          if (plans.length) {
            setRobTarget({ pieceId, plans });
            return;
          }
        }
      }

      // Regular placement (picked slot) or Shiro.
      if (selectedSlotID) {
        void place.mutate({ poolSlotId: selectedSlotID, position: pos });
      } else if (
        analysis?.allowedActions.includes("PLACE_SHIRO") &&
        analysis.shiroCells.includes(cell)
      ) {
        void shiro.mutate({ position: pos });
      } else {
        // Clicked a cell that is neither a robbery target nor a legal drop —
        // give the actor immediate feedback (legacy `unavailable` sample).
        if (loadSoundEnabled()) playEffect("unavailable");
      }
    },
    [robTarget, place, shiro, robTargetIDs, analysis, snapshot, selectedSlotID],
  );

  // --- TB (captain)
  const onRespondTb = useCallback(
    (accept: boolean) => {
      const rid = captainAnalysis?.pendingTBRequestID;
      if (!rid) return;
      void tbResp.mutate({ requestId: rid, accept });
    },
    [captainAnalysis, tbResp],
  );

  // --- readiness (two-phase start)
  const onMarkReady = useCallback(async () => {
    if (readyPending) return;
    setReadyPending(true);
    try {
      await dispatcher.markStrategistReady({ roomId: match.roomID });
      // Server is the source of truth — refetch the bootstrap so the strategist
      // sees the flipped readiness bit and (if both sides are now ready and the
      // room is casual/private) the auto-started lifecycle.
      await qc.invalidateQueries({ queryKey: ["match", match.code] });
      resync();
      setReadyFeedback({ kind: "ok", message: "已确认准备" });
    } catch (err) {
      const msg =
        err instanceof CommandTransportError ? err.message : "提交失败，请重试";
      setReadyFeedback({ kind: "error", message: msg });
    } finally {
      setReadyPending(false);
    }
  }, [readyPending, match.roomID, match.code, qc, resync, dispatcher]);

  const clearReadyFeedback = useCallback(() => setReadyFeedback(null), []);

  // --- feedback aggregation (latest non-null wins)
  const strategistFeedback =
    ban.feedback ?? place.feedback ?? shiro.feedback ?? rob.feedback;
  const clearStrategistFeedback = useCallback(() => {
    ban.clearFeedback();
    place.clearFeedback();
    shiro.clearFeedback();
    rob.clearFeedback();
  }, [ban, place, shiro, rob]);

  const captainFeedback = tbReq.feedback ?? tbResp.feedback;
  const clearCaptainFeedback = useCallback(() => {
    tbReq.clearFeedback();
    tbResp.clearFeedback();
  }, [tbReq, tbResp]);

  // --- mounted UI
  const strategistBar: ReactNode = strategist ? (
    <StrategistActionBar
      myTeam={strategist.myTeam}
      isMyTurn={strategist.isMyTurn ?? false}
      snapshot={snapshot}
      analysis={strategist.analysis}
      selectedSlotID={selectedSlotID}
      matchStatus={matchStatus}
      myReady={myReadyBit}
      bothReady={bothReady}
      showReadyButton={showReadyButton}
      isReadyPending={readyPending}
      readyFeedback={readyFeedback}
      onMarkReady={onMarkReady}
      clearReadyFeedback={clearReadyFeedback}
      feedback={strategistFeedback}
      clearFeedback={clearStrategistFeedback}
    />
  ) : null;

  const captainBar: ReactNode = captain ? (
    <CaptainActionBar
      myTeam={captain.myTeam}
      analysis={captain.analysis}
      onRequestTb={() => setTbOpen(true)}
      onRespondTb={onRespondTb}
      isPending={tbReq.isPending || tbResp.isPending}
      feedback={captainFeedback}
      clearFeedback={clearCaptainFeedback}
    />
  ) : null;

  const dialogs: ReactNode = (
    <>
      {robTarget && (
        <RobberyFlowDialog
          targetPieceId={robTarget.pieceId}
          plans={robTarget.plans}
          onClose={() => setRobTarget(null)}
          onSubmit={(sacrificeSets) =>
            void rob.mutate({ targetPieceId: robTarget.pieceId, sacrificeSets })
          }
          isPending={rob.isPending}
        />
      )}
      {tbOpen && captain && (
        <TBRequestDialog
          onClose={() => setTbOpen(false)}
          onConfirm={() => void tbReq.mutate({ requestId: newTbRequestId() })}
          isPending={tbReq.isPending}
        />
      )}
    </>
  );

  const resultBanner: ReactNode = <ResultWaitingBanner snapshot={snapshot} />;

  return {
    boardProps: {
      highlightedCells,
      robTargetIDs,
      onCellClick: canAct && !robTarget ? onCellClick : undefined,
    },
    poolProps: {
      selectableSlotIDs,
      selectedSlotID,
      onSelectSlot: canAct && !robTarget ? onSelectSlot : undefined,
    },
    strategistBar,
    captainBar,
    dialogs,
    resultBanner,
    hasInteraction: Boolean(strategist || captain),
    /** One-liner for status debugging (unused in UI). */
    activePhase: phase,
  };
}
