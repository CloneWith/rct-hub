import type { ReactNode } from "react";
import Reveal from "./Reveal";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-gold">
      <span className="h-px w-6 bg-gold/60" />
      {children}
    </div>
  );
}

interface SectionProps {
  id?: string;
  eyebrow?: string;
  title?: string;
  lead?: string;
  children: ReactNode;
  className?: string;
  tint?: boolean;
  align?: "center" | "left";
}

export default function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  className = "",
  tint = false,
  align = "center",
}: SectionProps) {
  const alignCls = align === "left" ? "mx-0 text-left" : "mx-auto text-center";
  return (
    <section id={id} className={`relative ${tint ? "bg-ash/50" : ""} ${className}`}>
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
        {(eyebrow || title || lead) && (
          <Reveal className={`mb-12 max-w-2xl sm:mb-16 ${alignCls}`}>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {title && (
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {title}
              </h2>
            )}
            {lead && <p className="mt-4 text-lg text-muted-foreground">{lead}</p>}
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}

export function PageHero({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, rgba(229,72,63,0.14), transparent 65%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
        <Reveal>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {lead && (
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              {lead}
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}
