"use client";

/**
 * WinFlash — full-screen win banner shown on MATCH_FINISHED (shared with the
 * overlay; keyframes `rcth-flash-in`/`rcth-fade-out` live in globals.css).
 */

import { TEAM_COLORS, TEAM_LABELS } from "../../lib/visuals";
import type { MatchResultReason, TeamSide } from "../../lib/ws-protocol";
import { resultReasonLabel } from "../../lib/useMatchAnimations";

export default function WinFlash({
  team,
  reason,
}: {
  team: TeamSide;
  reason: MatchResultReason;
}) {
  const color = TEAM_COLORS[team];
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div
        className="rcth-flash-in rcth-fade-out flex flex-col items-center gap-2 rounded-2xl border px-12 py-8 shadow-2xl"
        style={{ borderColor: `${color}66`, backgroundColor: `${color}1f` }}
      >
        <span className="text-5xl font-black tracking-widest" style={{ color }}>
          {TEAM_LABELS[team]} 获胜
        </span>
        <span className="text-sm text-foreground/70">{resultReasonLabel(reason)}</span>
      </div>
    </div>
  );
}
