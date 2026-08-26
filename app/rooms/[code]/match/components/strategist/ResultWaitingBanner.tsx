"use client";

/**
 * ResultWaitingBanner — visible read-only wait state for WAITING_FOR_RESULT.
 *
 * Rendered for ALL roles (spectators included). D9: there is no confirm
 * button here — result confirmation belongs to the referee console (M3).
 */

import type { WSSnapshot } from "../../lib/ws-protocol";

export default function ResultWaitingBanner({
  snapshot,
}: {
  snapshot: WSSnapshot | null;
}) {
  if (snapshot?.phase !== "WAITING_FOR_RESULT") return null;

  return (
    <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-center text-sm text-warning">
      本局比赛结束，等待裁判确认结果…
    </div>
  );
}
