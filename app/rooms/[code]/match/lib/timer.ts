/**
 * Timer rendering helpers.
 *
 * The snapshot timer is authoritative:
 * - running:  remaining = duration - (serverNow - startedAt)
 * - paused:   remaining = remainingAtPause
 * - not started: remaining = duration
 *
 * Local clock drift is compensated with the WS `serverTime` offset. Expiry is
 * display-only — the engine never auto-advances a turn on timeout, so the UI
 * just clamps at 0 and shows "等待裁判处理".
 */

import type { WSTimer } from "./ws-protocol";

export interface TimerView {
  /** Remaining milliseconds, clamped at 0. */
  remainingMs: number;
  /** Total duration for progress-bar rendering. */
  totalMs: number;
  running: boolean;
  expired: boolean;
}

/**
 * Compute the current timer view.
 *
 * @param timer   snapshot timer (authoritative)
 * @param nowMs   local `Date.now()` reading
 * @param offsetMs `serverTime - Date.now()` estimate from the WS channel
 */
export function computeTimerView(
  timer: WSTimer | undefined,
  nowMs: number,
  offsetMs: number,
): TimerView | null {
  if (!timer) return null;
  const totalMs = timer.durationMilliseconds;
  const serverNowMs = nowMs + offsetMs;

  let remainingMs: number;
  if (timer.paused) {
    remainingMs = timer.remainingAtPauseMilliseconds ?? totalMs;
  } else if (timer.startedAt) {
    const startedMs = Date.parse(timer.startedAt);
    remainingMs = Number.isFinite(startedMs)
      ? totalMs - (serverNowMs - startedMs)
      : totalMs;
  } else {
    remainingMs = totalMs;
  }

  const clamped = Math.max(0, remainingMs);
  return {
    remainingMs: clamped,
    totalMs,
    running: !timer.paused && Boolean(timer.startedAt) && clamped > 0,
    expired: !timer.paused && Boolean(timer.startedAt) && clamped <= 0,
  };
}

/** `m:ss` (or `h:mm:ss` beyond an hour) for countdown display. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}
