import type { Metadata } from "next";
import { Users, Swords, Trophy, Target } from "lucide-react";
import Section from "@/app/components/Section";
import Reveal from "@/app/components/Reveal";
import { PageHero } from "@/app/components/Section";
import { DRAFT_ROUNDS, ROUNDS, SKILLSETS, TEAMS, TIERS } from "@/app/lib/tournament";

export const metadata: Metadata = {
  title: "赛制与队伍 — RCT S1",
  description: "RCT S1 赛制：8 队 9 人、BWS 分级、半随机半选秀组队、瑞士轮到总决赛。",
};

const BASICS = [
  { icon: Swords, title: "4v4", desc: "官方 bancho 服务器，强制 NoFail、Score V2。" },
  { icon: Users, title: "9 人 / 队", desc: "8 名选手 + 1 名策略师。选手对决，策略师下棋。" },
  { icon: Trophy, title: "Open Rank", desc: "限国内，不设 rank 门槛。" },
  { icon: Target, title: "8 支队伍", desc: "A–H 共 8 队，随机 + 选秀组队。" },
];

const ROSTER = [
  { slot: "1 号", source: "Tier I · BWS #1–8", tag: "随机" },
  { slot: "2 号", source: "Tier II · BWS #9–16", tag: "随机" },
  { slot: "3 号", source: "Tier III · BWS #17–24", tag: "随机" },
  { slot: "4 号", source: "Tier IV · BWS #25–32", tag: "随机" },
  { slot: "5–8 号", source: "Tier V · 选秀", tag: "选秀" },
  { slot: "9 号", source: "策略师", tag: "自行联系" },
];

export default function FormatPage() {
  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow="Format"
        title="赛制与队伍"
        lead="8 支队伍、9 人一队。BWS 前 32 名随机落位，Tier V 经选秀补齐，最终角逐总决赛。"
      />

      {/* 基本盘 */}
      <Section eyebrow="Basics" title="基本规则" lead="一场比赛的核心设定。">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BASICS.map((b, i) => (
            <Reveal key={b.title} delay={i * 70}>
              <div className="h-full rounded-2xl border border-border bg-surface/40 p-6 text-center">
                <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <b.icon className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-bold">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 赛程 */}
      <Section
        tint
        eyebrow="Schedule"
        title="赛程与图池"
        lead="瑞士轮 → 半决赛 → 决赛 → 总决赛，星数逐轮上升（暂定）。"
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ROUNDS.map((r, i) => (
            <Reveal key={r.key} delay={i * 70}>
              <div className="h-full rounded-2xl border border-border bg-surface/40 p-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {r.nameEn}
                  </span>
                  {r.note && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] text-warning">{r.note}</span>}
                </div>
                <h3 className="text-lg font-bold">{r.name}</h3>
                <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>星数</span>
                    <span className="font-mono font-semibold text-gold">{r.stars}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BAN</span>
                    <span className="font-mono font-semibold">{r.ban}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>棋池</span>
                    <span className="font-mono font-semibold">{r.pool}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 队伍构成 */}
      <Section eyebrow="Roster" title="队伍构成" lead="每队 9 人，前 4 号随机落位，后 4 号选秀，最后 1 席为策略师。">
        <div className="mx-auto grid max-w-3xl gap-3">
          {ROSTER.map((r, i) => (
            <Reveal key={r.slot} delay={i * 50}>
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface/40 px-5 py-3.5">
                <div className="flex items-center gap-4">
                  <span className="w-16 font-mono text-sm font-bold text-gold">{r.slot}</span>
                  <span className="text-sm text-muted-foreground">{r.source}</span>
                </div>
                <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                  {r.tag}
                </span>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mx-auto mt-8 max-w-3xl">
          <div className="flex flex-wrap justify-center gap-2">
            {TEAMS.map((t) => (
              <span
                key={t}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface/40 font-mono text-sm font-bold text-gold"
              >
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* BWS 分级 */}
      <Section tint eyebrow="Tiers" title="BWS 分级" lead="报名选手按 BWS 分出 5 个 Tier，决定随机落位与选秀资格。">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 60}>
              <div className="h-full rounded-2xl border border-border bg-surface/40 p-6 text-center">
                <div className="font-mono text-lg font-bold text-gold">{t.name}</div>
                <div className="mt-1 text-sm font-semibold">{t.range}</div>
                <div className="mt-2 text-xs text-muted-foreground">{t.role}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 选秀 */}
      <Section eyebrow="Draft" title="选秀顺序" lead="随机组队三天后开选。四轮蛇形选秀，队长按顺序从 Tier V 挑人。">
        <div className="mx-auto grid max-w-3xl gap-3">
          {DRAFT_ROUNDS.map((d, i) => (
            <Reveal key={d} delay={i * 60}>
              <div className="flex items-center gap-4 rounded-xl border border-border bg-surface/40 px-5 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 font-mono text-sm font-bold text-gold">
                  R{i + 1}
                </span>
                <span className="font-mono text-sm">{d}</span>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mx-auto mt-8 max-w-3xl space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">注意：</span>
            选秀开始前，每队需有 1 名队长与 1 名策略师；Tier I–IV 优先成为选手，
            Tier V 优先成为策略师。个人退赛需合理理由，队伍退赛需全队同意并正式申请。
          </p>
          <p>
            替补仅限瑞士轮 R1 周，替补 Tier 不得高于退赛选手。
          </p>
        </Reveal>
      </Section>

      {/* Skillset */}
      <Section tint eyebrow="Skillset" title="图池 Skillset" lead="各棋子位的选图方向（pooler 可进一步修改）。">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SKILLSETS.map((s, i) => (
            <Reveal key={s.mod} delay={i * 40}>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3">
                <span className="font-mono text-sm font-bold text-gold">{s.mod}</span>
                <span className="text-sm text-muted-foreground">{s.desc}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </div>
  );
}
