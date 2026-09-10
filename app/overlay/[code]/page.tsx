"use client";

/**
 * Overlay 直播页 — M5
 *
 * `/overlay/[code]`：OBS 浏览器源专用。无导航、透明背景、自动连 WS / 自动
 * 重连 / 晚加入全量恢复（MatchLiveProvider 提供），事件动画与音效由
 * `useOverlayAnimations` 驱动，角标显示房间指定直播员（防冒用）。
 *
 * 布局预设（board/score/full）与音效开关纯本地（localStorage，D8）；IPC
 * 桥接状态在页面级持有一次，向下传给 ScoreBar / StreamerPanel。
 *
 * 降级路径：
 * - 未开赛 / 房间不存在 → 静态"等待开赛"卡片
 * - WS 未连接 → 顶部细条提示（不打断直播画面）
 * - 观众直连（无会话）→ roomByCode 为 null，同样落到等待卡片
 */

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useIsClient, useMatchByCode, useMe, useRoomByCode } from "@/app/lib/hooks";
import type { RoomSetup } from "@/app/lib/hooks";
import { MatchLiveProvider, useMatchLive } from "../../rooms/[code]/match/MatchLiveProvider";
import { TEAM_COLORS, TEAM_LABELS } from "../../rooms/[code]/match/lib/visuals";
import type { MatchResultReason, TeamSide } from "../../rooms/[code]/match/lib/ws-protocol";
import OverlayBoard from "./components/OverlayBoard";
import OverlayScoreBar from "./components/OverlayScoreBar";
import StreamerBadge from "./components/StreamerBadge";
import StreamerPanel from "./components/StreamerPanel";
import { loadOverlayLayout, saveOverlayLayout, type OverlayLayout } from "./lib/layouts";
import { useIpcBridge } from "./lib/useIpcBridge";
import { loadSoundEnabled, saveSoundEnabled } from "../../rooms/[code]/match/lib/sounds";
import { resultReasonLabel, useOverlayAnimations } from "./lib/useOverlayAnimations";

/** 获胜横幅与 WS 状态条的动画类（共享 keyframes 已在 globals.css 定义）。 */

const MOD_SHORT: Record<string, string> = {
  NM: "NM",
  HD: "HD",
  HR: "HR",
  DT: "DT",
  FM: "FM",
  SHIRO: "Shiro",
  TB: "TB",
};

