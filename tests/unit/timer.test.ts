import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeTimerView, formatClock } from "../../app/rooms/[code]/match/lib/timer";

const BASE = Date.parse("2026-08-26T08:00:00.000Z");

function makeTimer(overrides: Partial<Parameters<typeof computeTimerView>[0]> = {}) {
  return {
    durationMilliseconds: 120_000,
    paused: false,
    ...overrides,
  };
}

describe("computeTimerView", () => {
  it("returns null for an undefined timer", () => {
    assert.equal(computeTimerView(undefined, BASE, 0), null);
  });

  it("not started -> full duration, not running, not expired", () => {
    assert.deepEqual(computeTimerView(makeTimer(), BASE, 0), {
      remainingMs: 120_000,
      totalMs: 120_000,
      running: false,
      expired: false,
    });
  });

  it("paused -> remainingAtPause wins", () => {
    const view = computeTimerView(
      makeTimer({ paused: true, remainingAtPauseMilliseconds: 45_000 }),
      BASE,
      0,
    );
    assert.equal(view?.remainingMs, 45_000);
    assert.equal(view?.running, false);
    assert.equal(view?.expired, false);
  });

  it("paused without remainingAtPause -> full duration", () => {
    const view = computeTimerView(makeTimer({ paused: true }), BASE, 0);
    assert.equal(view?.remainingMs, 120_000);
  });

  it("running -> duration minus elapsed, with server offset compensation", () => {
    const startedAt = new Date(BASE - 30_000).toISOString(); // 30s ago on server
    // Local clock lags server by 5s -> serverNow = now + 5000.
    const view = computeTimerView(makeTimer({ startedAt }), BASE, 5_000);
    assert.equal(view?.remainingMs, 120_000 - (30_000 + 5_000));
    assert.equal(view?.running, true);
    assert.equal(view?.expired, false);
  });

  it("local clock ahead of server subtracts offset", () => {
    const startedAt = new Date(BASE - 10_000).toISOString();
    const view = computeTimerView(makeTimer({ startedAt }), BASE, -4_000);
    assert.equal(view?.remainingMs, 120_000 - 6_000);
  });

  it("elapsed beyond duration clamps at 0 and marks expired", () => {
    const startedAt = new Date(BASE - 200_000).toISOString();
    const view = computeTimerView(makeTimer({ startedAt }), BASE, 0);
    assert.equal(view?.remainingMs, 0);
    assert.equal(view?.running, false);
    assert.equal(view?.expired, true);
  });

  it("invalid startedAt falls back to full duration", () => {
    const view = computeTimerView(makeTimer({ startedAt: "not-a-date" }), BASE, 0);
    assert.equal(view?.remainingMs, 120_000);
  });
});

describe("formatClock", () => {
  it("under a minute -> m:ss", () => {
    assert.equal(formatClock(0), "0:00");
    assert.equal(formatClock(59_000), "0:59");
  });

  it("ceil: 59.1s renders as 1:00", () => {
    assert.equal(formatClock(59_100), "1:00");
  });

  it("one minute -> 1:00", () => {
    assert.equal(formatClock(60_000), "1:00");
  });

  it("beyond an hour -> h:mm:ss", () => {
    assert.equal(formatClock(3_600_000), "1:00:00");
    assert.equal(formatClock(3_721_000), "1:02:01");
  });
});
