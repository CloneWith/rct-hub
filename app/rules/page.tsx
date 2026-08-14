import type { Metadata } from "next";
import { Clock, Flag, Hand, Skull, Trophy, Scale } from "lucide-react";
import BoardShowcase from "@/app/components/BoardShowcase";
import PieceGlyph from "@/app/components/PieceGlyph";
import Section from "@/app/components/Section";
import Reveal from "@/app/components/Reveal";
import { PageHero } from "@/app/components/Section";
import {
  DEAD_PIECE,
  LINES,
  PIECES,
  ROBBERY_RULES,
  TIMERS,
  ZONES,
} from "@/app/lib/tournament";

export const metadata: Metadata = {
  title: "玩法规则 — RCT S1",
  description: "RCT S1 棋盘玩法规则：棋子、限定区、落子、连对、夺棋与 TB 加赛。",
};

const PLACEMENTS = [
  {
    icon: Hand,
    title: "普通落子",
    desc: "选择一张谱面作为棋子，并从棋盘上选择一个位置落子；两队立即就该谱面对决，胜者持有该棋子，进入下一回合。",
  },
  {
    icon: Skull,
    title: "白子落子",
    desc: "从棋盘上选择一个位置落下白子（此时白子不受任何一方持有）。落子后行动即告结束，无需游玩任何谱面。每场比赛只有一枚白子。",
  },
];

