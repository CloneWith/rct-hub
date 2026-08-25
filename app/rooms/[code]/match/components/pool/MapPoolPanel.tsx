"use client";

/**
 * MapPoolPanel — grouped mappool display.
 *
 * Live slot states (AVAILABLE/BANNED/SELECTED) come from the WS snapshot;
 * beatmap display metadata comes from the `MatchByCode` GraphQL query
 * (`match.pool`). Slots without resolved metadata still render (BID pending).
 */

import type { WSPoolSlot } from "../../lib/ws-protocol";
import { MOD_LABELS, MOD_PALETTES, modStyle } from "../../lib/visuals";
import type { PieceMod } from "../../lib/ws-protocol";

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
}

function formatLength(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SlotCard({ slot, meta }: { slot: WSPoolSlot; meta?: PoolBeatmapMeta }) {
  const beatmap = meta?.beatmap ?? null;
  const banned = slot.state === "BANNED";
  const selected = slot.state === "SELECTED";

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border p-2 transition-opacity ${
        banned
          ? "border-transparent bg-black/30 opacity-45"
          : selected
            ? "border-border bg-background/60"
            : "border-border bg-background/40"
      }`}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold"
        style={modStyle(slot.mod)}
      >
        {slot.id}
      </div>
      <div className="min-w-0 flex-1">
        {beatmap ? (
          <>
            <div className="truncate text-sm font-medium" title={`${beatmap.artist} - ${beatmap.title} [${beatmap.difficultyName}]`}>
              {beatmap.title}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {beatmap.difficultyName} · {beatmap.starRating.toFixed(2)}★ · {Math.round(beatmap.bpm)}bpm · {formatLength(beatmap.totalLength)}
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground">谱面解析中…</div>
        )}
      </div>
      {banned && <span className="shrink-0 text-xs font-semibold text-danger">BANNED</span>}
      {selected && <span className="shrink-0 text-xs font-semibold text-success">已上场</span>}
    </div>
  );
}

export default function MapPoolPanel({
  poolSlots,
  poolMeta,
}: {
  poolSlots: WSPoolSlot[] | null;
  poolMeta: PoolBeatmapMeta[];
}) {
  const metaById = new Map(poolMeta.map((m) => [m.poolSlotID, m]));
  // Order slots by mod group then id for a stable layout.
  const order: PieceMod[] = ["NM", "HD", "HR", "DT", "FM", "SHIRO", "TB"];
  const slots = [...(poolSlots ?? [])].sort((a, b) => {
    const mo = order.indexOf(a.mod) - order.indexOf(b.mod);
    return mo !== 0 ? mo : a.id.localeCompare(b.id, undefined, { numeric: true });
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
    <div className="flex h-full flex-col gap-3 overflow-y-auto pr-1">
      {[...groups.entries()].map(([mod, group]) => (
        <section key={mod} aria-label={`${MOD_LABELS[mod]} 槽位`}>
          <h3
            className="mb-1.5 inline-block rounded px-1.5 py-0.5 text-xs font-bold"
            style={{
              backgroundColor: `${MOD_PALETTES[mod].bg}`,
              color: `${MOD_PALETTES[mod].fg}`,
            }}
          >
            {MOD_LABELS[mod]}
          </h3>
          <div className="flex flex-col gap-1.5">
            {group.map((slot) => (
              <SlotCard key={slot.id} slot={slot} meta={metaById.get(slot.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
