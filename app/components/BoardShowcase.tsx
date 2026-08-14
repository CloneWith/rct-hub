import { Fragment } from "react";
import PieceGlyph from "./PieceGlyph";
import {
  BOARD_ZONES,
  COL_LABELS,
  DEAD_PIECE,
  PIECES,
  ROW_LABELS,
  ZONES,
  type PieceKey,
  type ZoneKey,
} from "@/app/lib/tournament";

type Cell =
  | {
      label: string;
      color: string;
      soft: string;
      name?: string;
      team?: "red" | "blue";
      dead?: boolean;
      glow?: boolean;
    }
  | null;

const byKey = Object.fromEntries(
  PIECES.map((p) => [p.key, p] as const),
) as Record<PieceKey, (typeof PIECES)[number]>;
const zoneByKey = Object.fromEntries(
  ZONES.map((z) => [z.key, z] as const),
) as Record<
  ZoneKey,
  (typeof ZONES)[number]
>;

const HD = byKey.HD;
const DT = byKey.DT;
const HR = byKey.HR;
const NM = byKey.NM;
const SHIRO = byKey.SHIRO;

/**
 * 演示局面：红方在第一行形成「四连对」获胜，
 * 蓝方有两颗赢棋，另有一颗被牺牲的死亡棋与一颗白子。
 */
const DEMO: Cell[][] = [
  [
    { ...HD, team: "red", glow: true },
    { ...HD, team: "red", glow: true },
    { ...DT, team: "red", glow: true },
    { ...DT, team: "red", glow: true },
  ],
  [
    { ...HD, team: "blue" },
    null,
    null,
    { ...DT, team: "blue" },
  ],
  [
    null,
    { ...HR, team: "blue" },
    { label: DEAD_PIECE.label, color: DEAD_PIECE.color, soft: DEAD_PIECE.soft, dead: true },
    null,
  ],
  [
    { ...SHIRO },
    null,
    null,
    { ...NM, team: "blue" },
  ],
];

export default function BoardShowcase() {
  return (
    <div className="mx-auto w-full max-w-[560px]">
      <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-[#1d181b] to-[#141013] p-3 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] sm:p-4">
        <div className="grid grid-cols-[26px_repeat(4,1fr)] grid-rows-[26px_repeat(4,1fr)] gap-1.5 sm:gap-2">
          {/* 角标 */}
          <div />
          {COL_LABELS.map((c) => (
            <div
              key={c}
              className="flex items-end justify-center pb-0.5 text-[11px] font-mono text-muted-foreground/60"
            >
              {c}
            </div>
          ))}

          {DEMO.map((row, r) => (
            <Fragment key={r}>
              <div className="flex items-center justify-end pr-0.5 text-[11px] font-mono text-muted-foreground/60">
                {ROW_LABELS[r]}
              </div>
              {row.map((cell, c) => {
                const zone = zoneByKey[BOARD_ZONES[r][c]];
                return (
                  <div
                    key={c}
                    className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-white/5"
                    style={{
                      background: `linear-gradient(180deg, ${zone.soft}, rgba(0,0,0,0.06))`,
                    }}
                  >
                    {/* 刻入的限定区字母 */}
                    <span
                      className="pointer-events-none absolute select-none text-5xl font-black uppercase leading-none opacity-[0.07]"
                      style={{ color: zone.color }}
                    >
                      {zone.key}
                    </span>
                    <span
                      className="absolute left-1 top-0.5 text-[9px] font-mono font-semibold uppercase opacity-60"
                      style={{ color: zone.color }}
                    >
                      {zone.key}
                    </span>
                    {cell ? (
                      <PieceGlyph
                        label={cell.label}
                        name={cell.name}
                        color={cell.color}
                        soft={cell.soft}
                        team={cell.team}
                        dead={cell.dead}
                        glow={cell.glow}
                        size="md"
                        className="animate-piece-drop"
                      />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
