"use client";

import Link from "next/link";
import {
  Button,
  Dropdown,
  Label,
  Avatar,
  Chip,
  Separator,
} from "@heroui/react";
import { ChevronDown, LogIn, LogOut, Shield, User } from "lucide-react";
import { getOsuLoginUrl } from "@/app/lib/api";
import { useIsClient } from "@/app/lib/hooks";
import { useAuth } from "@/app/context/AuthContext";

/** SSR 阶段的用户区占位，避免 hydration mismatch。 */
function Skeleton() {
  return (
    <div className="h-8 w-24 animate-pulse rounded-md bg-muted sm:w-32" aria-hidden="true" />
  );
}

/** 桌面端用户区：登录按钮 / 用户下拉菜单。独立成 client 岛，
 *  使 Navbar 主体与静态页不再强制加载 HeroUI + react-query。 */
export function UserMenu() {
  const { user, logout } = useAuth();
  const isClient = useIsClient();

  if (!isClient) return <Skeleton />;

  if (user) {
    return (
      <Dropdown>
        <Button variant="ghost" size="sm" className="flex items-center gap-2 px-2">
          <Avatar size="sm" className="w-7 h-7">
            <Avatar.Image src={user.avatarUrl} alt={user.username} />
            <Avatar.Fallback>
              <User className="w-4 h-4" />
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
                  <Avatar.Fallback>
                    <User className="w-5 h-5" />
                  </Avatar.Fallback>
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
    );
  }

  return (
    <a href={getOsuLoginUrl()}>
      <Button variant="primary" size="sm" className="gap-2">
        <LogIn className="w-4 h-4" />
        <span className="hidden sm:inline">使用 osu! 登录</span>
        <span className="sm:hidden">登录</span>
      </Button>
    </a>
  );
}

/** 移动端菜单底部的用户操作（管理后台入口 + 退出）。 */
export function UserMenuMobile() {
  const { user, logout } = useAuth();
  const isClient = useIsClient();

  // SSR / 未登录：移动菜单不渲染用户操作（登录入口在顶部右侧）
  if (!isClient || !user) return null;

  return (
    <>
      {user.roles.includes("ADMIN") && (
        <Link
          href="/admin"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Shield className="w-5 h-5" />
          管理后台
        </Link>
      )}
      <button
        type="button"
        onClick={() => logout()}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        退出登录
      </button>
    </>
  );
}
