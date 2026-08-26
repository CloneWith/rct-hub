/**
 * Board coordinate helpers.
 *
 * Cells are canonical board coordinates "A1".."D4" (mirror of
 * `matchengine.Cell` / `positionCell(column, row)`). Column = X = 0..3,
 * row = Y = 0..3. The GraphQL `PositionInput { row, col }` expects the same
 * zero-based domain coordinates.
 */

export function cellToPosition(cell: string): { row: number; col: number } | null {
  if (cell.length !== 2) return null;
  const col = cell.charCodeAt(0) - 65; // 'A'
  const row = cell.charCodeAt(1) - 49; // '1'
  if (col < 0 || col > 3 || row < 0 || row > 3) return null;
  return { row, col };
}
