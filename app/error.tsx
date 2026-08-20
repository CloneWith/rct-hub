"use client";

import { useEffect } from "react";
import { Bomb, RefreshCw } from "lucide-react";
import { Button } from "@heroui/react";

export default function RootError({
                                    error,
                                    reset,
                                  }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <Bomb className="mx-auto mb-6 flex h-14 w-14 items-center justify-center text-danger text-3xl"/>
        <p className="font-mono text-5xl font-bold text-gradient-ember">Error!</p>
        <h1 className="mt-4 font-serif-cjk text-2xl font-bold">喂，放轻松！</h1>
        <div className="mt-3 flex flex-col gap-3 items-centre justify-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            页面加载失败，但大概率不是你的问题。
          </p>
          {error.digest && (
            <p className="mt-1 block font-mono text-xs text-muted-foreground/70">
              相关信息：{error.digest}
            </p>
          )}
          <p className="text-sm leading-relaxed text-muted-foreground">
            如果该错误持续发生，请向我们报告。
          </p>
        </div>
        <Button
          onClick={reset}
          className="mt-8"
        >
          <RefreshCw/>
          重试
        </Button>
      </div>
    </div>
  );
}
