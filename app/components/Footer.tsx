import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Gamepad2 } from "lucide-react";
import { THEME_NOTE } from "@/app/lib/tournament";

const LINKS = [
  { href: "/rules", label: "玩法规则" },
  { href: "/format", label: "赛制与队伍" },
  { href: "/prizes", label: "奖品" },
  { href: "/news", label: "公告" },
];

// 版权年份必须在请求时计算：Cache Components 的预渲染阶段禁止同步 IO
// （new Date() 等非确定性调用会直接导致构建失败）。connection() 把该片段
// 标记为动态，推迟到请求时执行；静态 shell 中 fallback 先行渲染。
async function CopyrightLine() {
  await connection();
  return (
    <span>© {new Date().getFullYear()} Ranka&apos;s Chess Tournament · 非官方 osu! 赛事</span>
  );
}

export default function Footer() {
  return (
    <footer className="relative border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Gamepad2 className="h-5 w-5" />
              </span>
              <span>
                RCT <span className="text-gold">S1</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Ranka&apos;s Chess Tournament —— 一个把 osu! 谱面当作棋子、
              在 4×4 棋盘上对弈的团队赛。
            </p>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-muted-foreground/80">
              {THEME_NOTE}
            </p>
          </div>

          <div>
            <div className="mb-3 text-sm font-semibold">页面</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-3 text-sm font-semibold">技术</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Go + Gin + MongoDB + Redis</li>
              <li>GraphQL + REST API</li>
              <li>Next.js + HeroUI</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <Suspense fallback={<span>© Ranka&apos;s Chess Tournament · 非官方 osu! 赛事</span>}>
            <CopyrightLine />
          </Suspense>
          <span className="font-mono">核冬天开始的第 165 天</span>
        </div>
      </div>
    </footer>
  );
}
