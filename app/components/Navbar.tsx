import Link from "next/link";
import { Grid3X3 } from "lucide-react";
import { NavClient } from "@/app/components/NavClient";
import { UserMenu, UserMenuMobile } from "@/app/components/UserMenu";

/**
 * 导航栏（Server Component）：
 * - Logo / 导航链接 / 移动菜单由 server 渲染（NavClient 只负责高亮与开关）；
 * - 用户区（UserMenu）是独立 client 岛，HeroUI + AuthContext 依赖被隔离在
 *   此边界内，静态页（/rules /prizes /format）不再强制加载这些运行时。
 */
export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <NavClient actions={<UserMenu />} mobileFooter={<UserMenuMobile />}>
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
      </NavClient>
    </nav>
  );
}
