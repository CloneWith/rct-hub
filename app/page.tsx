import Link from "next/link";
import { ArrowRight, Swords, MousePointerClick, Grid3X3, Users, Trophy, Gift, Sparkles } from "lucide-react";
import AshField from "@/app/components/AshField";
import AuthButtons from "@/app/components/AuthButtons";
import BoardShowcase from "@/app/components/BoardShowcase";
import PieceGlyph from "@/app/components/PieceGlyph";
import Section, { Eyebrow } from "@/app/components/Section";
import Reveal from "@/app/components/Reveal";
import { getNewsFeed, type NewsItem } from "@/app/lib/news";
import {
  CHARACTERS,
  DEAD_PIECE,
  PIECES,
  POOL_TOTAL,
  PRIZE_TIERS,
  ROUNDS,
  STORY,
  ZONES,
} from "@/app/lib/tournament";

const METRICS = [
  { value: "4v4", label: "队伍对抗 · 强制 NoFail · Score V2" },
  { value: "8 队", label: "每队 9 人 · 8 选手 + 1 策略师" },
  { value: "4×4", label: "棋盘 · HD / HR / DT / NM 四个限定区" },
  { value: POOL_TOTAL + " 枚", label: "图池棋子 · NM / HD / HR / DT / FM / 白 / TB" },
];

const STEPS = [
  {
    n: "01",
    icon: MousePointerClick,
    title: "选棋 · 落子",
    desc: "策略师从棋池选出一枚棋子，点选棋盘上的格子落子（受限定区约束）。",
  },
  {
    n: "02",
    icon: Swords,
    title: "对决 · 归属",
    desc: "两队立即在该谱面上对决，胜者持有这枚棋子，进入下一回合。",
  },
  {
    n: "03",
    icon: Grid3X3,
    title: "连对 · 获胜",
    desc: "率先让己方赢棋横向、纵向或对角连成四连对，即取得本场胜利。",
  },
];

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

function NewsSummary({ item }: { item: NewsItem }) {
  return (
    <Link
      href="/news"
      className="group flex h-full flex-col rounded-2xl border border-border bg-surface/40 p-6 transition-colors hover:border-gold/40"
    >
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">
          {item.kind === "post" ? "Post" : "公告"}
        </span>
        <span>{formatDate(item.publishedAt)}</span>
      </div>
      <h3 className="mb-2 font-semibold leading-snug transition-colors group-hover:text-gold">
        {item.title}
      </h3>
      <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">{item.summary}</p>
    </Link>
  );
}

