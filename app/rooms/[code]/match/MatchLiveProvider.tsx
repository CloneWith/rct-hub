"use client";

/**
 * MatchLiveProvider — realtime state layer for a single match.
 *
 * Owns one MatchWsClient per mounted match page and exposes:
 * - connection status (connecting/live/reconnecting/desynced/failed)
 * - the latest authoritative snapshot (version-gated: a snapshot is only
 *   applied when its version is NEWER than the current one, so WS events
 *   and future mutation responses can race safely)
 * - the last domain event (for animations / history)
 * - the server-clock offset (for countdown rendering)
 *
 * Refresh recovery: the provider only needs `matchId`; a page reload simply
 * re-mounts, resubscribes and receives a fresh snapshot.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { useIsClient } from "@/app/lib/hooks";
import { MatchWsClient, type WsConnectionStatus } from "./lib/ws-client";
import type { WSPublicEvent, WSSnapshot } from "./lib/ws-protocol";

export interface MatchLiveState {
  status: WsConnectionStatus;
  statusDetail?: string;
  snapshot: WSSnapshot | null;
  lastEvent: WSPublicEvent | null;
  /** `serverTime - Date.now()` in ms (best effort, refreshed per message). */
  clockOffsetMs: number;
}

interface MatchLiveContextValue extends MatchLiveState {
  /** The subscribed match id (from the URL bootstrap query). */
  matchId: string;
  /** Force an immediate resubscribe (e.g. manual retry button). */
  resync: () => void;
}

const MatchLiveContext = createContext<MatchLiveContextValue | null>(null);

function resolveApiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
}

export function MatchLiveProvider({
  matchId,
  children,
}: {
  matchId: string;
  children: ReactNode;
}) {
  const isClient = useIsClient();
  const [state, setState] = useState<MatchLiveState>({
    status: "connecting",
    snapshot: null,
    lastEvent: null,
    clockOffsetMs: 0,
  });
  const clientRef = useRef<MatchWsClient | null>(null);
  const lastMessageAtRef = useRef<number>(0);

  useEffect(() => {
    if (!isClient || !matchId) return;

    const client = new MatchWsClient({
      apiBase: resolveApiBase(),
      matchId,
      log: (...args) => console.debug("[match-ws]", ...args),
      onStatus: (status, detail) =>
        setState((prev) => ({ ...prev, status, statusDetail: detail })),
      onClockSync: (offsetMs) => {
        lastMessageAtRef.current = Date.now();
        setState((prev) => ({ ...prev, clockOffsetMs: offsetMs }));
      },
      onSnapshot: (snapshot) => {
        lastMessageAtRef.current = Date.now();
        setState((prev) =>
          prev.snapshot && snapshot.version <= prev.snapshot.version
            ? { ...prev, status: "live" } // stale duplicate — keep current state
            : { ...prev, snapshot, status: "live" },
        );
      },
      onEvent: (event, snapshot) => {
        lastMessageAtRef.current = Date.now();
        setState((prev) => {
          const newer =
            !prev.snapshot || snapshot.version > prev.snapshot.version;
          return {
            ...prev,
            status: "live",
            snapshot: newer ? snapshot : prev.snapshot,
            lastEvent: event,
          };
        });
      },
    });

    clientRef.current = client;
    client.connect();

    // After returning from a background tab, stale sockets may look alive
    // while the OS suspended them. If nothing arrived recently, resubscribe.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const silentFor = Date.now() - lastMessageAtRef.current;
      if (lastMessageAtRef.current > 0 && silentFor > 15_000) {
        client.resync();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clientRef.current = null;
      client.close();
    };
  }, [isClient, matchId]);

  const value = useMemo<MatchLiveContextValue>(
    () => ({
      matchId,
      ...state,
      resync: () => clientRef.current?.resync(),
    }),
    [matchId, state],
  );

  return <MatchLiveContext.Provider value={value}>{children}</MatchLiveContext.Provider>;
}

export function useMatchLive(): MatchLiveContextValue {
  const ctx = useContext(MatchLiveContext);
  if (!ctx) {
    throw new Error("useMatchLive must be used within <MatchLiveProvider>");
  }
  return ctx;
}

/**
 * Ticking clock for countdown rendering.
 *
 * Implemented as a shared `useSyncExternalStore` store (same pattern as the
 * project's `useIsClient`): one global interval serves every subscriber and
 * the snapshot is cached between ticks. Returns null during SSR/hydration —
 * during hydration React uses the server snapshot, then re-checks the client
 * snapshot afterwards, so no mismatch can occur.
 */

const CLOCK_INTERVAL_MS = 250;
const clockListeners = new Set<() => void>();
let clockNow = 0;
let clockTimer: ReturnType<typeof setInterval> | null = null;

function subscribeClock(listener: () => void): () => void {
  clockListeners.add(listener);
  if (!clockTimer) {
    clockTimer = setInterval(() => {
      clockNow = Date.now();
      for (const l of clockListeners) l();
    }, CLOCK_INTERVAL_MS);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

function getClockSnapshot(): number {
  if (clockNow === 0) clockNow = Date.now();
  return clockNow;
}

function getClockServerSnapshot(): number {
  return 0;
}

export function useMatchClock(): number | null {
  const now = useSyncExternalStore(subscribeClock, getClockSnapshot, getClockServerSnapshot);
  return now === 0 ? null : now;
}
