"use client";

/**
 * OverlayBoard — 4×4 board for the overlay.
 *
 * Deliberately does NOT reuse `BoardGrid`: the overlay needs per-cell
 * animation classes (place/win/rob) and a transparent treatment, and it must
 * stay free of the room page's interaction props. It reuses `ChessPiece` and
 * `zoneStyle` so the piece visuals are identical across surfaces.
 */

import { useMemo } from "react";
import ChessPiece from "../../../rooms/[code]/match/components/board/ChessPiece";
import { zoneStyle } from "../../../rooms/[code]/match/lib/visuals";
import type { WSBoard } from "../../../rooms/[code]/match/lib/ws-protocol";

/** Inline keyframes — kept local to the overlay, global CSS untouched. */
const OVERLAY_ANIM_CSS = `
@keyframes rcth-pop {
  0%   { transform: scale(0.2); opacity: 0; }
  60%  { transform: scale(1.12); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes rcth-win-pulse {
  0%   { transform: scale(1); filter: brightness(1); }
  50%  { transform: scale(1.15); filter: brightness(1.5); }
  100% { transform: scale(1); filter: brightness(1.15); }
}
@keyframes rcth-rob-flash {
  0%   { transform: scale(1); filter: hue-rotate(0deg); }
  50%  { transform: scale(0.85) rotate(-8deg); filter: hue-rotate(160deg) brightness(1.6); }
  100% { transform: scale(1); filter: hue-rotate(0deg); }
}
.rcth-anim-pop { animation: rcth-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.rcth-anim-win { animation: rcth-win-pulse 0.8s ease-in-out both; }
.rcth-anim-rob { animation: rcth-rob-flash 0.8s ease-in-out both; }
`;

export default function OverlayBoard({
  board,
  placedPieces,
  wonPieces,
  robbedPieces,
}: {
  board: WSBoard | null;
  placedPieces?: ReadonlySet<string>;
  wonPieces?: ReadonlySet<string>;
  robbedPieces?: ReadonlySet<string>;
}) {
  const cells = board?.cells ?? [];

  const animCss = useMemo(() => OVERLAY_ANIM_CSS, []);

  return (
    <div className="relative aspect-square w-full select-none">
      <style>{animCss}</style>
      <div className="grid h-full w-full grid-cols-4 grid-rows-4 gap-1.5 rounded-xl border border-white/10 bg-black/30 p-1.5 backdrop-blur-[2px]">
        {cells.map((cell, i) => {
          const piece = cell.piece;
          let animClass = "";
          if (piece) {
            if (placedPieces?.has(piece.id)) animClass = "rcth-anim-pop";
            else if (wonPieces?.has(piece.id)) animClass = "rcth-anim-win";
            else if (robbedPieces?.has(piece.id)) animClass = "rcth-anim-rob";
          }
          return (
            <div
              key={cell.cell ?? i}
              className="relative flex items-center justify-center rounded-lg border border-white/5"
              style={zoneStyle(cell.zone)}
            >
              {piece && (
                <div className={`h-[74%] w-[74%] ${animClass}`}>
                  <ChessPiece piece={piece} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
