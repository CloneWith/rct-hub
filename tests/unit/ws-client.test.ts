import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { MatchWsClient, type MatchWsClientOptions } from "../../app/rooms/[code]/match/lib/ws-client";
import type { WSSnapshot, WSPublicEvent } from "../../app/rooms/[code]/match/lib/ws-protocol";

// ---------------------------------------------------------------------------
// Fake WebSocket — enough surface for the client's usage.
// ---------------------------------------------------------------------------

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
  }

  // --- test helpers ---
  open(): void {
    this.onopen?.();
  }

  receive(obj: unknown): void {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }

  serverClose(): void {
    this.onclose?.();
  }
}

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
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  mock.timers.setTime(BASE);
  (globalThis as Record<string, unknown>).WebSocket = FakeWebSocket;
});

afterEach(() => {
  mock.timers.reset();
  delete (globalThis as Record<string, unknown>).WebSocket;
});

describe("MatchWsClient.url", () => {
  it("maps http -> ws and appends /ws/match", () => {
    const { client } = makeClient();
    assert.equal(client.url, "ws://localhost:8080/ws/match");
  });

  it("maps https -> wss", () => {
    const { client } = makeClient({ apiBase: "https://rct.example.com" });
    assert.equal(client.url, "wss://rct.example.com/ws/match");
  });
});

describe("connect handshake", () => {
  it("reports connecting, then sends subscribe on open", () => {
    const { client, statuses } = makeClient();
    client.connect();
    assert.equal(statuses[0], "connecting");
    const ws = FakeWebSocket.instances[0];
    ws.open();
    assert.deepEqual(ws.sent, [
      JSON.stringify({ type: "subscribe", schemaVersion: 1, matchId: "abc123" }),
    ]);
  });

  it("marks the second attempt as reconnecting", () => {
    const { client, statuses } = makeClient();
    client.connect();
    FakeWebSocket.instances[0].serverClose();
    assert.ok(statuses.includes("reconnecting"));
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
    assert.equal(statuses.at(-1), "live");
    assert.equal(snapshots.length, 1);
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
    assert.equal(events.length, 1);
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
    assert.ok(statuses.includes("desynced"));
    mock.timers.tick(1);
    assert.equal(FakeWebSocket.instances.length, 2);
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
    assert.equal(offsets[0], 5_000);
  });
});

describe("reconnect backoff", () => {
  it("backs off 1s -> 2s -> 4s and caps at 30s", () => {
    const { client } = makeClient();
    client.connect();

    // attempt 1: 1000ms
    FakeWebSocket.instances[0].serverClose();
    mock.timers.tick(999);
    assert.equal(FakeWebSocket.instances.length, 1);
    mock.timers.tick(1);
    assert.equal(FakeWebSocket.instances.length, 2);

    // attempt 2: 2000ms
    FakeWebSocket.instances[1].serverClose();
    mock.timers.tick(2_000);
    assert.equal(FakeWebSocket.instances.length, 3);

    // attempt 3: 4000ms
    FakeWebSocket.instances[2].serverClose();
    mock.timers.tick(4_000);
    assert.equal(FakeWebSocket.instances.length, 4);

    // attempt 4: 8000ms
    FakeWebSocket.instances[3].serverClose();
    mock.timers.tick(8_000);
    assert.equal(FakeWebSocket.instances.length, 5);

    // attempt 5: 16000ms
    FakeWebSocket.instances[4].serverClose();
    mock.timers.tick(16_000);
    assert.equal(FakeWebSocket.instances.length, 6);

    // attempt 6: capped at 30s
    FakeWebSocket.instances[5].serverClose();
    mock.timers.tick(30_000);
    assert.equal(FakeWebSocket.instances.length, 7);

    // attempt 7: stays capped at 30s
    FakeWebSocket.instances[6].serverClose();
    mock.timers.tick(30_000);
    assert.equal(FakeWebSocket.instances.length, 8);
  });

  it("never reconnects after close()", () => {
    const { client } = makeClient();
    client.connect();
    client.close();
    FakeWebSocket.instances[0].serverClose();
    mock.timers.tick(120_000);
    assert.equal(FakeWebSocket.instances.length, 1);
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
    assert.ok(statuses.includes("failed"));
    assert.equal(client["closedByUser"], true);
    mock.timers.tick(60_000);
    assert.equal(FakeWebSocket.instances.length, 1);
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
    mock.timers.tick(1_000);
    assert.equal(FakeWebSocket.instances.length, 2);
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
    assert.ok(statuses.includes("desynced"));
    mock.timers.tick(1);
    assert.equal(FakeWebSocket.instances.length, 2);
  });
});
