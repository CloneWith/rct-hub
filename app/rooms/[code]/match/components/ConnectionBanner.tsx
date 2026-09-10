"use client";

/**
 * ConnectionBanner — global connection state strip (visible to every role).
 * Rendered only when the WS channel is not live, per roadmap §3.8.
 */

import { useMatchLive } from "../MatchLiveProvider";
import { Button } from "@heroui/react";

const LABELS: Record<string, { text: string; tone: string }> = {
  connecting: { text: "正在连接比赛实况…", tone: "bg-primary/15 text-primary" },
  reconnecting: { text: "连接中断，正在重连…", tone: "bg-warning/15 text-warning" },
  desynced: { text: "检测到状态不同步，正在重新同步…", tone: "bg-warning/15 text-warning" },
  failed: { text: "无法连接比赛实况", tone: "bg-danger/15 text-danger" },
};

export default function ConnectionBanner() {
  const { status, statusDetail, resync } = useMatchLive();
  const label = LABELS[status];
  if (!label) return null;

  return (
    <div
      className={`flex items-center justify-center gap-3 rounded-lg px-4 py-2 text-sm font-medium ${label.tone}`}
      role="status"
    >
      <span>
        {label.text}
        {status === "failed" && statusDetail ? `（${statusDetail}）` : ""}
      </span>
      {status === "failed" && (
        <Button size="sm" variant="secondary" onPress={resync}>
          重试
        </Button>
      )}
    </div>
  );
}
