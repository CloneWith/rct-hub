"use client";

/**
 * useMatchAnimations — domain-event-driven animation layer for the board
 * room page (roadmap §3.7; the overlay uses a superset with the full-screen
 * winner flash in `useOverlayAnimations`).
 *
 * Derives transient animation sets from the WS `lastEvent` and self-clears
 * them after a short window; rendering always falls back to the authoritative
 * snapshot. Late joiners receive a fresh snapshot with NO animation replay.
 *
 * Sound mapping (shared module, legacy client semantics):
 * - PIECE_PLACED / SHIRO_PLACED → place.wav
 * - PIECE_WON / PIECE_ROBBED    → update.wav (ownership update)
 * - MATCH_FINISHED              → win (synth arpeggio)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useMatchLive } from "../MatchLiveProvider";
import { loadSoundEnabled, playEffect, preloadSounds } from "./sounds";
import type { MatchResultReason, TeamSide } from "./ws-protocol";

export interface MatchAnimationState {
  /** Piece ids that just landed (scale-in pop). */
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

const RESULT_REASON_LABELS: Record<MatchResultReason, string> = {
  FOUR_ALIGNMENT: "四连达成",
  TB: "TB 决胜",
  SURRENDER: "对方认输",
  STALEMATE_WON_COUNT: "流局计数",
};

export function resultReasonLabel(reason: MatchResultReason): string {
  return RESULT_REASON_LABELS[reason] ?? reason;
}

export function useMatchAnimations(): MatchAnimationState {
  const { lastEvent, snapshot } = useMatchLive();

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

  // Warm the asset cache once (fetch + decode WAVs) so the first real event
  // plays the authentic samples instead of the synth fallback.
  useEffect(() => {
    if (loadSoundEnabled()) preloadSounds();
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
    // observes `lastEvent` (external subscription); the actual animation state
    // updates happen in the rAF callback — no cascading render warnings.
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
          if (soundOnRef.current) playEffect("update");
          arm(() => setWon(new Set()), WIN_MS);
          break;
        }
        case "PIECE_ROBBED": {
          if (ids.length === 0) break;
          setRobbed(new Set(ids));
          if (soundOnRef.current) playEffect("update");
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
