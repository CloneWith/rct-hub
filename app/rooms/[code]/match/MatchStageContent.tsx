"use client";

/**
 * MatchStageContent — the entire board-screen layout (header + grid + pool +
 * left action rail), extracted as a pure component so it can be driven from
 * any source of `WSSnapshot` — production WS (`useMatchLive()`) or the
 * dev/sandbox fixtures.
 *
 * Why this lives outside `page.tsx`:
 * - The sandbox under `/dev/room-sandbox` needs to render the exact same UI
 *   tree, but with a fixture-driven snapshot instead of a WS-driven one.
 * - Keeping `useMatchLive()` calls out of this component lets sandbox /
 *   storybook / test harnesses reuse it without faking the live provider.
 * - The page-level component (`MatchStage`) wraps this in `MatchLiveProvider`
 *   and threads the WS snapshot through the `liveSnapshot` prop.
 */

import BoardGrid from "./components/board/BoardGrid";
import MapPoolPanel, { type PoolBeatmapMeta } from "./components/pool/MapPoolPanel";
import MatchHeader from "./components/info/MatchHeader";
import Countdown from "./components/info/Countdown";
import WinFlash from "./components/info/WinFlash";
import ConnectionBanner from "./components/ConnectionBanner";
import NarrowScreenGuard from "./components/NarrowScreenGuard";
import MatchSectionErrorBoundary from "./components/MatchSectionErrorBoundary";
import { LIFECYCLE_LABELS } from "./lib/visuals";
import { useStrategistInteractions } from "./lib/useStrategistInteractions";
import { useRefereeInteractions } from "./lib/useRefereeInteractions";
import { useMatchAnimations } from "./lib/useMatchAnimations";
import type {
  MatchLifecycle,
  MatchPhase,
  MatchResultReason,
  TBBasis,
  WSSnapshot,
} from "./lib/ws-protocol";
import type { useMatchByCode } from "@/app/lib/hooks";

/** Type mirror of the bootstrap GraphQL `matchByCode` result. */
export type BootstrapMatch = NonNullable<ReturnType<typeof useMatchByCode>["data"]>;

function matchStatusText(
  status: "PENDING" | "READY" | "ACTIVE" | "FINISHED" | "CANCELED",
): string {
  switch (status) {
    case "PENDING":
      return "开赛阶段：等待策略师确认准备";
    case "READY":
      return "开赛阶段：等待裁判确认开赛";
    case "ACTIVE":
      return "进行中";
    case "FINISHED":
      return "已结束";
    case "CANCELED":
      return "已取消";
  }
}

