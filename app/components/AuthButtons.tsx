"use client";

import Link from "next/link";
import { Button, Chip } from "@heroui/react";
import { LogIn, BookOpen, ArrowRight } from "lucide-react";
import { getOsuLoginUrl } from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";

export default function AuthButtons({ className = "" }: { className?: string }) {
  const { user } = useAuth();

  return (
    <div className={"flex flex-wrap items-center gap-3 " + className}>
      {user ? (
        <Chip size="lg" variant="soft" color="accent" className="h-11 gap-2 px-4 text-sm font-medium">
          欢迎回来，{user.username}
        </Chip>
      ) : (
        <a href={getOsuLoginUrl()}>
          <Button variant="primary" size="lg" className="h-11 gap-2 px-5 text-base font-medium">
            <LogIn className="h-5 w-5" />
            使用 osu! 登录
          </Button>
        </a>
      )}
      <Link href="/rules">
        <Button variant="outline" size="lg" className="h-11 gap-2 px-5 text-base font-medium">
          <BookOpen className="h-5 w-5" />
          了解玩法
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
