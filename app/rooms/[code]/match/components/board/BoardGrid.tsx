"use client";

/**
 * BoardGrid — the 4×4 field.
 *
 * Renders `snapshot.board.cells` (authoritative). Cells carry their zone from
 * the backend (`board.go` ZoneAt quadrants), so the layout cannot drift from
 * the engine.
 *
 * Interaction (M2): optional `highlightedCells` (legal placements / Shiro
 * candidates) and `robTargetIDs` (robbery targets) drive click affordances.
 * The component only reports clicks — it never judges legality itself; that
 * comes from the backend `analysis` (D5).
 */

import type { WSBoard } from "../../lib/ws-protocol";
import { zoneStyle } from "../../lib/visuals";
import ChessPiece from "./ChessPiece";

export default function BoardGrid({
  board,
  children,
  highlightedCells,
  robTargetIDs,
  placedPieces,
  wonPieces,
  robbedPieces,
  onCellClick,
}: {
  board: WSBoard | null;
  children?: React.ReactNode;
  /** Legal drop cells (from analysis.legalPlacements / shiroCells). */
  highlightedCells?: ReadonlySet<string>;
  /** Piece ids that are valid robbery targets (analysis.robberyPlans). */
  robTargetIDs?: ReadonlySet<string>;
  /** Transient animation sets (useMatchAnimations) — shared classes with overlay. */
  placedPieces?: ReadonlySet<string>;
  wonPieces?: ReadonlySet<string>;
  robbedPieces?: ReadonlySet<string>;
  onCellClick?: (cell: string) => void;
}) {
  // Cells are delivered row-major (A1..D4); a 4-column grid reproduces the
  // physical layout without local coordinate math.
  const cells = board?.cells ?? Array.from({ length: 16 });

  return (
    <div className="relative aspect-square w-full max-w-[560px] select-none">
      <div className="grid h-full w-full grid-cols-4 grid-rows-4 gap-1.5 rounded-xl border border-border bg-black/20 p-1.5">
        {cells.map((cell, i) => {
          const zone = cell?.zone;
          const highlighted = Boolean(cell && highlightedCells?.has(cell.cell));
          const robTarget = Boolean(cell?.piece && robTargetIDs?.has(cell.piece.id));
          const clickable = (highlighted || robTarget) && Boolean(onCellClick);

          let ring = "";
          if (robTarget) ring = "ring-2 ring-warning/80";
          else if (highlighted) ring = "ring-2 ring-success/80";

          const piece = cell?.piece;
          let animClass = "";
          if (piece) {
            if (placedPieces?.has(piece.id)) animClass = "rcth-anim-pop";
            else if (wonPieces?.has(piece.id)) animClass = "rcth-anim-win";
            else if (robbedPieces?.has(piece.id)) animClass = "rcth-anim-rob";
          }

          return (
            <div
              key={cell?.cell ?? i}
              className={`relative flex items-center justify-center rounded-lg border border-black/10 transition-shadow ${
                clickable ? "cursor-pointer hover:brightness-125" : ""
              } ${ring}`}
              style={zone ? zoneStyle(zone) : undefined}
              data-cell={cell?.cell}
              role={clickable ? "button" : undefined}
              aria-label={
                clickable
                  ? robTarget
                    ? `夺棋 ${cell?.piece?.id ?? cell?.cell}`
                    : `落子到 ${cell?.cell}`
                  : undefined
              }
              onClick={clickable ? () => onCellClick?.(cell!.cell) : undefined}
            >
              <span className="absolute left-1.5 top-1 text-[0.6rem] font-medium text-foreground/25">
                {cell?.cell}
              </span>
              {piece && (
                <div className={`h-[72%] w-[72%] ${animClass}`}>
                  <ChessPiece piece={piece} />
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
