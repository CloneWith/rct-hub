"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Button,
  Dropdown,
  Label,
  Avatar,
  Chip,
  Separator,
} from "@heroui/react";
import {
  Grid3X3,
  Home,
  Swords,
  Megaphone,
  Shield,
  LogIn,
  LogOut,
  ChevronDown,
  Menu,
  X,
  BookOpen,
  Gift,
} from "lucide-react";
import { getOsuLoginUrl } from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";

const navLinks = [
  { href: "/", label: "首页", icon: Home },
  { href: "/rules", label: "玩法规则", icon: BookOpen },
  { href: "/format", label: "赛制", icon: Swords },
  { href: "/prizes", label: "奖品", icon: Gift },
  { href: "/news", label: "公告", icon: Megaphone },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  // The auth state depends on localStorage, which is unavailable during SSR.
  // Render a placeholder during SSR / initial hydration, then switch to the
  // real UI once the client has mounted to avoid hydration mismatches.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isActive = (href: string) => pathname === href;
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

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg transition-opacity hover:opacity-80"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Grid3X3 className="h-4 w-4" />
          </span>
          <span>
            RCT <span className="text-gold">S1</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={desktopClass(isActive(href))}>
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {mounted ? (
            user ? (
              <Dropdown>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 px-2">
                  <Avatar size="sm" className="w-7 h-7">
                    <Avatar.Image src={user.avatarUrl} alt={user.username} />
                    <Avatar.Fallback>
                      {user.username.slice(0, 2).toUpperCase()}
                    </Avatar.Fallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm">{user.username}</span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
                <Dropdown.Popover placement="bottom end">
                  <Dropdown.Menu>
                    <Dropdown.Item id="profile" textValue="Profile" className="pointer-events-none">
                      <div className="flex items-center gap-3 p-1">
                        <Avatar size="md">
                          <Avatar.Image src={user.avatarUrl} alt={user.username} />
                          <Avatar.Fallback>{user.username.slice(0, 2).toUpperCase()}</Avatar.Fallback>
                        </Avatar>
                        <div>
                          <Label>{user.username}</Label>
                          <div className="flex gap-1 mt-1">
                            {user.roles.map((r) => (
                              <Chip key={r} size="sm" color={r === "ADMIN" ? "danger" : r === "REFEREE" ? "warning" : "accent"}>
                                {r}
                              </Chip>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Dropdown.Item>
                    <Separator />
                    {user.roles.includes("ADMIN") && (
                      <Dropdown.Item id="admin" textValue="Admin Dashboard" href="/admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          <Label>管理后台</Label>
                        </div>
                      </Dropdown.Item>
                    )}
                    <Dropdown.Item
                      id="logout"
                      textValue="Logout"
                      onAction={() => logout()}
                    >
                      <div className="flex items-center gap-2 text-danger">
                        <LogOut className="w-4 h-4" />
                        <Label>退出登录</Label>
                      </div>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            ) : (
              <a href={getOsuLoginUrl()}>
                <Button variant="primary" size="sm" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">使用 osu! 登录</span>
                  <span className="sm:hidden">登录</span>
                </Button>
              </a>
            )
          ) : (
            <div className="h-8 w-24 animate-pulse rounded-md bg-muted sm:w-32" aria-hidden="true" />
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            className="md:hidden"
            onPress={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md">
          <div className="px-4 py-3 flex flex-col gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={mobileClass(isActive(href))}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
            {user?.roles.includes("ADMIN") && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={mobileClass(isActive("/admin"))}
              >
                <Shield className="w-5 h-5" />
                管理后台
              </Link>
            )}
            {user && (
              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                退出登录
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
