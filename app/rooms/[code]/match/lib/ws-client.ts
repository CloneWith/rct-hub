/**
 * Read-only match WebSocket client (`GET /ws/match`).
 *
 * Responsibilities:
 * - connect + send the `subscribe` handshake (must arrive within 10s);
 - exponential-backoff reconnect (1s → 30s cap), resubscribing from scratch
 *   (the backend always answers with a fresh full snapshot);
 * - validate the `sequence` monotonicity; a gap means we missed an event —
 *   the backend would send `resync_required` anyway, so we self-heal by
 *   reconnecting immediately;
 * - track the server clock offset from `serverTime` for timer rendering.
 *
 * Commands NEVER go through this socket — all writes are GraphQL mutations.
 */

import {
  FATAL_ERROR_CODES,
  WSOutboundMessage,
  WSSnapshot,
  WSPublicEvent,
  WSSubscribeMessage,
} from "./ws-protocol";

export type WsConnectionStatus =
  | "connecting"
  | "live"
  | "reconnecting"
  | "desynced"
  | "failed";

export interface MatchWsClientOptions {
  /** Backend origin, e.g. `http://localhost:8080`. */
  apiBase: string;
  /** ObjectID hex of the match to subscribe to. */
  matchId: string;
  onStatus: (status: WsConnectionStatus, detail?: string) => void;
  onSnapshot: (snapshot: WSSnapshot) => void;
  onEvent: (event: WSPublicEvent, snapshot: WSSnapshot) => void;
  /**
   * Best-effort estimate of `serverTime - Date.now()` in ms, refreshed on
   * every message. Used to render countdowns without trusting the local clock.
   */
  onClockSync?: (offsetMs: number) => void;
  /** Logs diagnostics when provided (dev). */
  log?: (...args: unknown[]) => void;
}

const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
/** If no message arrives for this long while "live", force a reconnect. */
const SILENCE_TIMEOUT_MS = 60_000;

export class MatchWsClient {
  private opts: MatchWsClientOptions;
  private ws: WebSocket | null = null;
  private closedByUser = false;
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSequence: number | null = null;

  constructor(opts: MatchWsClientOptions) {
    this.opts = opts;
  }

  get url(): string {
    const wsBase = this.opts.apiBase.replace(/^http/, "ws");
    return `${wsBase}/ws/match`;
  }

  connect(): void {
    if (this.ws) return;
    this.closedByUser = false;
    this.opts.onStatus(this.attempt === 0 ? "connecting" : "reconnecting");
    this.openSocket();
  }

  close(): void {
    this.closedByUser = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      try {
        this.ws.close();
      } catch {
        // already closing
      }
      this.ws = null;
    }
    this.lastSequence = null;
  }

  /** Force an immediate resubscribe (e.g. after `resync_required`). */
  resync(): void {
    this.opts.onStatus("desynced");
    this.teardownSocket();
    this.attempt = 0; // resync is not a failure — reset backoff
    this.scheduleReconnect(0);
  }

  // ---------------------------------------------------------------- internals

  private openSocket(): void {
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch (err) {
      this.opts.log?.("ws construct failed", err);
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      const subscribe: WSSubscribeMessage = {
        type: "subscribe",
        schemaVersion: 1,
        matchId: this.opts.matchId,
      };
      ws.send(JSON.stringify(subscribe));
      this.armSilenceTimer();
    };

    ws.onmessage = (raw) => {
      this.armSilenceTimer();
      let msg: WSOutboundMessage;
      try {
        msg = JSON.parse(raw.data as string) as WSOutboundMessage;
      } catch {
        this.opts.log?.("ws: non-JSON message dropped");
        return;
      }
      this.handleMessage(msg);
    };

    ws.onerror = () => {
      // onclose always follows; nothing to do here.
    };

    ws.onclose = () => {
      this.teardownSocket();
      if (this.closedByUser) return;
      this.scheduleReconnect();
    };
  }

  private handleMessage(msg: WSOutboundMessage): void {
    if (msg.serverTime) {
      const offset = Date.parse(msg.serverTime) - Date.now();
      if (Number.isFinite(offset)) this.opts.onClockSync?.(offset);
    }

    switch (msg.type) {
      case "snapshot": {
        this.lastSequence = msg.sequence;
        this.attempt = 0;
        this.opts.onStatus("live");
        this.opts.onSnapshot(msg.snapshot);
        break;
      }
      case "event": {
        const expected = this.lastSequence === null ? null : this.lastSequence + 1;
        if (expected !== null && msg.sequence !== expected) {
          this.opts.log?.(
            `ws: sequence gap (expected ${expected}, got ${msg.sequence}) — resync`,
          );
          this.resync();
          return;
        }
        this.lastSequence = msg.sequence;
        this.opts.onStatus("live");
        this.opts.onEvent(msg.event, msg.snapshot);
        break;
      }
      case "error": {
        if (FATAL_ERROR_CODES.has(msg.code)) {
          this.opts.onStatus("failed", msg.message || msg.code);
          this.close();
          return;
        }
        // Transient errors (e.g. EVENT_SOURCE_UNAVAILABLE): keep retrying.
        this.opts.log?.(`ws: error ${msg.code}: ${msg.message}`);
        this.teardownSocket();
        this.scheduleReconnect();
        break;
      }
      case "resync_required": {
        this.opts.log?.(`ws: resync_required (${msg.code})`);
        this.resync();
        break;
      }
    }
  }

  private teardownSocket(): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.clearSilenceTimer();
    this.lastSequence = null;
  }

  private scheduleReconnect(delayOverride?: number): void {
    if (this.closedByUser || this.reconnectTimer) return;
    const delay =
      delayOverride ?? Math.min(BACKOFF_BASE_MS * 2 ** this.attempt, BACKOFF_MAX_MS);
    this.attempt += 1;
    this.opts.onStatus("reconnecting");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  private armSilenceTimer(): void {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      this.opts.log?.("ws: silent for too long — forcing reconnect");
      this.teardownSocket();
      this.scheduleReconnect(0);
    }, SILENCE_TIMEOUT_MS);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearSilenceTimer();
  }
}