export default async function Home() {
  const news = (await getNewsFeed()).slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* ============ Hero ============ */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 72% 18%, rgba(229,72,63,0.16), transparent 62%), radial-gradient(48% 42% at 15% 82%, rgba(238,193,90,0.10), transparent 60%), radial-gradient(40% 40% at 50% 120%, rgba(31,59,44,0.5), transparent 70%)",
          }}
        />
        <AshField count={44} />
        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 sm:pb-32 sm:pt-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <Reveal>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur">
                  <Sparkles className="h-4 w-4 text-gold" />
                  RCT S1 · Ranka&apos;s Chess Tournament
                </div>
              </Reveal>
              <Reveal delay={60}>
                <h1 className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                  <span className="text-gradient-ember">在核冬天里</span>
                  <br />
                  <span className="text-gradient-snow">下一盘棋</span>
                </h1>
              </Reveal>
              <Reveal delay={120}>
                <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
                  RCT 是 OFFC 系列的第三个比赛（更名）—— 限国内 Open Rank，
                  4v4、强制 NoFail、Score V2。8 支队伍、9 人一队，
                  把 osu! 谱面当作棋子，在 4×4 棋盘上决出胜负。
                </p>
              </Reveal>
              <Reveal delay={180}>
                <AuthButtons className="mt-8" />
              </Reveal>
            </div>

            <Reveal delay={120} className="mx-auto w-full max-w-[560px]">
              <BoardShowcase />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ 指标 ============ */}
      <section className="border-y border-border bg-ash/40">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-border sm:grid-cols-4">
          {METRICS.map((m) => (
            <div key={m.label} className="px-6 py-8 text-center sm:py-10">
              <div className="text-3xl font-bold text-gradient-ember sm:text-4xl">{m.value}</div>
              <div className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ 玩法三步 ============ */}
      <Section
        eyebrow="How to play"
        title="一场比赛是怎么进行的？"
        lead="三名角色协作：选手在赛图上比拼，策略师在棋盘上博弈，裁判掌控全局。"
      >
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-surface/40 p-8 transition-colors hover:border-primary/40">
                <div className="mb-6 flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <s.icon className="h-6 w-6" />
                  </span>
                  <span className="font-mono text-3xl font-bold text-border">{s.n}</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ============ 棋子 ============ */}
      <Section
        tint
        eyebrow="Pieces"
        title="七种棋子，一枚白子"
        lead="棋子沿用上一届遗产并翻新。NM / FM / 白 可任意落子；HD / HR / DT 只能落在对应限定区内。"
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {PIECES.map((p, i) => (
            <Reveal key={p.key} delay={i * 60}>
              <div className="flex h-full flex-col items-center gap-3 rounded-2xl border border-border bg-surface/40 p-5 text-center">
                <PieceGlyph label={p.label} color={p.color} soft={p.soft} size="lg" />
                <div>
                  <div className="text-sm font-semibold" style={{ color: p.color }}>
                    {p.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{p.name}</div>
                </div>
              </div>
            </Reveal>
          ))}
          <Reveal delay={PIECES.length * 60}>
            <div className="flex h-full flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/40 p-5 text-center">
              <PieceGlyph label={DEAD_PIECE.label} color={DEAD_PIECE.color} soft={DEAD_PIECE.soft} size="lg" dead />
              <div>
                <div className="text-sm font-semibold text-muted-foreground">{DEAD_PIECE.name}</div>
                <div className="text-[11px] text-muted-foreground">夺棋代价</div>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal className="mx-auto mt-10 max-w-3xl">
          <div className="grid gap-3 sm:grid-cols-4">
            {ZONES.map((z) => (
              <div
                key={z.key}
                className="rounded-xl border border-border px-4 py-3 text-center"
                style={{ background: z.soft }}
              >
                <div className="font-mono text-sm font-bold" style={{ color: z.color }}>
                  {z.key}
                </div>
                <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{z.name}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* ============ 赛程 ============ */}
      <Section
        eyebrow="Schedule"
        title="赛程与图池"
        lead="从瑞士轮打到总决赛，星数与 BAN 数逐轮攀升（暂定，开赛前可能调整）。"
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ROUNDS.map((r, i) => (
            <Reveal key={r.key} delay={i * 80}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-surface/40 p-7 transition-colors hover:border-gold/40">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {r.nameEn}
                  </span>
                  {r.note && (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
                      {r.note}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold">{r.name}</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>参考星数</span>
                    <span className="font-mono font-semibold text-gold">{r.stars}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>BAN 数</span>
                    <span className="font-mono font-semibold">{r.ban}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>棋池</span>
                    <span className="font-mono font-semibold">{r.pool}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ============ 故事 ============ */}
      <section className="relative overflow-hidden border-y border-border bg-ash/60">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 50% at 50% 0%, rgba(238,193,90,0.06), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-6 py-24 sm:py-32">
          <Reveal className="text-center">
            <Eyebrow>背景故事</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {STORY.title}
            </h2>
          </Reveal>

          <Reveal delay={80} className="mt-12">
            <div className="space-y-6 font-serif-cjk text-lg leading-9 text-foreground/90 sm:text-xl sm:leading-10">
              {STORY.paragraphs.map((p, i) => (
                <p key={i} className={i === 0 ? "first-letter:float-left first-letter:mr-3 first-letter:text-5xl first-letter:font-bold first-letter:leading-none first-letter:text-primary" : ""}>
                  {p}
                </p>
              ))}
            </div>
            <p className="mt-10 text-center font-serif-cjk text-xl italic text-gold">
              —— {STORY.tagline}
            </p>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {CHARACTERS.map((c, i) => (
              <Reveal key={c.name} delay={i * 90}>
                <div className="relative overflow-hidden rounded-2xl border border-border bg-surface/40 p-7">
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: c.accent }} />
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-2xl font-bold" style={{ color: c.accent }}>
                      {c.name}
                    </h3>
                    <span className="text-sm text-muted-foreground">{c.age} 岁</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">{c.trait}</p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 奖品 ============ */}
      <Section
        eyebrow="Prizes"
        title="冠亚季军奖品"
        lead="冠军瓜分二次元玩偶奖池，前三名的策略师与全员都有 osu!supporter 与定制 banner。"
      >
        <div className="grid gap-6 sm:grid-cols-3">
          {PRIZE_TIERS.map((p, i) => (
            <Reveal key={p.tier} delay={i * 80}>
              <div className="flex h-full flex-col rounded-2xl border border-border bg-surface/40 p-7">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 text-2xl">
                    {p.emoji}
                  </span>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {p.tier}
                    </div>
                    <h3 className="font-semibold">{p.title}</h3>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
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
        <Reveal className="mt-10 text-center">
          <Link
            href="/prizes"
            className="inline-flex items-center gap-2 text-sm font-medium text-gold transition-colors hover:text-primary"
          >
            <Gift className="h-4 w-4" />
            查看完整奖品与玩偶奖池
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </Section>

      {/* ============ 公告 ============ */}
      <Section tint eyebrow="News" title="最新公告" lead="赛事动态与更新。">
        {news.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-3">
            {news.map((n, i) => (
              <Reveal key={n.kind === "post" ? n.slug : n.id} delay={i * 80}>
                <NewsSummary item={n} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal className="mx-auto max-w-md rounded-2xl border border-border bg-surface/40 p-10 text-center text-muted-foreground">
            <Trophy className="mx-auto mb-4 h-10 w-10 opacity-30" />
            <p>暂时没有公告，敬请期待。</p>
          </Reveal>
        )}
        <Reveal className="mt-10 text-center">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-sm font-medium text-gold transition-colors hover:text-primary"
          >
            查看全部公告
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </Section>

      {/* ============ CTA ============ */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 60% at 50% 50%, rgba(229,72,63,0.14), transparent 70%)",
          }}
        />
        <AshField count={24} />
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
          <Reveal>
            <Users className="mx-auto mb-6 h-10 w-10 text-gold" />
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              准备好在核冬天里落子了吗？
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              用 osu! 账号登录，创建棋房、约战，或成为策略师掌控棋盘。
            </p>
            <AuthButtons className="mt-8 justify-center" />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
