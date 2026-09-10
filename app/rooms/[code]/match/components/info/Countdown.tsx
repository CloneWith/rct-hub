"use client";

/**
 * Countdown — snapshot-timer-driven countdown.
 *
 * Uses the server-clock offset from the WS channel; expiry is display-only
 * (the engine never auto-advances on timeout — shows "等待裁判处理").
 */

import { useMatchClock, useMatchLive } from "../../MatchLiveProvider";
import { computeTimerView, formatClock } from "../../lib/timer";

export default function Countdown() {
  const { snapshot, clockOffsetMs } = useMatchLive();
  const now = useMatchClock();

  const timer = snapshot?.timer;
  const view = now !== null ? computeTimerView(timer, now, clockOffsetMs) : null;

  if (!timer || !view) {
    return (
      <div className="flex h-14 items-center justify-center rounded-lg border border-border bg-background/40 text-sm text-muted-foreground">
        计时器未启动
      </div>
    );
  }

  const progress = view.totalMs > 0 ? Math.min(1, view.remainingMs / view.totalMs) : 0;
  const urgent = view.remainingMs <= 10_000;
  const color = timer.paused
    ? "text-muted-foreground"
    : urgent
      ? "text-danger"
      : "text-foreground";

  return (
    <div className="relative flex h-14 flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-background/40">
      <div
        className="absolute inset-y-0 left-0 bg-primary/10 transition-[width] duration-300"
        style={{ width: `${progress * 100}%` }}
        aria-hidden
      />
      <span className={`relative z-10 text-2xl font-bold tabular-nums ${color}`}>
        {formatClock(view.remainingMs)}
      </span>
      <span className="relative z-10 text-[0.65rem] text-muted-foreground">
        {timer.paused
          ? "已暂停"
          : view.expired
            ? "等待裁判处理"
            : timer.startedAt
              ? "剩余时间"
              : "准备开始"}
      </span>
    </div>
  );
}
