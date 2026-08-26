"use client";

/**
 * OverlayBoard — 4×4 board for the overlay.
 *
 * Deliberately does NOT reuse `BoardGrid`: the overlay needs per-cell
 * animation classes (place/win/rob) and a transparent treatment, and it must
 * stay free of the room page's interaction props. It reuses `ChessPiece` and
 * `zoneStyle` so the piece visuals are identical across surfaces.
 *
 * Animation classes (`rcth-anim-*`) are shared with the board room page —
 * defined once in globals.css (roadmap §3.7).
 */

import ChessPiece from "../../../rooms/[code]/match/components/board/ChessPiece";
import { zoneStyle } from "../../../rooms/[code]/match/lib/visuals";
import type { WSBoard } from "../../../rooms/[code]/match/lib/ws-protocol";

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

  return (
    <div className="relative aspect-square w-full select-none">
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
