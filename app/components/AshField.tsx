import type { CSSProperties } from "react";

/** 核尘 / 落雪粒子背景（纯 CSS，确定性生成，无 SSR 水合差异）。 */

function seed(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface AshFieldProps {
  count?: number;
  className?: string;
  /** 是否混入烬红与金黄粒子。 */
  ember?: boolean;
}

export default function AshField({ count = 36, className = "", ember = true }: AshFieldProps) {
  const colors = ember
    ? ["#f2e9ed", "#f2e9ed", "#f2e9ed", "#eec15a", "#e5483f"]
    : ["#f2e9ed", "#f2e9ed"];

  const particles = Array.from({ length: count }, (_, i) => {
    const s = seed(i);
    const size = (2 + s * 4).toFixed(1);
    const left = (seed(i * 3 + 1) * 100).toFixed(2);
    const duration = (11 + seed(i * 3 + 2) * 14).toFixed(1);
    const delay = (-(seed(i * 3 + 3) * 22)).toFixed(2);
    const opacity = (0.14 + seed(i * 3 + 4) * 0.4).toFixed(2);
    const drift = (seed(i * 3 + 5) * 80 - 30).toFixed(1);
    const color = colors[Math.floor(seed(i * 3 + 6) * colors.length) % colors.length];
    return { size, left, duration, delay, opacity, drift, color };
  });

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {particles.map((p, i) => (
        <span
          key={i}
          className="ash-particle"
          style={
            {
              "--ash-size": `${p.size}px`,
              "--ash-duration": `${p.duration}s`,
              "--ash-delay": `${p.delay}s`,
              "--ash-opacity": p.opacity,
              "--ash-drift": `${p.drift}px`,
              "--ash-color": p.color,
              left: `${p.left}%`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
