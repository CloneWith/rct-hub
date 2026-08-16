import type { CSSProperties } from "react";
import { Skull } from "lucide-react";

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface PieceGlyphProps {
  label: string;
  name?: string;
  color: string;
  soft: string;
  size?: "sm" | "md" | "lg";
  team?: "red" | "blue" | null;
  dead?: boolean;
  glow?: boolean;
  className?: string;
  style?: CSSProperties;
}

const SIZES = {
  sm: "h-9 w-9 rounded-lg text-[11px]",
  md: "h-14 w-14 rounded-xl text-sm",
  lg: "h-20 w-20 rounded-2xl text-lg",
} as const;

/** 棋子图块（NM / HD / HR / DT / FM / 白 / TB / 亡）。 */
export default function PieceGlyph({
  label,
  name,
  color,
  soft,
  size = "md",
  team,
  dead = false,
  glow = false,
  className = "",
  style,
}: PieceGlyphProps) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center font-mono font-bold leading-none ${SIZES[size]} ${glow ? "animate-win-flash" : ""} ${className}`.trim()}
      style={{
        background: `linear-gradient(155deg, ${soft}, rgba(0,0,0,0.18))`,
        boxShadow: `inset 0 0 0 1px ${withAlpha(color, dead ? 0.28 : 0.55)}, 0 10px 24px -12px ${withAlpha(color, 0.55)}`,
        color: dead ? "#8b8288" : color,
        ...style,
      }}
    >
      <span className={dead ? "line-through decoration-2 opacity-80" : ""}>{label}</span>
      {name && (
        <span className="mt-1 text-[8px] font-sans font-medium uppercase tracking-wider opacity-70">
          {name}
        </span>
      )}
      {team && (
        <span
          className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full ring-2 ring-background"
          style={{ background: team === "red" ? "#e5483f" : "#4aa3ff" }}
        />
      )}
      {dead && (
        <Skull className="absolute -left-1.5 -top-1.5 h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
      )}
    </div>
  );
}
