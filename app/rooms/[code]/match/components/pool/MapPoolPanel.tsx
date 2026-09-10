"use client";

/**
 * MapPoolPanel — grouped mappool display (live slot state + metadata).
 *
 * Design layers per card:
 *   1. Background — beatmap cover image, adaptive cover.
 *   2. Basic status — right-to-left team color gradient + status icon
 *      (loading spinner for waiting result, trophy for a won piece).
 *   3. Content — 3 columns: mod icon + slot id, beatmap info, optional action button.
 *   4. Additional status — semi-transparent overlay for banned / consumed slots.
 *
 * Interaction (M2): selectableSlotIDs marks slots the current actor may target.
 * The panel does not judge legality itself — that comes from `analysis` (D5).
 */

import {
  Ban,
  Check,
  FileMusic,
  Hash,
  Loader2,
  Minus,
  Trophy,
} from "lucide-react";
import type { WSBoard, WSBoardPiece, WSPoolSlot } from "../../lib/ws-protocol";
import type { MatchPhase, TeamSide } from "../../lib/ws-protocol";
import {
  MOD_ICON_CONFIG,
  MOD_LABELS,
  MOD_PALETTES,
  TEAM_COLORS,
  TEAM_LABELS,
} from "../../lib/visuals";
import type { PieceMod } from "../../lib/ws-protocol";
import { cn } from "@/app/lib/utils";

export interface PoolBeatmapMeta {
  poolSlotID: string;
  metadataStatus: string;
  beatmap: {
    onlineID: string;
    title: string;
    artist: string;
    difficultyName: string;
    starRating: number;
    bpm: number;
    totalLength: number;
    coverUrl: string;
  } | null;
  /** Optional skill tags (populated when backend exposes them). */
  skills?: string[];
}

type SlotTeamState =
  | { kind: "banned"; team?: TeamSide }
  | { kind: "waiting"; team: TeamSide }
  | { kind: "won"; team: TeamSide }
  | { kind: "consumed"; team?: TeamSide };

function deriveSlotState(
  slot: WSPoolSlot,
  piece?: WSBoardPiece,
): SlotTeamState | null {
  if (slot.state === "BANNED") {
    // TODO: backend FormalPoolSlot currently has no team field; keep neutral.
    return {kind: "banned"};
  }
  if (slot.state === "SELECTED" && piece) {
    switch (piece.outcome) {
      case "WAITING_RESULT":
        return {kind: "waiting", team: piece.selectedBy};
      case "WON":
        return {kind: "won", team: piece.owner ?? piece.selectedBy};
      case "DEAD":
      case "WHITE":
        // "Consumed" = piece is no longer on the board (sacrificed / dead).
        return {kind: "consumed", team: piece.owner ?? piece.selectedBy};
    }
  }
  return null;
}

function teamGradientStyle(team?: TeamSide): React.CSSProperties {
  if (!team) return {};
  const color = TEAM_COLORS[team];
  return {
    background: `linear-gradient(to right, transparent 40%, ${color}80 70%, ${color}e6 80%)`,
  };
}

function actionButtonStyle(selected: boolean, isBanMode: boolean) {
  if (!selected) {
    return isBanMode
      ? "hover:border-danger hover:bg-danger hover:text-white"
      : "hover:border-success hover:bg-success hover:text-white";
  }
  return isBanMode
    ? "border-danger bg-danger text-white"
    : "border-success bg-success text-white";
}

function formatLength(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ActionButton({
                        phase,
                        selected,
                        onClick,
                      }: {
  phase?: MatchPhase | null;
  selected: boolean;
  onClick?: () => void;
}) {
  const isBan = phase === "BAN";
  const Icon = isBan ? Minus : Check;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn("flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/90 bg-white text-black shadow-sm transition-all duration-200 hover:scale-105 active:scale-95",
        actionButtonStyle(selected, isBan))
      }
    >
      <Icon className="size-5" strokeWidth={2.5}/>
    </button>
  );
}

