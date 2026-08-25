"use client";

/**
 * BoardGrid — the 4×4 field.
 *
 * Renders `snapshot.board.cells` (authoritative). Cells carry their zone from
 * the backend (`board.go` ZoneAt quadrants), so the layout cannot drift from
 * the engine. Interaction affordances (legal-cell highlights) arrive in M2 —
 * this component accepts an optional `interactive` prop for forward compat.
 */

import type { WSBoard } from "../../lib/ws-protocol";
import { zoneStyle } from "../../lib/visuals";
import ChessPiece from "./ChessPiece";

export default function BoardGrid({
  board,
  children,
}: {
  board: WSBoard | null;
  children?: React.ReactNode;
}) {
  // Cells are delivered row-major (A1..D4); a 4-column grid reproduces the
  // physical layout without local coordinate math.
  const cells = board?.cells ?? Array.from({ length: 16 });

  return (
    <div className="relative aspect-square w-full max-w-[560px] select-none">
      <div className="grid h-full w-full grid-cols-4 grid-rows-4 gap-1.5 rounded-xl border border-border bg-black/20 p-1.5">
        {cells.map((cell, i) => {
          const zone = cell?.zone;
          return (
            <div
              key={cell?.cell ?? i}
              className="relative flex items-center justify-center rounded-lg border border-black/10"
              style={zone ? zoneStyle(zone) : undefined}
              data-cell={cell?.cell}
            >
              <span className="absolute left-1.5 top-1 text-[0.6rem] font-medium text-foreground/25">
                {cell?.cell}
              </span>
              {cell?.piece && (
                <div className="h-[72%] w-[72%]">
                  <ChessPiece piece={cell.piece} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {children}
    </div>
  );
}