export default function RulesPage() {
  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow="Rules"
        title="玩法规则"
        lead="把 osu! 谱面当作棋子，在 4×4 棋盘上对弈。以下为 RCT S1 的核心规则速览。"
      />

      {/* 棋子 */}
      <Section
        eyebrow="Pieces"
        title="棋子"
        lead="图池共 20 枚棋子：NM×3、HD×3、HR×3、DT×4、FM×5、白×1、TB×1。"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PIECES.map((p, i) => (
            <Reveal key={p.key} delay={i * 50}>
              <div className="flex h-full items-start gap-4 rounded-2xl border border-border bg-surface/40 p-5">
                <PieceGlyph label={p.label} color={p.color} soft={p.soft} size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold" style={{ color: p.color }}>
                      {p.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{p.name}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.blurb}</p>
                </div>
              </div>
            </Reveal>
          ))}
          <Reveal delay={PIECES.length * 50}>
            <div className="flex h-full items-start gap-4 rounded-2xl border border-dashed border-border bg-surface/40 p-5">
              <PieceGlyph label={DEAD_PIECE.label} color={DEAD_PIECE.color} soft={DEAD_PIECE.soft} size="md" dead />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-muted-foreground">{DEAD_PIECE.label}</span>
                  <span className="text-xs text-muted-foreground">{DEAD_PIECE.name}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{DEAD_PIECE.blurb}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* 棋盘与限定区 */}
      <Section
        tint
        eyebrow="Board"
        title="棋盘与限定区"
        lead="棋盘是 4×4 网格，坐标「行 1–4、列 A–D」。四个 2×2 区域分别被刻入 HD / DT / HR / NM 属性。"
      >
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal className="mx-auto w-full max-w-[560px]">
            <BoardShowcase />
          </Reveal>
          <Reveal>
            <div className="space-y-3">
              {ZONES.map((z) => (
                <div key={z.key} className="flex items-center gap-4 rounded-xl border border-border bg-surface/40 px-4 py-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold"
                    style={{ background: z.soft, color: z.color }}
                  >
                    {z.key}
                  </span>
                  <div>
                    <div className="font-semibold">{z.name}</div>
                    <div className="text-sm text-muted-foreground">{z.blurb}</div>
                  </div>
                </div>
              ))}
              <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm leading-relaxed text-foreground/90">
                <span className="font-semibold text-gold">FM 规则：</span>
                一人 HD（或 EZHD）、一人 HR（或 HDHR）、一人 NM（或 EZ）、一人 Force Mod。
                FM 棋落到哪个区域，Force Mod 位就要上和该区域相同的模组；Force Mod 只能是 HD、HR、NM 之一。
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* 落子 */}
      <Section eyebrow="Placement" title="落子方式" lead="两种落子：打完定归属的普通落子，与不动刀兵的白子落子。">
        <div className="grid gap-6 sm:grid-cols-2">
          {PLACEMENTS.map((p, i) => (
            <Reveal key={p.title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-border bg-surface/40 p-7">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <p.icon className="h-6 w-6" />
                </span>
                <h3 className="mb-2 text-lg font-semibold">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 连对与获胜 */}
      <Section
        tint
        eyebrow="Win condition"
        title="连对与获胜"
        lead="同一方持有的赢棋相连即构成「连对」，率先连成四连对的一方获胜。"
      >
        <div className="grid gap-6 sm:grid-cols-3">
          {LINES.map((l, i) => (
            <Reveal key={l.name} delay={i * 80}>
              <div className="relative h-full overflow-hidden rounded-2xl border border-border bg-surface/40 p-7 text-center">
                <div className="mx-auto mb-4 flex items-center justify-center gap-1">
                  {Array.from({ length: l.n }).map((_, k) => (
                    <span
                      key={k}
                      className="h-4 w-4 rounded-md"
                      style={{ background: l.n === 4 ? "#eec15a" : "#e5483f" }}
                    />
                  ))}
                </div>
                <h3 className="text-lg font-semibold">{l.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{l.desc}</p>
                {l.n === 4 && (
                  <span className="mt-3 inline-block rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">
                    立即获胜
                  </span>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 夺棋 */}
      <Section eyebrow="Robbery" title="夺棋" lead="牺牲己方连对，夺取对手的赢棋或白子 —— 夺来的棋子必须立刻参与连对。">
        <div className="grid gap-6 sm:grid-cols-2">
          {ROBBERY_RULES.map((r, i) => (
            <Reveal key={r.title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-border bg-surface/40 p-7">
                <div className="mb-3 flex items-center gap-2">
                  <Scale className="h-5 w-5 text-gold" />
                  <h3 className="font-semibold">{r.title}</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg bg-primary/10 px-3 py-2">
                    <span className="font-semibold text-primary">代价：</span>
                    <span className="text-muted-foreground">{r.cost}</span>
                  </div>
                  <div className="rounded-lg bg-gold/10 px-3 py-2">
                    <span className="font-semibold text-gold">条件：</span>
                    <span className="text-muted-foreground">{r.condition}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-6">
          <p className="mx-auto max-w-3xl rounded-xl border border-border bg-surface/40 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">结算顺序：</span>
            先判断被夺之棋是否满足「参与连对」的条件，不满足则拒绝；满足则牺牲己方赢棋（变死亡棋）→
            夺取对手棋（变为己方赢棋）→ 结算连对与胜负；若无人获胜，行动方继续落子。
          </p>
        </Reveal>
      </Section>

      {/* TB 与认输 */}
      <Section
        tint
        eyebrow="Tiebreak"
        title="TB 加赛与投子认输"
        lead="打不开了就加赛，打不过了就认输。"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-border bg-surface/40 p-7">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 text-gold">
                  <Trophy className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-semibold">TB 加赛</h3>
              </div>
              <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                  第 11–14 回合：双方队长协商一致即可启用 TB。
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                  第 15 回合：双方夺棋后若仍未分胜负，强制启用 TB。
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                  死局：任意一方无法落子且夺棋也无法形成四连时，强制进入 TB。
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                  TB 图必须启用 NF + ScoreV2，可选 HD / HR，不允许其他模组。
                </li>
              </ul>
            </div>
          </Reveal>
          <Reveal delay={90}>
            <div className="h-full rounded-2xl border border-border bg-surface/40 p-7">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Flag className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-semibold">投子认输</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                队伍可以在任意时间决定认输。策略师联系裁判，裁判确认队伍内
                <span className="font-semibold text-foreground"> 包括队长在内的至少 4 名玩家 </span>
                均同意后，才可设置该队认输。对手直接获胜。
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* 计时器 */}
      <Section eyebrow="Timer" title="行动计时器" lead="每个行动都有倒计时。计时器归零不会自动跳过，但裁判可修改回合数处理。">
        <div className="mx-auto grid max-w-3xl gap-3">
          {TIMERS.map((t, i) => (
            <Reveal key={t.action} delay={i * 50}>
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface/40 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.action}</span>
                </div>
                <span className="font-mono text-sm font-semibold text-gold">{t.time}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </div>
  );
}
