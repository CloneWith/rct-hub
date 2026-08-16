import type { Metadata } from "next";
import { Gift, Package, Sparkles } from "lucide-react";
import Section from "@/app/components/Section";
import Reveal from "@/app/components/Reveal";
import { PageHero } from "@/app/components/Section";
import { PLUSHIES, PRIZE_TIERS, STAFF_PRIZES } from "@/app/lib/tournament";

export const metadata: Metadata = {
  title: "奖品 — RCT S1",
  description: "RCT S1 奖品：冠军瓜分二次元玩偶奖池，前三名获 osu!supporter 与定制 banner。",
};

const NOTES = [
  "部分玩偶最晚 2027 年 1 月发货；主办酌情进行国外配送，国内配送免运费。",
  "若国外配送无法进行，主办将以 1 个月 osu!supporter 作为补偿。",
  "选手可指定一位身居中国的好友代收玩偶，或选择不要玩偶。",
  "冠军挑完后剩余玩偶归亚军，亚军挑完再剩归季军。",
];

export default function PrizesPage() {
  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow="Prizes"
        title="奖品"
        lead="冠军瓜分二次元玩偶奖池；前三名策略师与全体选手都有 osu!supporter 与定制 banner。"
      />

      {/* 冠亚季 */}
      <Section eyebrow="Top 3" title="冠亚季军" lead="三档队伍奖励，逐档递减。">
        <div className="grid gap-6 sm:grid-cols-3">
          {PRIZE_TIERS.map((p, i) => (
            <Reveal key={p.tier} delay={i * 80}>
              <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface/40 p-7">
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: p.tier === "冠军" ? "#eec15a" : p.tier === "亚军" ? "#9aa6b3" : "#c98a5b" }}
                />
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/15 text-2xl">
                    {p.emoji}
                  </span>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {p.tier}
                    </div>
                    <h3 className="font-semibold">{p.title}</h3>
                  </div>
                </div>
                <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                  {p.items.map((it) => (
                    <li key={it} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 玩偶奖池 */}
      <Section
        tint
        eyebrow="Plushie pool"
        title="冠军玩偶奖池"
        lead="16 款玩偶，冠军队伍自由瓜分；不要玩偶可兑换 1 个月 osu!supporter。"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PLUSHIES.map((p, i) => (
            <Reveal key={p} delay={i * 30}>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3.5 transition-colors hover:border-gold/40">
                <Gift className="h-4 w-4 shrink-0 text-gold" />
                <span className="text-sm">{p}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 工作人员 */}
      <Section eyebrow="Staff" title="工作人员奖品" lead="每一位为赛事付出的工作人员都有回报。">
        <div className="mx-auto grid max-w-3xl gap-3">
          {STAFF_PRIZES.map((s, i) => (
            <Reveal key={s.role} delay={i * 60}>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/40 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{s.role}</span>
                </div>
                <span className="text-right text-sm text-muted-foreground">{s.rewards}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 备注 */}
      <Section tint eyebrow="Notes" title="配送与备注" lead="关于玩偶发放的说明。">
        <div className="mx-auto grid max-w-3xl gap-3">
          {NOTES.map((n, i) => (
            <Reveal key={n} delay={i * 50}>
              <div className="flex gap-3 rounded-xl border border-border bg-surface/40 px-5 py-3.5 text-sm leading-relaxed text-muted-foreground">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {n}
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </div>
  );
}