/** Project a backend bootstrap snapshot into the WS projection shape. */
export function toLiveSnapshot(source: BootstrapMatch["snapshot"]): WSSnapshot {
  return {
    version: Number(source.version),
    lifecycle: source.lifecycle as WSSnapshot["lifecycle"],
    phase: source.phase as WSSnapshot["phase"],
    firstBan: source.firstBan as WSSnapshot["firstBan"],
    firstPick: source.firstPick as WSSnapshot["firstPick"],
    turn: source.turn,
    activeTeam: source.activeTeam ?? undefined,
    poolSlots: source.poolSlots.map((slot) => ({
      id: slot.id,
      mod: slot.mod as WSSnapshot["poolSlots"][number]["mod"],
      state: slot.state as WSSnapshot["poolSlots"][number]["state"],
    })),
    board: {
      cells: source.board.cells.map((cell) => ({
        cell: cell.cell,
        row: cell.row,
        col: cell.col,
        zone: cell.zone as WSSnapshot["board"]["cells"][number]["zone"],
        piece: cell.piece
          ? {
              id: cell.piece.id,
              sourcePoolSlotId: cell.piece.sourcePoolSlotID,
              mod: cell.piece.mod as WSSnapshot["poolSlots"][number]["mod"],
              forceMod: cell.piece.forceMod ?? undefined,
              selectedBy: cell.piece.selectedBy as WSSnapshot["firstBan"],
              owner: cell.piece.owner ?? undefined,
              outcome: cell.piece.outcome as NonNullable<
                WSSnapshot["board"]["cells"][number]["piece"]
              >["outcome"],
            }
          : undefined,
      })),
    },
    wonCounts: source.wonCounts,
    timer: {
      startedAt: source.timer.startedAt ?? undefined,
      durationMilliseconds: source.timer.durationMilliseconds,
      paused: source.timer.paused,
      remainingAtPauseMilliseconds: source.timer.remainingAtPauseMilliseconds ?? undefined,
    },
    robberyUsed: source.robberyUsed,
    teamPauseUsed: source.teamPauseUsed,
    rosters: {
      red: { leaderId: source.rosters.red.leaderID, playerIds: source.rosters.red.playerIDs },
      blue: { leaderId: source.rosters.blue.leaderID, playerIds: source.rosters.blue.playerIDs },
    },
    pendingPieceId: source.pendingPieceID ?? undefined,
    pendingTBRequest: source.pendingTBRequest
      ? {
          id: source.pendingTBRequest.id,
          requestedBy: source.pendingTBRequest.requestedBy as WSSnapshot["firstBan"],
          basis: source.pendingTBRequest.basis as TBBasis,
        }
      : undefined,
    tbEntry: source.tbEntry
      ? {
          basis: source.tbEntry.basis as TBBasis,
          requestId: source.tbEntry.requestID ?? undefined,
          requestedBy: source.tbEntry.requestedBy ?? undefined,
        }
      : undefined,
    winner: source.winner ?? undefined,
    result: source.result
      ? {
          winner: source.result.winner as WSSnapshot["firstBan"],
          reason: source.result.reason as MatchResultReason,
          surrenderingTeam: source.result.surrenderingTeam ?? undefined,
          confirmingPlayerIds: source.result.confirmingPlayerIDs,
          wonCounts: source.result.wonCounts,
        }
      : undefined,
    stalemate: source.stalemate ? { wonCounts: source.stalemate.wonCounts } : undefined,
  };
}

export interface MatchStageContentProps {
  match: BootstrapMatch;
  /**
   * Override the live snapshot. When omitted or `null`, the component falls
   * back to the static `match.snapshot` projected via `toLiveSnapshot`.
   *
   * - Production: this is the WS snapshot returned by `useMatchLive()`.
   * - Sandbox/dev: this is a fixture snapshot driving local state.
   */
  liveSnapshot?: WSSnapshot | null;
  /**
   * Whether to mount the `NarrowScreenGuard` wrapper around the layout.
   * Production: true (mobile users see a "narrow screen" notice).
   * Sandbox/dev: false (sandbox is meant for inspecting UI states).
   */
  withNarrowScreenGuard?: boolean;
}

/**
 * Pure renderer of the match board screen.
 *
 * NO side effects: no fetching, no WS, no router. Just consumes the bootstrap
 * `match` plus an optional `liveSnapshot` override. Both the real page and
 * the sandbox wrap this the same way:
 *
 *   <MatchStageContent match={...} liveSnapshot={...} />
 */