function SlotCard({
                    slot,
                    meta,
                    selectable,
                    selected,
                    onSelect,
                    phase,
                    boardPiece,
                  }: {
  slot: WSPoolSlot;
  meta?: PoolBeatmapMeta;
  selectable: boolean;
  selected: boolean;
  onSelect?: (slotId: string) => void;
  phase?: MatchPhase | null;
  boardPiece?: WSBoardPiece;
}) {
  const beatmap = meta?.beatmap ?? null;
  const state = deriveSlotState(slot, boardPiece);
  const showOverlay = state?.kind === "banned" || state?.kind === "consumed";
  const showStatus = state?.kind === "waiting" || state?.kind === "won";
  const team = state?.team;
  const modCfg = MOD_ICON_CONFIG[slot.mod];
  const modColor = modCfg.color;

  const handleClick = () => {
    if (selectable && onSelect) onSelect(slot.id);
  };

  return (
    <div
      onClick={selectable ? handleClick : undefined}
      className={`group relative isolate flex h-22 w-full cursor-default overflow-hidden rounded-xl border transition-shadow duration-200 ${
        selected
          ? "border-success/80 shadow-md ring-1 ring-success/70"
          : "border-white/10 shadow-sm"
      } ${selectable ? "cursor-pointer" : ""}`}
    >
      {/* Layer 1: Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: beatmap?.coverUrl
            ? `url(${beatmap.coverUrl})`
            : undefined,
        }}
      />

      {/* Background darkening so text is always readable */}
      <div className="absolute inset-0 bg-black/50"/>

      {/* Layer 2: Basic status gradient */}
      {showStatus && (
        <div
          className="absolute inset-0 z-10 transition-opacity duration-300"
          style={teamGradientStyle(team)}
        />
      )}

      {/* Layer 2: Status icon (spinner / trophy) */}
      {showStatus && (
        <div className="pointer-events-none absolute right-3 top-1/2 z-20 -translate-y-1/2">
          {state.kind === "waiting" ? (
            <div className="-rotate-12 scale-110 text-white drop-shadow">
              <Loader2 className="size-10 animate-spin" strokeWidth={2.5}/>
            </div>
          ) : (
            <div className="-rotate-12 scale-110 text-white drop-shadow">
              <Trophy className="size-10" strokeWidth={2}/>
            </div>
          )}
        </div>
      )}

      {/* Layer 3: Content */}
      <div className="relative z-30 flex w-full items-stretch px-2 py-2">
        {/* Left column: mod icon + slot id */}
        <div className="relative flex w-14 shrink-0 items-center justify-center">
          <modCfg.icon
            className="size-8"
            style={{color: modColor}}
            strokeWidth={2}
          />
          <span
            className="absolute bottom-0 right-1 text-lg font-bold leading-none"
            style={{
              color: modColor,
              textShadow:
                "0 1px 0 rgba(0,0,0,0.35), 1px 0 0 rgba(0,0,0,0.35), 0 -1px 0 rgba(0,0,0,0.35), -1px 0 0 rgba(0,0,0,0.35)",
            }}
          >
            {slot.index}
          </span>
        </div>

        {/* Middle column: beatmap info */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pr-2">
          {beatmap ? (
            <>
              <div
                className="truncate text-sm font-semibold text-white drop-shadow"
                title={`${beatmap.artist} - ${beatmap.title}`}
              >
                {beatmap.artist} - {beatmap.title}
              </div>
              <div className="flex min-w-0 items-center gap-2 text-xs text-white/90 drop-shadow">
                <span className="flex min-w-0 items-center gap-0.5">
                  <FileMusic className="size-3 shrink-0"/>
                  <span className="truncate">{beatmap.difficultyName}</span>
                </span>
                <span className="flex min-w-0 items-center gap-0.5">
                  <Hash className="size-3 shrink-0"/>
                  <span className="truncate">{beatmap.onlineID}</span>
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                {meta?.skills?.length ? (
                  meta.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-block truncate rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span
                    className="inline-block rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm">
                    {beatmap.starRating.toFixed(2)}★ · {Math.round(beatmap.bpm)}
                    BPM · {formatLength(beatmap.totalLength)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-white/70 drop-shadow">谱面解析中…</div>
          )}
        </div>

        {/* Right column: action button */}
        {selectable && (
          <div className="flex w-12 shrink-0 items-center justify-center">
            <ActionButton
              phase={phase}
              selected={selected}
              onClick={handleClick}
            />
          </div>
        )}
      </div>

      {/* Layer 4: Additional status overlay (banned / consumed) */}
      <div
        className={`absolute inset-0 z-40 flex items-center justify-center bg-black/60 transition-opacity duration-300 ${
          showOverlay
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 backdrop-blur-sm"
          style={{color: team ? TEAM_COLORS[team] : "#ffffff"}}
        >
          <Ban className="size-4"/>
          <span className="text-sm font-bold">
            {state?.kind === "banned"
              ? team
                ? `${TEAM_LABELS[team]}禁图`
                : "已禁图"
              : "已使用"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MapPoolPanel({
                                       poolSlots,
                                       poolMeta,
                                       selectableSlotIDs,
                                       selectedSlotID,
                                       onSelectSlot,
                                       phase,
                                       board,
                                     }: {
  poolSlots: WSPoolSlot[] | null;
  poolMeta: PoolBeatmapMeta[];
  /** Slot ids the current actor may interact with (ban/pick candidates). */
  selectableSlotIDs?: ReadonlySet<string>;
  selectedSlotID?: string | null;
  onSelectSlot?: (slotId: string) => void;
  /** Current match phase; drives the action button icon (pick vs ban). */
  phase?: MatchPhase | null;
  /** Live board used to derive selected-slot team / outcome / consumed state. */
  board?: WSBoard | null;
}) {
  const metaById = new Map(poolMeta.map((m) => [m.poolSlotID, m]));

  // Map selected pool slots to their board pieces (for team / outcome decoration).
  const pieceBySourceSlot = new Map<string, WSBoardPiece>();
  if (board) {
    for (const cell of board.cells) {
      if (cell.piece) {
        pieceBySourceSlot.set(cell.piece.sourcePoolSlotId, cell.piece);
      }
    }
  }

  // Order slots by mod group then id for a stable layout.
  const order: PieceMod[] = ["NM", "HD", "HR", "DT", "FM", "SHIRO", "TB"];
  const slots = [...(poolSlots ?? [])].sort((a, b) => {
    const mo = order.indexOf(a.mod) - order.indexOf(b.mod);
    return mo !== 0 ? mo : a.id.localeCompare(b.id, undefined, {numeric: true});
  });
  const groups = new Map<PieceMod, WSPoolSlot[]>();
  for (const slot of slots) {
    const list = groups.get(slot.mod) ?? [];
    list.push(slot);
    groups.set(slot.mod, list);
  }

  if (!poolSlots) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        正在加载图池…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      {[...groups.entries()].map(([mod, group]) => (
        <section key={mod} aria-label={`${MOD_LABELS[mod]} 槽位`}>
          <h3
            className="mb-2 inline-block rounded px-2 py-0.5 text-xs font-bold"
            style={{
              backgroundColor: MOD_PALETTES[mod].bg,
              color: MOD_PALETTES[mod].fg,
            }}
          >
            {MOD_LABELS[mod]}
          </h3>
          <div className="flex flex-col gap-2">
            {group.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                meta={metaById.get(slot.id)}
                selectable={Boolean(selectableSlotIDs?.has(slot.id) && onSelectSlot)}
                selected={selectedSlotID === slot.id}
                onSelect={onSelectSlot}
                phase={phase}
                boardPiece={pieceBySourceSlot.get(slot.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