function ModRail() {
  const { snapshot } = useMatchLive();
  const slots = snapshot?.poolSlots ?? [];
  if (slots.length === 0) return null;
  return (
    <div className="flex w-40 shrink-0 flex-col gap-1 rounded-xl border border-white/10 bg-black/40 p-2 backdrop-blur-sm">
      <div className="mb-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
        图池
      </div>
      {slots.map((slot) => (
        <div
          key={slot.id}
          className={`flex items-center justify-between rounded-md px-2 py-1 text-xs ${
            slot.state === "BANNED"
              ? "bg-white/5 text-muted-foreground line-through"
              : slot.state === "SELECTED"
                ? "bg-white/10 text-foreground"
                : "text-foreground/80"
          }`}
        >
          <span className="font-semibold">{MOD_SHORT[slot.mod] ?? slot.mod}</span>
          <span className="font-mono text-[0.6rem] text-muted-foreground">
            {slot.state === "BANNED" ? "禁" : slot.state === "SELECTED" ? "选" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function WinFlash({ team, reason }: { team: TeamSide; reason: MatchResultReason }) {
  const color = TEAM_COLORS[team];
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="rcth-flash-in rcth-fade-out flex flex-col items-center gap-2 rounded-2xl border px-12 py-8 shadow-2xl"
        style={{ borderColor: `${color}66`, backgroundColor: `${color}1f` }}
      >
        <span className="text-5xl font-black tracking-widest" style={{ color }}>
          {TEAM_LABELS[team]} 获胜
        </span>
        <span className="text-sm text-foreground/70">{resultReasonLabel(reason)}</span>
      </div>
    </div>
  );
}

function WsStatusStrip() {
  const { status } = useMatchLive();
  if (status === "live") return null;
  const label =
    status === "connecting"
      ? "连接中…"
      : status === "reconnecting"
        ? "重连中…"
        : status === "desynced"
          ? "同步恢复中…"
          : "连接断开，正在重试";
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-2">
      <span className="rounded-full border border-white/10 bg-black/60 px-3 py-0.5 text-xs text-foreground/70 backdrop-blur-sm">
        {label}
      </span>
    </div>
  );
}

function OverlayStage({ room }: { room: RoomSetup }) {
  const { snapshot } = useMatchLive();
  const anims = useOverlayAnimations();
  const ipc = useIpcBridge(true);
  const { data: me } = useMe();

  const [layout, setLayout] = useState<OverlayLayout>(() => loadOverlayLayout());
  const [soundOn, setSoundOn] = useState(() => loadSoundEnabled());

  const changeLayout = (next: OverlayLayout) => {
    setLayout(next);
    saveOverlayLayout(next);
  };
  const toggleSound = (on: boolean) => {
    setSoundOn(on);
    saveSoundEnabled(on);
  };

  const showScore = layout !== "board";
  const showRail = layout === "full";

  return (
    <div className="pointer-events-none fixed inset-0 flex flex-col gap-4 p-5">

      {anims.winnerFlash && (
        <WinFlash team={anims.winnerFlash.team} reason={anims.winnerFlash.reason} />
      )}
      <WsStatusStrip />

      {/* 顶部分数条（board 布局隐藏） */}
      {showScore && (
        <div className="flex w-full justify-center">
          <OverlayScoreBar ipc={ipc} />
        </div>
      )}

      {/* 中部：棋盘 + 可选图池 rail */}
      <div className="flex min-h-0 flex-1 items-center justify-center gap-4">
        <div className="h-[min(68vh,62vw)] w-[min(68vh,62vw)]">
          <OverlayBoard
            board={snapshot?.board ?? null}
            placedPieces={anims.placedPieces}
            wonPieces={anims.wonPieces}
            robbedPieces={anims.robbedPieces}
          />
        </div>
        {showRail && <ModRail />}
      </div>

      {/* 底部：直播员角标 */}
      <div className="flex w-full items-end justify-between">
        <StreamerBadge streamer={room.settings.streamer} roomName={room.name} />
        <span className="font-mono text-[0.6rem] text-foreground/40">
          {room.name} · {room.code}
        </span>
      </div>

      {/* 直播员面板（仅指定直播员 / admin 可见） */}
      <StreamerPanel
        room={room}
        me={me ?? null}
        layout={layout}
        onLayoutChange={changeLayout}
        ipc={ipc}
        soundOn={soundOn}
        onSoundToggle={toggleSound}
      />
    </div>
  );
}

function OverlayRoot({ code }: { code: string }) {
  const isClient = useIsClient();
  const { data: room, isLoading: roomLoading } = useRoomByCode(code, true);
  const { data: match } = useMatchByCode(
    code,
    isClient && room?.matchID != null,
  );

  // 透明背景 + 隐藏全局导航（仅 overlay 路由生效，卸载即恢复）。
  useEffect(() => {
    document.documentElement.classList.add("rcth-overlay");
    return () => document.documentElement.classList.remove("rcth-overlay");
  }, []);

  if (!isClient || roomLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="rounded-xl border border-white/10 bg-black/40 px-6 py-4 text-center text-sm text-muted-foreground">
          未找到房间，或你尚未登录
          <div className="mt-1 font-mono text-xs opacity-70">{code}</div>
        </div>
      </div>
    );
  }

  if (room.matchID == null) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="rounded-xl border border-white/10 bg-black/40 px-6 py-4 text-center">
          <div className="text-sm font-semibold">{room.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">等待开赛…</div>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <MatchLiveProvider matchId={match.id}>
      <OverlayStage room={room} />
    </MatchLiveProvider>
  );
}

function OverlayPageInner() {
  const params = useParams<{ code: string }>();
  const code = params?.code ?? "";
  return <OverlayRoot code={code} />;
}

export default function OverlayPage() {
  // `useParams` is dynamic data under `cacheComponents` — it must sit inside
  // <Suspense> so the route shell can prerender and stream the content.
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-transparent text-muted-foreground">
          正在连接直播数据…
        </div>
      }
    >
      <OverlayPageInner />
    </Suspense>
  );
}
