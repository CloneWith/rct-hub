/**
 * Overlay layout presets — pure local preference (localStorage, D8: no
 * backend involvement).
 *
 * - `board`  — chessboard only (OBS browser source minimal crop)
 * - `score`  — board + top score bar (recommended for casting)
 * - `full`   — board + score bar + mappool rail
 */

export type OverlayLayout = "board" | "score" | "full";

export const OVERLAY_LAYOUTS: ReadonlyArray<{ id: OverlayLayout; label: string }> = [
  { id: "board", label: "仅棋盘" },
  { id: "score", label: "棋盘+比分" },
  { id: "full", label: "全要素" },
];

const STORAGE_KEY = "rcthub:overlay:layout";
const DEFAULT_LAYOUT: OverlayLayout = "score";

export function loadOverlayLayout(): OverlayLayout {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && (raw === "board" || raw === "score" || raw === "full")) return raw;
  } catch {
    // storage unavailable — fall through to default
  }
  return DEFAULT_LAYOUT;
}

export function saveOverlayLayout(layout: OverlayLayout): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, layout);
  } catch {
    // non-fatal (private mode etc.)
  }
}
