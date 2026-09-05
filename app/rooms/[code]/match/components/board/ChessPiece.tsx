"use client";

/**
 * ChessPiece — redesigned round board piece.
 *
 * Layers (bottom → top):
 * 1. Mod-colored body background.
 * 2. Repeating translucent triangle pattern placeholder (will be replaced by
 *    custom mod assets later).
 * 3. Centered mod icon + bottom-right index text. Default white; on WON the
 *    foreground is tinted by the owning team's color.
 * 4. White outer rim + outer drop shadow + inner shadow.
 * 5. For DEAD pieces: a dark overlay with an X mark (captured / consumed).
 *
 * Special states:
 * - WAITING_RESULT: white icon/index, subtle breathing ring.
 * - WON: team-colored icon/index.
 * - WHITE (Shiro): no icon/index, pale background.
 * - DEAD: dark mask + X.
 */

import { X } from "lucide-react";
import { MOD_ICON_CONFIG, MOD_PALETTES, TEAM_COLORS } from "../../lib/visuals";
import type { WSBoardPiece } from "../../lib/ws-protocol";

interface ChessPieceProps {
  piece: WSBoardPiece;
}

/** Procedural triangle pattern used as a placeholder texture inside pieces. */
const TRIANGLE_PATTERN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cpath d='M0 38 L10 14 L20 38 Z' fill='%23000' fill-opacity='0.06'/%3E%3Cpath d='M22 24 L32 2 L40 22 Z' fill='%23fff' fill-opacity='0.08'/%3E%3Cpath d='M14 0 L24 18 L34 0 Z' fill='%23000' fill-opacity='0.04'/%3E%3C/svg%3E")`;

export default function ChessPiece({ piece }: ChessPieceProps) {
  const { icon: ModIcon, label } = MOD_ICON_CONFIG[piece.mod];
  const palette = MOD_PALETTES[piece.mod];

  const won = piece.outcome === "WON";
  const waiting = piece.outcome === "WAITING_RESULT";
  const dead = piece.outcome === "DEAD";
  const white = piece.outcome === "WHITE";

  const ownerColor = won && piece.owner ? TEAM_COLORS[piece.owner] : undefined;
  const foregroundColor = ownerColor ?? "#FFFFFF";

  const isBlank = white || dead;
  const showIcon = !isBlank;
  const showIndex = !isBlank && piece.index != null;

  return (
    <div
      className={`relative aspect-square h-full w-full select-none rounded-full ${waiting ? "piece-breathing" : ""}`}
      title={`${label}${piece.forceMod ? `→${piece.forceMod}` : ""} · ${piece.outcome}${piece.owner ? ` · ${piece.owner}` : ""}`}
    >
      {/* Outer frame + drop shadow + inner shadow */}
      <div
        className="relative h-full w-full overflow-hidden rounded-full border-[3px] border-white"
        style={{
          backgroundColor: white ? "#F5F5F5" : palette.bg,
          boxShadow: `
            0 4px 8px rgba(0, 0, 0, 0.35),
            inset 0 2px 6px rgba(0, 0, 0, 0.22),
            inset 0 -2px 4px rgba(0, 0, 0, 0.12)
          `,
        }}
      >
        {/* Triangle texture placeholder */}
        {!white && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ backgroundImage: TRIANGLE_PATTERN, backgroundSize: "40px 40px" }}
          />
        )}

        {/* Mod icon */}
        {showIcon && (
          <div className="absolute inset-0 flex items-center justify-center">
            <ModIcon
              className="h-[52%] w-[52%]"
              strokeWidth={2.2}
              style={{ color: foregroundColor }}
              aria-hidden
            />
          </div>
        )}

        {/* Pool slot index */}
        {showIndex && (
          <span
            className="absolute bottom-[12%] right-[14%] text-[0.75rem] font-extrabold leading-none"
            style={{
              color: foregroundColor,
              textShadow: "0 1px 2px rgba(0,0,0,0.35)",
            }}
          >
            {piece.index}
          </span>
        )}

        {/* Dead overlay */}
        {dead && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
            <X className="h-[45%] w-[45%] text-white/80" strokeWidth={3} aria-hidden />
          </div>
        )}
      </div>
    </div>
  );
}
