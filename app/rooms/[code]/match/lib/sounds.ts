/**
 * Shared sound effects — real assets migrated from the legacy tournament
 * client (`osu.Game.Resources.Custom/Samples`), with WebAudio synth fallback.
 *
 * Assets (public/sounds/):
 * - place.wav       → piece placed on the board (FumoBoard:210)
 * - update.wav      → ownership update / capture (BoardScreen:1285)
 * - unavailable.wav → illegal interaction (BoardScreen:1064)
 *
 * Browser APIs only; pure module (no React), safe to import from any client
 * component. All functions are no-ops when audio is unavailable.
 */

export type SoundKind = "place" | "update" | "unavailable" | "win" | "rob";

const SOUND_KEY = "rcthub:sound";

/** Overlay used a scoped key before M6 unified this module — keep alias. */
const OVERLAY_SOUND_KEY = "rcthub:overlay:sound";

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

/** Migrate the pre-M6 overlay key into the unified one. */
export function initSoundPref(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(SOUND_KEY) === null) {
      const legacy = window.localStorage.getItem(OVERLAY_SOUND_KEY);
      if (legacy !== null) {
        window.localStorage.setItem(SOUND_KEY, legacy);
      }
    }
    window.localStorage.removeItem(OVERLAY_SOUND_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Audio context + asset cache
// ---------------------------------------------------------------------------

let audioCtx: AudioContext | null = null;
let audioCtxFailed = false;

function ensureAudio(): AudioContext | null {
  if (typeof window === "undefined" || audioCtxFailed) return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      audioCtxFailed = true;
      return null;
    }
    try {
      audioCtx = new Ctor();
    } catch {
      audioCtxFailed = true;
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

const bufferCache = new Map<SoundKind, AudioBuffer | null>();

async function loadSample(ctx: AudioContext, kind: SoundKind): Promise<AudioBuffer | null> {
  if (bufferCache.has(kind)) return bufferCache.get(kind) ?? null;
  const name =
    kind === "place" ? "place" : kind === "update" ? "update" : kind === "unavailable" ? "unavailable" : null;
  if (!name) return null;
  try {
    const res = await fetch(`/sounds/${name}.wav`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const decoded = await ctx.decodeAudioData(buf);
    bufferCache.set(kind, decoded);
    return decoded;
  } catch {
    bufferCache.set(kind, null);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------

function playBuffer(ctx: AudioContext, buf: AudioBuffer, gain = 0.9): void {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g);
  g.connect(ctx.destination);
  src.start();
}

/** Synth fallback — short tones approximating the original samples. */
function playSynth(ctx: AudioContext, kind: SoundKind): void {
  const tone = (
    freq: number,
    start: number,
    durationMs: number,
    gain: number,
    type: OscillatorType = "square",
  ) => {
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
  };

  switch (kind) {
    case "place":
      tone(320, 0, 45, 0.04, "square");
      tone(190, 30, 60, 0.03, "square");
      break;
    case "update":
      tone(360, 0, 60, 0.04, "sine");
      tone(520, 40, 80, 0.035, "sine");
      break;
    case "unavailable":
      tone(180, 0, 90, 0.05, "sawtooth");
      break;
    case "win":
      tone(523, 0, 90, 0.05, "triangle");
      tone(659, 90, 90, 0.05, "triangle");
      tone(784, 180, 140, 0.06, "triangle");
      break;
    case "rob":
      tone(400, 0, 50, 0.045, "sawtooth");
      tone(240, 40, 70, 0.04, "sawtooth");
      break;
  }
}

/**
 * Play an effect. Real WAVs are used when they decode successfully; the first
 * call for each asset triggers an async load, so the very first sound may be
 * the synth fallback before the buffer arrives — subsequent plays are real.
 */
export function playEffect(kind: SoundKind): void {
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const buf = bufferCache.get(kind);
    if (buf) {
      playBuffer(ctx, buf);
      return;
    }
    // Kick off the async load (no await — fire and forget).
    void loadSample(ctx, kind).then((decoded) => {
      if (decoded) playBuffer(ctx, decoded, kind === "unavailable" ? 0.7 : 0.9);
    });
    playSynth(ctx, kind);
  } catch {
    // audio failure is non-fatal
  }
}

/** Preload all three assets (e.g. on first user gesture). */
export function preloadSounds(): void {
  const ctx = ensureAudio();
  if (!ctx) return;
  for (const kind of ["place", "update", "unavailable"] as const) {
    void loadSample(ctx, kind);
  }
}
