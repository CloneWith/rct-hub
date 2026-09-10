"use client";

/**
 * MatchHeader — identity, team scores, phase & turn indicator.
 *
 * All values come from the live snapshot; the initial GraphQL snapshot is
 * only used before the first WS message arrives.
 */

import type { WSSnapshot } from "../../lib/ws-protocol";
import {
  LIFECYCLE_LABELS,
  PHASE_LABELS,
  TEAM_COLORS,
  TEAM_LABELS,
} from "../../lib/visuals";
import type { MatchLifecycle, MatchPhase } from "../../lib/ws-protocol";

function TeamScore({
  team,
  count,
  active,
}: {
  team: "red" | "blue";
  count: number;
  active: boolean;
}) {
  const side = team === "red" ? "RED" : "BLUE";
  return (
    <div
      className={`flex min-w-24 flex-col items-center gap-1 rounded-lg border px-4 py-2 transition-shadow ${
        active ? "border-border shadow-[0_0_12px_var(--tw-shadow-color)]" : "border-transparent"
      }`}
      style={active ? ({ ["--tw-shadow-color" as string]: `${TEAM_COLORS[side]}66` }) : undefined}
    >
      <span
        className="rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: `${TEAM_COLORS[side]}26`, color: TEAM_COLORS[side] }}
      >
        {TEAM_LABELS[side]}
      </span>
      <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: TEAM_COLORS[side] }}>
        {count}
      </span>
    </div>
  );
}

const LIFECYCLE_TONE: Record<MatchLifecycle, string> = {
  READY: "bg-muted text-muted-foreground",
  RUNNING: "bg-success/15 text-success",
  SUSPENDED: "bg-warning/15 text-warning",
  ADJUDICATION_REQUIRED: "bg-warning/15 text-warning",
  FINISHED: "bg-primary/15 text-primary",
  ABORTED: "bg-danger/15 text-danger",
};

export default function MatchHeader({
  matchName,
  roomLabel,
  snapshot,
  fallback,
}: {
  matchName: string;
  roomLabel?: string | null;
  snapshot: WSSnapshot | null;
  fallback?: {
    lifecycle: MatchLifecycle;
    phase: MatchPhase;
    turn: number;
    activeTeam?: string | null;
    wonCounts: { red: number; blue: number };
  } | null;
}) {
  const s = snapshot ?? null;
  const lifecycle = (s?.lifecycle ?? fallback?.lifecycle ?? "READY") as MatchLifecycle;
  const phase = (s?.phase ?? fallback?.phase ?? "NONE") as MatchPhase;
  const turn = s?.turn ?? fallback?.turn ?? 0;
  const activeTeam = s?.activeTeam ?? fallback?.activeTeam ?? null;
  const won = s?.wonCounts ?? fallback?.wonCounts ?? { red: 0, blue: 0 };

  const turnLabel =
    phase === "BAN"
      ? `Ban 第 ${turn < 0 ? -turn : turn} 手`
      : phase === "PICK"
        ? `Pick 第 ${turn} 手`
        : `第 ${turn} 手`;

  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col">
        <h1 className="truncate text-lg font-bold">{matchName}</h1>
        {roomLabel && <p className="truncate text-xs text-muted-foreground">{roomLabel}</p>}
      </div>

      <div className="flex items-center gap-3">
        <TeamScore team="red" count={won.red} active={activeTeam === "RED"} />
        <div className="flex flex-col items-center gap-1">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LIFECYCLE_TONE[lifecycle]}`}>
            {LIFECYCLE_LABELS[lifecycle]}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {PHASE_LABELS[phase]} · {turnLabel}
          </span>
        </div>
        <TeamScore team="blue" count={won.blue} active={activeTeam === "BLUE"} />
      </div>
    </header>
  );
}
