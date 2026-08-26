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
 * Sounds are synthesized with WebAudio (no asset files); toggled by the
 * streamer panel and persisted to localStorage.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useMatchLive } from "../../../rooms/[code]/match/MatchLiveProvider";
import type { MatchResultReason, TeamSide } from "../../../rooms/[code]/match/lib/ws-protocol";

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

const RESULT_REASON_LABELS: Record<MatchResultReason, string> = {
  FOUR_ALIGNMENT: "四连达成",
  TB: "TB 决胜",
  SURRENDER: "对方认输",
  STALEMATE_WON_COUNT: "流局计数",
};

export function resultReasonLabel(reason: MatchResultReason): string {
  return RESULT_REASON_LABELS[reason] ?? reason;
}

// ---------------------------------------------------------------------------
// WebAudio synth (no asset files)
// ---------------------------------------------------------------------------

const SOUND_KEY = "rcthub:overlay:sound";

export function loadSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "0";
  } catch {
    return true;
  }
}

export function saveSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}

let audioCtx: AudioContext | null = null;

function ensureAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  durationMs: number,
  gain: number,
  type: OscillatorType = "square",
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start / 1000);
  g.gain.setValueAtTime(gain, ctx.currentTime + start / 1000);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (start + durationMs) / 1000);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(ctx.currentTime + start / 1000);
  osc.stop(ctx.currentTime + (start + durationMs) / 1000);
}

function playSound(kind: "place" | "win" | "rob"): void {
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    if (kind === "place") {
      tone(ctx, 320, 0, 45, 0.04, "square");
      tone(ctx, 190, 30, 60, 0.03, "square");
    } else if (kind === "win") {
      tone(ctx, 523, 0, 90, 0.05, "triangle");
      tone(ctx, 659, 90, 90, 0.05, "triangle");
      tone(ctx, 784, 180, 140, 0.06, "triangle");
    } else {
      tone(ctx, 400, 0, 50, 0.045, "sawtooth");
      tone(ctx, 240, 40, 70, 0.04, "sawtooth");
    }
  } catch {
    // audio failure is non-fatal
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOverlayAnimations(): OverlayAnimationState {
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
          if (soundOnRef.current) playSound("place");
          arm(() => setPlaced(new Set()), PLACE_MS);
          break;
        }
        case "PIECE_WON": {
          if (ids.length === 0) break;
          setWon(new Set(ids));
          if (soundOnRef.current) playSound("win");
          arm(() => setWon(new Set()), WIN_MS);
          break;
        }
        case "PIECE_ROBBED": {
          if (ids.length === 0) break;
          setRobbed(new Set(ids));
          if (soundOnRef.current) playSound("rob");
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
          if (soundOnRef.current) playSound("win");
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