export function MatchStageContent({
  match,
  liveSnapshot,
  withNarrowScreenGuard = false,
}: MatchStageContentProps) {
  const snapshot = liveSnapshot ?? toLiveSnapshot(match.snapshot);
  const interactions = useStrategistInteractions(match);
  const referee = useRefereeInteractions(match);
  const animations = useMatchAnimations();

  const fallback = {
    lifecycle: match.snapshot.lifecycle as MatchLifecycle,
    phase: match.snapshot.phase as MatchPhase,
    turn: match.snapshot.turn,
    activeTeam: match.snapshot.activeTeam,
    wonCounts: match.snapshot.wonCounts,
  };

  const poolMeta: PoolBeatmapMeta[] = match.pool.map((p) => ({
    poolSlotID: p.poolSlotID,
    metadataStatus: p.metadataStatus,
    beatmap: p.beatmap
      ? {
          onlineID: p.beatmap.onlineID,
          title: p.beatmap.title,
          artist: p.beatmap.artist,
          difficultyName: p.beatmap.difficultyName,
          starRating: p.beatmap.starRating,
          bpm: p.beatmap.bpm,
          totalLength: p.beatmap.totalLength,
          coverUrl: p.beatmap.coverUrl,
        }
      : null,
  }));

  const roomLabel = [match.room?.name, match.room?.round].filter(Boolean).join(" · ");

  const inner = (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-3 p-4">
      <ConnectionBanner />
      {animations.winnerFlash && (
        <WinFlash team={animations.winnerFlash.team} reason={animations.winnerFlash.reason} />
      )}
      <MatchHeader
        matchName={match.name}
        roomLabel={roomLabel || null}
        snapshot={snapshot}
        fallback={fallback}
      />
      <MatchSectionErrorBoundary name="phase-banner">
        {interactions.resultBanner}
      </MatchSectionErrorBoundary>

      <main className="grid flex-1 grid-cols-[280px_1fr_350px] gap-4">
          {/* Left column — timer, meta & actor actions */}
          <aside className="flex flex-col gap-3">
            <MatchSectionErrorBoundary name="countdown">
              <Countdown />
            </MatchSectionErrorBoundary>
            <div className="rounded-lg border border-border bg-background/40 p-3 text-xs text-muted-foreground">
              <p>状态：{LIFECYCLE_LABELS[snapshot?.lifecycle ?? fallback.lifecycle]}</p>
              <p className="mt-1">
                {matchStatusText(match.status)}
              </p>
              <p className="mt-1">
                先手：{snapshot ? (snapshot.firstPick === "RED" ? "红方" : "蓝方") : "—"}
                {" · "}首 Ban：{snapshot ? (snapshot.firstBan === "RED" ? "红方" : "蓝方") : "—"}
              </p>
              <p className="mt-1">
                夺棋：红方{snapshot?.robberyUsed.red ? "已用" : "可用"} / 蓝方
                {snapshot?.robberyUsed.blue ? "已用" : "可用"}
              </p>
              {snapshot?.result && (
                <p className="mt-2 font-semibold text-foreground">
                  比赛结束 —{" "}
                  {snapshot.result.winner === "RED" ? "红方胜利" : "蓝方胜利"}
                </p>
              )}
              {snapshot?.stalemate && (
                <p className="mt-2 font-semibold text-warning">
                  流局（{snapshot.stalemate.wonCounts.red} : {snapshot.stalemate.wonCounts.blue}）— 等待裁决
                </p>
              )}
            </div>
            <MatchSectionErrorBoundary name="strategist-bar">
              {interactions.strategistBar}
            </MatchSectionErrorBoundary>
            <MatchSectionErrorBoundary name="captain-bar">
              {interactions.captainBar}
            </MatchSectionErrorBoundary>
            <MatchSectionErrorBoundary name="referee-console">
              {referee.refereeBar}
            </MatchSectionErrorBoundary>
          </aside>

          {/* Center — the board */}
          <section className="flex items-center justify-center">
            <MatchSectionErrorBoundary name="board">
              <BoardGrid
                board={snapshot?.board ?? null}
                highlightedCells={interactions.boardProps.highlightedCells}
                robTargetIDs={interactions.boardProps.robTargetIDs}
                placedPieces={animations.placedPieces}
                wonPieces={animations.wonPieces}
                robbedPieces={animations.robbedPieces}
                onCellClick={interactions.boardProps.onCellClick}
              />
            </MatchSectionErrorBoundary>
          </section>

          {/* Right — mappool */}
          <aside className="min-h-0">
            <MatchSectionErrorBoundary name="pool">
              <MapPoolPanel
                poolSlots={snapshot?.poolSlots ?? null}
                poolMeta={poolMeta}
                selectableSlotIDs={interactions.poolProps.selectableSlotIDs}
                selectedSlotID={interactions.poolProps.selectedSlotID}
                onSelectSlot={interactions.poolProps.onSelectSlot}
              />
            </MatchSectionErrorBoundary>
          </aside>
      </main>

      {interactions.dialogs}
      {referee.dialogs}
    </div>
  );

  if (withNarrowScreenGuard) return <NarrowScreenGuard>{inner}</NarrowScreenGuard>;
  return inner;
}