"use client";

/**
 * ChessPiece — SVG round piece (D6: SVG redraw; PNG swappable later via the
 * same component).
 *
 * Migrated visual language from the legacy `FumoChessPiece`: a round disc
 * with a subtle radial sheen, an inner status ring and a small MOD tick mark.
 * Visual states are driven by the authoritative snapshot (`outcome` + owner):
 * - WAITING_RESULT: breathing glow ring
 * - WON: owner-colored ring + glow
 * - DEAD: desaturated + diagonal slash
 * - WHITE: neutral white ring
 */

import { DEAD_PIECE, MOD_LABELS, MOD_PALETTES, effectiveMod, TEAM_COLORS } from "../../lib/visuals";
import type { TeamSide, WSBoardPiece } from "../../lib/ws-protocol";

export default function ChessPiece({ piece }: { piece: WSBoardPiece }) {
  const mod = effectiveMod(piece.mod, piece.forceMod);
  const dead = piece.outcome === "DEAD";
  const palette = dead ? DEAD_PIECE : MOD_PALETTES[mod];

  const owner = piece.owner as TeamSide | undefined;
  const ownerColor =
    piece.outcome === "WON" && owner ? TEAM_COLORS[owner] : piece.outcome === "WHITE" ? "#FFFFFF" : undefined;

  const showForceBadge = piece.mod === "FM" && piece.forceMod;
  const label = MOD_LABELS[mod];

  // Small tick mark under the label — subtle nod to the legacy texture.
  const tickHue = dead ? "#9a9a9a" : palette.fg;

  return (
    <div
      className={`relative h-full w-full select-none ${piece.outcome === "WAITING_RESULT" ? "piece-breathing" : ""}`}
      title={`${MOD_LABELS[piece.mod]}${showForceBadge ? ` (FM→${piece.forceMod})` : ""} · ${piece.outcome}`}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
        <defs>
          {/* One gradient per mod — identical content, deduplicated visually
              by the browser (first instance wins). */}
          <radialGradient id={`rcth-sheen-${mod}`} cx="0.35" cy="0.3" r="0.9">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="38%" stopColor="#FFFFFF" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
          </radialGradient>
        </defs>

        {/* Disc body */}
        <circle cx="32" cy="32" r="29" fill={palette.bg} stroke={ownerColor ?? "rgba(0,0,0,0.45)"} strokeWidth="2.5" />
        <circle cx="32" cy="32" r="29" fill={`url(#rcth-sheen-${mod})`} />

        {/* Inner status ring */}
        <circle
          cx="32"
          cy="32"
          r="22.5"
          fill="none"
          stroke={ownerColor ?? "rgba(0,0,0,0.22)"}
          strokeWidth="1.5"
          strokeDasharray="2.5 3"
          opacity="0.85"
        />

        {/* MOD label */}
        <text
          x="32"
          y="39.5"
          textAnchor="middle"
          fontSize={label.length > 3 ? "15" : "19"}
          fontWeight="800"
          fill={palette.fg}
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {label}
        </text>

        {/* Small tick under the label */}
        <path d="M24 47 L32 43.5 L40 47 L40.6 49 L32 46.2 L23.4 49 Z" fill={tickHue} opacity="0.5" />

        {/* WON glow ring */}
        {ownerColor && (
          <circle cx="32" cy="32" r="29" fill="none" stroke={ownerColor} strokeWidth="3.5" opacity="0.9">
            <animate attributeName="r" values="29;31;29" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.45;0.9" dur="1.6s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Dead slash */}
        {dead && (
          <line x1="12" y1="52" x2="52" y2="12" stroke="rgba(0,0,0,0.6)" strokeWidth="5" strokeLinecap="round" />
        )}
      </svg>

      {showForceBadge && (
        <span className="absolute bottom-0 right-0 rounded bg-black/55 px-1 text-[0.55rem] font-bold text-white">
          FM
        </span>
      )}
    </div>
  );
}
