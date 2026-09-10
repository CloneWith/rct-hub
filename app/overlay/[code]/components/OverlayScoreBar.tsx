"use client";

/**
 * OverlayScoreBar — compact score strip for casting.
 *
 * Red/Blue scores come from the authoritative WS snapshot (`wonCounts`); the
 * centre shows phase, turn and the countdown. An optional IPC badge renders
 * the local tournament-client score as a cross-check (D8 — never uploaded).
 *
 * `ipc` is owned by the page (one bridge per overlay) and passed down, so the
 * bridge hook is never re-invoked per component.
 */

import { useMatchClock, useMatchLive } from "../../../rooms/[code]/match/MatchLiveProvider";
import { computeTimerView, formatClock } from "../../../rooms/[code]/match/lib/timer";
import {
  LIFECYCLE_LABELS,
  PHASE_LABELS,
  TEAM_COLORS,
  TEAM_LABELS,
} from "../../../rooms/[code]/match/lib/visuals";
import type { IpcBridgeState } from "../lib/useIpcBridge";

function TeamScore({
  side,
  count,
  align,
}: {
  side: "RED" | "BLUE";
  count: number;
  align: "left" | "right";
}) {
  const color = TEAM_COLORS[side];
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-2 backdrop-blur-sm ${
        align === "right" ? "flex-row-reverse" : ""
      }`}
    >
      <span
        className="rounded-full px-2.5 py-0.5 text-sm font-bold"
        style={{ backgroundColor: `${color}26`, color }}
      >
        {TEAM_LABELS[side]}
      </span>
      <span className="min-w-8 text-center text-3xl font-black tabular-nums leading-none" style={{ color }}>
        {count}
      </span>
    </div>
  );
}

function IpcBadge({ ipc }: { ipc: IpcBridgeState }) {
  if (ipc.status !== "live" || !ipc.scoreVisible) return null;
  if (ipc.score1 === null || ipc.score2 === null) return null;
  return (
    <div
      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-0.5 text-xs font-semibold tabular-nums backdrop-blur-sm"
      title="本地 tourney IPC 实时分数（不经过后端）"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
      <span style={{ color: TEAM_COLORS.RED }}>{ipc.score1}</span>
      <span className="text-muted-foreground">:</span>
      <span style={{ color: TEAM_COLORS.BLUE }}>{ipc.score2}</span>
      {ipc.bestOf ? <span className="text-muted-foreground">/ {ipc.bestOf}</span> : null}
    </div>
  );
}

export default function OverlayScoreBar({
  ipc,
}: {
  /** IPC bridge state from the page (optional — audience mirrors omit it). */
  ipc?: IpcBridgeState | null;
}) {
  const { snapshot, clockOffsetMs } = useMatchLive();
  const now = useMatchClock();
  const timer = snapshot?.timer;
  const view = now !== null && timer ? computeTimerView(timer, now, clockOffsetMs) : null;

  const lifecycle = snapshot?.lifecycle ?? "READY";
  const phase = snapshot?.phase ?? "NONE";
  const phaseLabel = phase === "NONE" ? LIFECYCLE_LABELS[lifecycle] : PHASE_LABELS[phase];
  const turn = snapshot?.turn ?? 0;

  return (
    <div className="pointer-events-none flex items-center justify-between gap-4">
      <TeamScore side="RED" count={snapshot?.wonCounts.red ?? 0} align="left" />
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="rounded-full border border-white/10 bg-black/40 px-3 py-0.5 backdrop-blur-sm">
            {phaseLabel}
            {turn > 0 ? <span className="ml-1.5 text-muted-foreground">回合 {turn}</span> : null}
          </span>
          {view ? (
            <span
              className={`rounded-full border border-white/10 bg-black/40 px-3 py-0.5 font-mono tabular-nums backdrop-blur-sm ${
                !timer?.paused && view.expired ? "text-danger" : ""
              }`}
            >
              {formatClock(view.remainingMs)}
            </span>
          ) : null}
        </div>
        {ipc ? <IpcBadge ipc={ipc} /> : null}
      </div>
      <TeamScore side="BLUE" count={snapshot?.wonCounts.blue ?? 0} align="right" />
    </div>
  );
}
