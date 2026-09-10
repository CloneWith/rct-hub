"use client";

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Swords,
  Megaphone,
  Menu,
  X,
  BookOpen,
  DoorOpen,
  Gift,
} from "lucide-react";

const navLinks = [
  { href: "/", label: "首页", icon: Home },
  { href: "/rooms", label: "房间", icon: DoorOpen },
  { href: "/rules", label: "玩法规则", icon: BookOpen },
  { href: "/format", label: "赛制", icon: Swords },
  { href: "/prizes", label: "奖品", icon: Gift },
  { href: "/news", label: "公告", icon: Megaphone },
];

const desktopClass = (active: boolean) =>
  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors " +
  (active
    ? "bg-primary/15 text-primary"
    : "text-muted-foreground hover:text-foreground hover:bg-muted");

const mobileClass = (active: boolean) =>
  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors " +
  (active
    ? "bg-primary/15 text-primary"
    : "text-muted-foreground hover:text-foreground hover:bg-muted");

/**
 * 导航主体（client）：静态链接高亮 + 移动菜单开关。
 * 只依赖 Link/usePathname/lucide —— 重量依赖（HeroUI、AuthContext）
 * 通过 props 注入的 UserMenu / UserMenuMobile 隔离，静态页不再被拖累。
 *
 * `usePathname` 是未缓存动态数据：动态路由（如 /rooms/[code]/match）在
 * 预渲染时必须位于 <Suspense> 边界内，否则整个路由的静态外壳被阻塞。
 * 预渲染兜底渲染无高亮态的链接列表（仅 class 不同，结构一致）。
 */

type NavVariant = "desktop" | "mobile";

function NavLinks({
  variant,
  pathname,
  onNavigate,
}: {
  variant: NavVariant;
  /** null = 预渲染兜底（无高亮态）。 */
  pathname: string | null;
  onNavigate?: () => void;
}) {
  const cls = variant === "desktop" ? desktopClass : mobileClass;
  const isActive = (href: string) => pathname === href;
  return (
    <>
      {navLinks.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={cls(isActive(href))}
        >
          <Icon className={variant === "desktop" ? "w-4 h-4" : "w-5 h-5"} />
          {label}
        </Link>
      ))}
    </>
  );
}

function ActiveNavLinks(props: { variant: NavVariant; onNavigate?: () => void }) {
  const pathname = usePathname();
  return <NavLinks {...props} pathname={pathname} />;
}

export function NavClient({
  children,
  actions,
  mobileFooter,
}: {
  /** 左侧 Logo（由 server 端渲染后传入） */
  children: ReactNode;
  /** 右侧用户区（UserMenu，client 岛） */
  actions: ReactNode;
  /** 移动菜单底部的用户操作（UserMenuMobile） */
  mobileFooter?: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {children}

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          <Suspense fallback={<NavLinks variant="desktop" pathname={null} />}>
            <ActiveNavLinks variant="desktop" />
          </Suspense>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {actions}

          {/* Mobile menu toggle */}
          <button
            type="button"
            aria-label={mobileOpen ? "关闭菜单" : "打开菜单"}
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md">
          <div className="px-4 py-3 flex flex-col gap-1">
            <Suspense fallback={<NavLinks variant="mobile" pathname={null} />}>
              <ActiveNavLinks
                variant="mobile"
                onNavigate={() => setMobileOpen(false)}
              />
            </Suspense>
            {mobileFooter}
          </div>
        </div>
      )}
    </>
  );
}
