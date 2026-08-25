"use client";

/**
 * ChessPiece — SVG round piece (D6: SVG redraw, PNG swappable later).
 *
 * Visual states driven by the authoritative snapshot (`outcome` + `owner`):
 * - WAITING_RESULT: breathing glow ring
 * - WON: owner-colored ring (red/blue)
 * - DEAD: desaturated + diagonal slash
 * - WHITE: neutral ring
 */

import { DEAD_PIECE, MOD_LABELS, effectiveMod, modStyle } from "../../lib/visuals";
import type { TeamSide, WSBoardPiece } from "../../lib/ws-protocol";
import { TEAM_COLORS } from "../../lib/visuals";

export default function ChessPiece({ piece }: { piece: WSBoardPiece }) {
  const mod = effectiveMod(piece.mod, piece.forceMod);
  const dead = piece.outcome === "DEAD";
  const style: React.CSSProperties = dead
    ? { backgroundColor: DEAD_PIECE.bg, color: DEAD_PIECE.fg }
    : modStyle(mod);

  const showForceBadge = piece.mod === "FM" && piece.forceMod;
  const ownerRing =
    piece.outcome === "WON" && piece.owner
      ? TEAM_COLORS[piece.owner as TeamSide]
      : piece.outcome === "WHITE"
        ? "#FFFFFF"
        : undefined;

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center rounded-full border-2 shadow-md transition-transform ${
        piece.outcome === "WAITING_RESULT" ? "piece-breathing" : ""
      }`}
      style={{
        ...style,
        borderColor: ownerRing ?? "rgba(0,0,0,0.35)",
        ...(piece.outcome === "WON" && piece.owner
          ? { boxShadow: `0 0 0 3px ${TEAM_COLORS[piece.owner]}55` }
          : {}),
      }}
      title={`${MOD_LABELS[piece.mod]}${showForceBadge ? ` (FM→${piece.forceMod})` : ""} · ${piece.outcome}`}
    >
      <span className="select-none text-[min(2.2vw,1.1rem)] font-bold leading-none">
        {MOD_LABELS[mod]}
      </span>
      {showForceBadge && (
        <span className="absolute bottom-0 right-0 rounded bg-black/50 px-0.5 text-[0.55rem] font-semibold text-white">
          FM
        </span>
      )}
      {dead && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 40 40"
          aria-hidden
        >
          <line
            x1="6"
            y1="34"
            x2="34"
            y2="6"
            stroke="rgba(0,0,0,0.55)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}
