/**
 * Vitest port of the legacy `node:test` suite for `MatchWsClient`.
 *
 * Uses `tests/utils/fakeWebSocket.ts` (extracted from the original file's
 * inline class) and Vitest's `vi.useFakeTimers({ toFake: ["setTimeout",
 * "clearTimeout", "Date"] })` — equivalent to `node:test`'s
 * `mock.timers.enable({ apis: ["setTimeout", "Date"] })`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MatchWsClient, type MatchWsClientOptions } from "@/app/rooms/[code]/match/lib/ws-client";
import type { WSPublicEvent, WSSnapshot } from "@/app/rooms/[code]/match/lib/ws-protocol";

import { FakeWebSocket, installFakeWebSocket, uninstallFakeWebSocket } from "../utils/fakeWebSocket";

const BASE = Date.parse("2026-08-26T08:00:00.000Z");

const MINI_SNAPSHOT: WSSnapshot = {
  version: 1,
  lifecycle: "RUNNING",
  phase: "PICK",
  firstBan: "RED",
  firstPick: "BLUE",
  turn: 1,
  activeTeam: "RED",
  poolSlots: [],
  board: { cells: [] },
  wonCounts: { red: 0, blue: 0 },
  timer: { durationMilliseconds: 120_000, paused: false },
  robberyUsed: { red: false, blue: false },
  teamPauseUsed: { red: false, blue: false },
  rosters: {
    red: { leaderId: "1", playerIds: [] },
    blue: { leaderId: "2", playerIds: [] },
  },
};

function makeClient(overrides: Partial<MatchWsClientOptions> = {}) {
  const statuses: string[] = [];
  const snapshots: WSSnapshot[] = [];
  const events: WSPublicEvent[] = [];
  const offsets: number[] = [];
  const client = new MatchWsClient({
    apiBase: "http://localhost:8080",
    matchId: "abc123",
    onStatus: (s) => statuses.push(s),
    onSnapshot: (s) => snapshots.push(s),
    onEvent: (e) => events.push(e),
    onClockSync: (o) => offsets.push(o),
    ...overrides,
  });
  return { client, statuses, snapshots, events, offsets };
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(BASE);
  installFakeWebSocket();
});

afterEach(() => {
  vi.useRealTimers();
  uninstallFakeWebSocket();
});

describe("MatchWsClient.url", () => {
  it("maps http -> ws and appends /ws/match", () => {
    const { client } = makeClient();
    expect(client.url).toBe("ws://localhost:8080/ws/match");
  });

  it("maps https -> wss", () => {
    const { client } = makeClient({ apiBase: "https://rct.example.com" });
    expect(client.url).toBe("wss://rct.example.com/ws/match");
  });
});

describe("connect handshake", () => {
  it("reports connecting, then sends subscribe on open", () => {
    const { client, statuses } = makeClient();
    client.connect();
    expect(statuses[0]).toBe("connecting");
    const ws = FakeWebSocket.instances[0];
    ws.open();
    expect(ws.sent).toEqual([JSON.stringify({ type: "subscribe", schemaVersion: 1, matchId: "abc123" })]);
  });

  it("marks the second attempt as reconnecting", () => {
    const { client, statuses } = makeClient();
    client.connect();
    FakeWebSocket.instances[0].serverClose();
    expect(statuses).toContain("reconnecting");
  });
});

describe("snapshot / event handling", () => {
  it("becomes live and forwards the snapshot", () => {
    const { client, statuses, snapshots } = makeClient();
    client.connect();
    FakeWebSocket.instances[0].receive({
      type: "snapshot",
      sequence: 7,
      serverTime: new Date(BASE).toISOString(),
      snapshot: MINI_SNAPSHOT,
    });
    expect(statuses.at(-1)).toBe("live");
    expect(snapshots.length).toBe(1);
  });

  it("forwards a contiguous event", () => {
    const { client, events } = makeClient();
    client.connect();
    const ws = FakeWebSocket.instances[0];
    ws.receive({ type: "snapshot", sequence: 7, snapshot: MINI_SNAPSHOT });
    ws.receive({
      type: "event",
      sequence: 8,
      event: { type: "PIECE_PLACED", sequence: 8 } as unknown as WSPublicEvent,
      snapshot: MINI_SNAPSHOT,
    });
    expect(events.length).toBe(1);
  });

  it("detects a sequence gap and resyncs immediately (self-heal)", () => {
    const { client, statuses } = makeClient();
    client.connect();
    const ws = FakeWebSocket.instances[0];
    ws.receive({ type: "snapshot", sequence: 7, snapshot: MINI_SNAPSHOT });
    ws.receive({
      type: "event",
      sequence: 9, // expected 8
      event: { type: "PIECE_PLACED", sequence: 9 } as unknown as WSPublicEvent,
      snapshot: MINI_SNAPSHOT,
    });
    expect(statuses).toContain("desynced");
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances.length).toBe(2);
  });

  it("reports the server clock offset from serverTime", () => {
    const { client, offsets } = makeClient();
    client.connect();
    FakeWebSocket.instances[0].receive({
      type: "snapshot",
      sequence: 1,
      serverTime: new Date(BASE + 5_000).toISOString(),
      snapshot: MINI_SNAPSHOT,
    });
    expect(offsets[0]).toBe(5_000);
  });
});

describe("reconnect backoff", () => {
  it("backs off 1s -> 2s -> 4s and caps at 30s", () => {
    const { client } = makeClient();
    client.connect();

    // attempt 1: 1000ms
    FakeWebSocket.instances[0].serverClose();
    vi.advanceTimersByTime(999);
    expect(FakeWebSocket.instances.length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances.length).toBe(2);

    // attempt 2: 2000ms
    FakeWebSocket.instances[1].serverClose();
    vi.advanceTimersByTime(2_000);
    expect(FakeWebSocket.instances.length).toBe(3);

    // attempt 3: 4000ms
    FakeWebSocket.instances[2].serverClose();
    vi.advanceTimersByTime(4_000);
    expect(FakeWebSocket.instances.length).toBe(4);

    // attempt 4: 8000ms
    FakeWebSocket.instances[3].serverClose();
    vi.advanceTimersByTime(8_000);
    expect(FakeWebSocket.instances.length).toBe(5);

    // attempt 5: 16000ms
    FakeWebSocket.instances[4].serverClose();
    vi.advanceTimersByTime(16_000);
    expect(FakeWebSocket.instances.length).toBe(6);

    // attempt 6: capped at 30s
    FakeWebSocket.instances[5].serverClose();
    vi.advanceTimersByTime(30_000);
    expect(FakeWebSocket.instances.length).toBe(7);

    // attempt 7: stays capped at 30s
    FakeWebSocket.instances[6].serverClose();
    vi.advanceTimersByTime(30_000);
    expect(FakeWebSocket.instances.length).toBe(8);
  });

  it("never reconnects after close()", () => {
    const { client } = makeClient();
    client.connect();
    client.close();
    FakeWebSocket.instances[0].serverClose();
    vi.advanceTimersByTime(120_000);
    expect(FakeWebSocket.instances.length).toBe(1);
  });
});

describe("error handling", () => {
  it("treats fatal error codes as terminal (failed + close)", () => {
    const { client, statuses } = makeClient();
    client.connect();
    FakeWebSocket.instances[0].receive({
      type: "error",
      code: "MATCH_NOT_FOUND",
      message: "gone",
      serverTime: new Date(BASE).toISOString(),
    });
    expect(statuses).toContain("failed");
    expect((client as unknown as { closedByUser: boolean }).closedByUser).toBe(true);
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances.length).toBe(1);
  });

  it("reconnects on transient errors", () => {
    const { client } = makeClient();
    client.connect();
    FakeWebSocket.instances[0].receive({
      type: "error",
      code: "EVENT_SOURCE_UNAVAILABLE",
      message: "transient",
      serverTime: new Date(BASE).toISOString(),
    });
    vi.advanceTimersByTime(1_000);
    expect(FakeWebSocket.instances.length).toBe(2);
  });

  it("responds to resync_required by resubscribing", () => {
    const { client, statuses } = makeClient();
    client.connect();
    FakeWebSocket.instances[0].receive({
      type: "resync_required",
      matchId: "abc123",
      code: "SEQUENCE_GAP",
      nextSequence: 42,
      serverTime: new Date(BASE).toISOString(),
    });
    expect(statuses).toContain("desynced");
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances.length).toBe(2);
  });
});