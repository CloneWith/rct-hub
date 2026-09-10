"use client";

/**
 * useOverlayAnimations — domain-event-driven animation layer (shared
 * philosophy with the board room, roadmap §3.7).
 *
 * Every animation is derived from the WS `lastEvent` and self-clears after a
 * short window; rendering always falls back to the authoritative snapshot.
 * Late joiners receive a fresh snapshot with NO animation replay (a flashing
 * board on load would be noise), but the finished-result banner still shows
 * statically.
 *
 * Sounds come from the shared module (real WAVs migrated from the legacy
 * client, synth fallback); toggled by the streamer panel and persisted to
 * localStorage.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useMatchLive } from "../../../rooms/[code]/match/MatchLiveProvider";
import {
  initSoundPref,
  loadSoundEnabled,
  playEffect,
  preloadSounds,
  saveSoundEnabled,
} from "../../../rooms/[code]/match/lib/sounds";
import type { MatchResultReason, TeamSide } from "../../../rooms/[code]/match/lib/ws-protocol";

// `resultReasonLabel` lives in the shared animation module; re-exported here
// for compatibility with the overlay page imports.
export { resultReasonLabel } from "../../../rooms/[code]/match/lib/useMatchAnimations";

export interface OverlayAnimationState {
  /** Piece ids that just landed (scale-in). */
  placedPieces: ReadonlySet<string>;
  /** Piece ids that just won (pulse ring). */
  wonPieces: ReadonlySet<string>;
  /** Piece ids that were just robbed (flip flash). */
  robbedPieces: ReadonlySet<string>;
  /** Full-screen win flash — only fired from live events, not late join. */
  winnerFlash: { team: TeamSide; reason: MatchResultReason } | null;
}

const PLACE_MS = 650;
const WIN_MS = 900;
const ROB_MS = 900;
const FLASH_MS = 6_000;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOverlayAnimations(): OverlayAnimationState {
  const { lastEvent, snapshot } = useMatchLive();

  // Migrate the legacy overlay sound key once (idempotent) and warm the
  // asset cache so real WAVs play from the first event.
  useEffect(() => {
    initSoundPref();
    if (loadSoundEnabled()) preloadSounds();
  }, []);

  const [placedPieces, setPlaced] = useState<ReadonlySet<string>>(new Set());
  const [wonPieces, setWon] = useState<ReadonlySet<string>>(new Set());
  const [robbedPieces, setRobbed] = useState<ReadonlySet<string>>(new Set());
  const [winnerFlash, setWinnerFlash] = useState<{
    team: TeamSide;
    reason: MatchResultReason;
  } | null>(null);

  const soundOnRef = useRef(loadSoundEnabled());
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const lastEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, []);

  const arm = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const event = lastEvent;
    if (!event) return;
    if (event.id === lastEventIdRef.current) return;
    lastEventIdRef.current = event.id;

    // Defer state writes into the next animation frame: the effect body only
    // observes `lastEvent` (an external-system subscription), while the actual
    // animation state updates happen in the rAF callback — no cascading
    // render, and one animation frame of latency is invisible on air.
    const raf = requestAnimationFrame(() => {
      const ids = event.fact.boardPieceIds ?? [];
      switch (event.type) {
        case "PIECE_PLACED":
        case "SHIRO_PLACED": {
          if (ids.length === 0) break;
          setPlaced(new Set(ids));
          if (soundOnRef.current) playEffect("place");
          arm(() => setPlaced(new Set()), PLACE_MS);
          break;
        }
        case "PIECE_WON": {
          if (ids.length === 0) break;
          setWon(new Set(ids));
          if (soundOnRef.current) playEffect("win");
          arm(() => setWon(new Set()), WIN_MS);
          break;
        }
        case "PIECE_ROBBED": {
          if (ids.length === 0) break;
          setRobbed(new Set(ids));
          if (soundOnRef.current) playEffect("rob");
          arm(() => setRobbed(new Set()), ROB_MS);
          break;
        }
        case "MATCH_FINISHED": {
          const team = event.fact.team;
          if (!team) break;
          setWinnerFlash({
            team,
            reason: snapshot?.result?.reason ?? "FOUR_ALIGNMENT",
          });
          if (soundOnRef.current) playEffect("win");
          arm(() => setWinnerFlash(null), FLASH_MS);
          break;
        }
        default:
          break;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [lastEvent, snapshot?.result?.reason, arm]);

  return { placedPieces, wonPieces, robbedPieces, winnerFlash };
}
