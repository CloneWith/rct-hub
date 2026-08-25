"use client";

/**
 * NarrowScreenGuard — the board screen requires a wide viewport (~900px+).
 * Below that we render a full-screen notice instead of a cramped layout.
 */

import { useIsClient } from "@/app/lib/hooks";
import { useEffect, useState } from "react";

export default function NarrowScreenGuard({ children }: { children: React.ReactNode }) {
  const isClient = useIsClient();
  const [wide, setWide] = useState(true);

  useEffect(() => {
    if (!isClient) return;
    const mq = window.matchMedia("(min-width: 900px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [isClient]);

  if (!isClient || wide) return <>{children}</>;

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      <p className="text-5xl">🖥️</p>
      <h2 className="text-xl font-bold">请使用更大的屏幕</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        棋房界面为宽屏设计，当前窗口过窄。请调整窗口大小、旋转设备或在电脑上访问。
      </p>
    </div>
  );
}
