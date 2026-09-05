/**
 * Board visual system — colors and labels migrated from the legacy
 * osu.Game.Tournament client (`FumoColours` / `ModColours`).
 *
 * Each mod has a background/foreground pair used by pool slots and board
 * pieces. Board zone tinting uses the zone color at low opacity.
 */

import type {
  BoardPieceOutcome,
  BoardZone,
  MatchLifecycle,
  MatchPhase,
  PieceMod,
  TeamSide,
} from "./ws-protocol";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { LucideProps, Circle, Eye, Swords, Zap, Shuffle, Star, Target } from "lucide-react";

export interface ModPalette {
  /** Piece / slot background. */
  bg: string;
  /** Text on the background. */
  fg: string;
  /** CSS color used for zone tinting (same hue as bg). */
  zone: string;
}

export const MOD_PALETTES: Record<PieceMod, ModPalette> = {
  NM: { bg: "#FFEB3B", fg: "#534D1E", zone: "#FFEB3B" },
  HR: { bg: "#FF5733", fg: "#3B180F", zone: "#FF5733" },
  HD: { bg: "#FF8D1A", fg: "#472C10", zone: "#FF8D1A" },
  DT: { bg: "#9D73FF", fg: "#31264F", zone: "#9D73FF" },
  FM: { bg: "#43CF7C", fg: "#203D27", zone: "#43CF7C" },
  SHIRO: { bg: "#F5F5F5", fg: "#3A3A3A", zone: "#F5F5F5" },
  TB: { bg: "#FFA500", fg: "#714800", zone: "#FFA500" },
};

/** Lucide icon placeholder for each mod (replace with assets later). */
export interface ModIconConfig {
  icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
  label: string;
  /** Foreground color from {@link MOD_PALETTES}. */
  color: string;
}

// TODO: Change icons to customized ones
export const MOD_ICON_CONFIG: Record<PieceMod, ModIconConfig> = {
  NM: { icon: Circle, label: "NM", color: MOD_PALETTES.NM.fg },
  HD: { icon: Eye, label: "HD", color: MOD_PALETTES.HD.fg },
  HR: { icon: Swords, label: "HR", color: MOD_PALETTES.HR.fg },
  DT: { icon: Zap, label: "DT", color: MOD_PALETTES.DT.fg },
  FM: { icon: Shuffle, label: "FM", color: MOD_PALETTES.FM.fg },
  SHIRO: { icon: Star, label: "Shiro", color: MOD_PALETTES.SHIRO.fg },
  TB: { icon: Target, label: "TB", color: MOD_PALETTES.TB.fg },
};

/** Dead (captured) pieces render desaturated grey. */
export const DEAD_PIECE = { bg: "#545454", fg: "#D4D4D4" };

export const TEAM_COLORS: Record<TeamSide, string> = {
  RED: "#FF5733",
  BLUE: "#57C1FF",
};

export const TEAM_LABELS: Record<TeamSide, string> = {
  RED: "红方",
  BLUE: "蓝方",
};

export const MOD_LABELS: Record<PieceMod, string> = {
  NM: "NM",
  HR: "HR",
  HD: "HD",
  DT: "DT",
  FM: "FM",
  SHIRO: "Shiro",
  TB: "TB",
};

export const PHASE_LABELS: Record<MatchPhase, string> = {
  NONE: "未开始",
  BAN: "Ban 阶段",
  PICK: "Pick 阶段",
  WAITING_FOR_RESULT: "等待结果",
  TB_PREPARATION: "TB 准备",
  TB_PLAYING: "TB 进行中",
};

export const LIFECYCLE_LABELS: Record<MatchLifecycle, string> = {
  READY: "待开始",
  RUNNING: "进行中",
  SUSPENDED: "已暂停",
  ADJUDICATION_REQUIRED: "待裁决",
  FINISHED: "已结束",
  ABORTED: "已中止",
};

export const OUTCOME_LABELS: Record<BoardPieceOutcome, string> = {
  WAITING_RESULT: "待确认",
  WON: "胜",
  WHITE: "白棋",
  DEAD: "已阵亡",
};

/**
 * Zone tint background style for a board cell. Zones follow the backend
 * `board.go` `ZoneAt` quadrants (rows count from the top):
 *
 * ```
 * DT DT | HD HD
 * DT DT | HD HD
 * ------+------
 * HR HR | DT DT
 * HR HR | DT DT
 * ```
 */
export function zoneStyle(zone: BoardZone): React.CSSProperties {
  const palette = MOD_PALETTES[zone];
  return { backgroundColor: `${palette.zone}26` }; // ~15% alpha
}

/** Effective mod to render on a piece (FM pieces show their forceMod). */
export function effectiveMod(mod: PieceMod, forceMod?: string | null): PieceMod {
  if (mod === "FM" && (forceMod === "NM" || forceMod === "HD" || forceMod === "HR")) {
    return forceMod;
  }
  return mod;
}

/** Tailwind-safe inline style for a mod badge/piece body. */
export function modStyle(mod: PieceMod): React.CSSProperties {
  const p = MOD_PALETTES[mod];
  return { backgroundColor: p.bg, color: p.fg };
}
