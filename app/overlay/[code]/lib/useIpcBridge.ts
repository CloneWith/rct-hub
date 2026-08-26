"use client";

/**
 * useIpcBridge — connect to the local tourney IPC bridge
 * (`tools/ipc-bridge/server.mjs`, ws://127.0.0.1:8455) and surface the
 * osu! tournament client score state.
 *
 * D8: this data never leaves the streamer's device — it is displayed locally
 * as a cross-check against the backend score (wonCounts). The bridge is an
 * independent local tool; when it is not running the hook simply reports
 * `offline` and the UI degrades gracefully.
 */

import { useEffect, useState } from "react";

export interface IpcBridgeState {
  status: "connecting" | "live" | "offline";
  /** Red-side score from the tournament client (score1). */
  score1: number | null;
  /** Blue-side score (score2). */
  score2: number | null;
  /** Whether the tournament client currently shows scores. */
  scoreVisible: boolean;
  bestOf: number | null;
  source: string | null;
  updatedAt: number | null;
}

const DEFAULT_URL = "ws://127.0.0.1:8455";
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 8_000;

function resolveBridgeUrl(): string {
  return process.env.NEXT_PUBLIC_IPC_BRIDGE_URL || DEFAULT_URL;
}

export function useIpcBridge(enabled = true): IpcBridgeState {
  const [state, setState] = useState<IpcBridgeState>({
    status: "connecting",
    score1: null,
    score2: null,
    scoreVisible: false,
    bestOf: null,
    source: null,
    updatedAt: null,
  });

  useEffect(() => {
    if (!enabled) return;

    let ws: WebSocket | null = null;
    let closed = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRetry = () => {
      if (closed) return;
      const delay = Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_MAX_MS);
      attempt += 1;
      retryTimer = setTimeout(connect, delay);
    };

    const connect = () => {
      if (closed) return;
      setState((prev) => ({ ...prev, status: "connecting" }));
      let socket: WebSocket;
      try {
        socket = new WebSocket(resolveBridgeUrl());
      } catch {
        scheduleRetry();
        return;
      }
      ws = socket;

      socket.onopen = () => {
        attempt = 0;
        setState((prev) => ({ ...prev, status: "live" }));
      };

      socket.onmessage = (raw) => {
        let msg: { type?: string } & Partial<IpcBridgeState>;
        try {
          msg = JSON.parse(raw.data as string) as typeof msg;
        } catch {
          return;
        }
        if (!msg || msg.type !== "ipc") return;
        setState({
          status: "live",
          score1: typeof msg.score1 === "number" ? msg.score1 : null,
          score2: typeof msg.score2 === "number" ? msg.score2 : null,
          scoreVisible: Boolean(msg.scoreVisible),
          bestOf: typeof msg.bestOf === "number" ? msg.bestOf : null,
          source: typeof msg.source === "string" ? msg.source : null,
          updatedAt: typeof msg.updatedAt === "number" ? msg.updatedAt : Date.now(),
        });
      };

      socket.onclose = () => {
        if (ws === socket) ws = null;
        if (closed) return;
        setState((prev) => ({ ...prev, status: "offline" }));
        scheduleRetry();
      };

      socket.onerror = () => {
        // onclose follows; nothing else to do here.
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
    };
  }, [enabled]);

  return state;
}
