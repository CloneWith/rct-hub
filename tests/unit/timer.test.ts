/**
 * Vitest port of the legacy `node:test` timer rendering suite.
 * Pure functions; no mocks or fake timers required.
 */
import { describe, expect, it } from "vitest";

import { computeTimerView, formatClock } from "@/app/rooms/[code]/match/lib/timer";
import type { WSTimer } from "@/app/rooms/[code]/match/lib/ws-protocol";

const BASE = Date.parse("2026-08-26T08:00:00.000Z");

function makeTimer(overrides: Partial<WSTimer> = {}): WSTimer {
  return {
    durationMilliseconds: 120_000,
    paused: false,
    ...overrides,
  };
}

describe("computeTimerView", () => {
  it("returns null for an undefined timer", () => {
    expect(computeTimerView(undefined, BASE, 0)).toBeNull();
  });

  it("not started -> full duration, not running, not expired", () => {
    expect(computeTimerView(makeTimer(), BASE, 0)).toEqual({
      remainingMs: 120_000,
      totalMs: 120_000,
      running: false,
      expired: false,
    });
  });

  it("paused -> remainingAtPause wins", () => {
    const view = computeTimerView(makeTimer({ paused: true, remainingAtPauseMilliseconds: 45_000 }), BASE, 0);
    expect(view?.remainingMs).toBe(45_000);
    expect(view?.running).toBe(false);
    expect(view?.expired).toBe(false);
  });

  it("paused without remainingAtPause -> full duration", () => {
    const view = computeTimerView(makeTimer({ paused: true }), BASE, 0);
    expect(view?.remainingMs).toBe(120_000);
  });

  it("running -> duration minus elapsed, with server offset compensation", () => {
    const startedAt = new Date(BASE - 30_000).toISOString(); // 30s ago on server
    // Local clock lags server by 5s -> serverNow = now + 5000.
    const view = computeTimerView(makeTimer({ startedAt }), BASE, 5_000);
    expect(view?.remainingMs).toBe(120_000 - (30_000 + 5_000));
    expect(view?.running).toBe(true);
    expect(view?.expired).toBe(false);
  });

  it("local clock ahead of server subtracts offset", () => {
    const startedAt = new Date(BASE - 10_000).toISOString();
    const view = computeTimerView(makeTimer({ startedAt }), BASE, -4_000);
    expect(view?.remainingMs).toBe(120_000 - 6_000);
  });

  it("elapsed beyond duration clamps at 0 and marks expired", () => {
    const startedAt = new Date(BASE - 200_000).toISOString();
    const view = computeTimerView(makeTimer({ startedAt }), BASE, 0);
    expect(view?.remainingMs).toBe(0);
    expect(view?.running).toBe(false);
    expect(view?.expired).toBe(true);
  });

  it("invalid startedAt falls back to full duration", () => {
    const view = computeTimerView(makeTimer({ startedAt: "not-a-date" }), BASE, 0);
    expect(view?.remainingMs).toBe(120_000);
  });
});

describe("formatClock", () => {
  it("under a minute -> m:ss", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(59_000)).toBe("0:59");
  });

  it("ceil: 59.1s renders as 1:00", () => {
    expect(formatClock(59_100)).toBe("1:00");
  });

  it("one minute -> 1:00", () => {
    expect(formatClock(60_000)).toBe("1:00");
  });

  it("beyond an hour -> h:mm:ss", () => {
    expect(formatClock(3_600_000)).toBe("1:00:00");
    expect(formatClock(3_721_000)).toBe("1:02:01");
  });
});