"use client";

/**
 * StreamerPanel — floating control panel for the room's designated streamer
 * (or admins). Local-only concerns (D8): overlay link copy, layout presets,
 * IPC bridge status, sound toggle. Nothing here touches the backend.
 */

import { useState } from "react";
import { Button, Chip, toast } from "@heroui/react";
import { Check, Copy, Link2, MonitorPlay, Settings2, Volume2, VolumeX } from "lucide-react";
import type { AuthUser, RoomSetup } from "@/app/lib/hooks";
import { isAdmin } from "@/app/lib/rooms";
import { OVERLAY_LAYOUTS, type OverlayLayout } from "../lib/layouts";
import type { IpcBridgeState } from "../lib/useIpcBridge";

const IPC_LABEL: Record<IpcBridgeState["status"], { text: string; tone: "success" | "warning" | "default" }> = {
  connecting: { text: "IPC 连接中…", tone: "warning" },
  live: { text: "IPC 已连接", tone: "success" },
  offline: { text: "IPC 未运行", tone: "default" },
};

export default function StreamerPanel({
  room,
  me,
  layout,
  onLayoutChange,
  ipc,
  soundOn,
  onSoundToggle,
}: {
  room: RoomSetup;
  me: AuthUser | null;
  layout: OverlayLayout;
  onLayoutChange: (layout: OverlayLayout) => void;
  ipc: IpcBridgeState;
  soundOn: boolean;
  onSoundToggle: (on: boolean) => void;
}) {
  const isStreamer =
    me != null &&
    (isAdmin(me) || (room.settings.streamerUserID != null && String(me.onlineID) === room.settings.streamerUserID));

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isStreamer) return null;

  const overlayUrl =
    typeof window !== "undefined" ? `${window.location.origin}/overlay/${room.code}` : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Overlay 链接已复制");
    } catch {
      toast.danger("复制失败，请手动复制地址栏");
    }
  };

  const ipcLabel = IPC_LABEL[ipc.status];

  return (
    <div className="pointer-events-auto fixed bottom-4 left-4 z-50">
      {open && (
        <div className="mb-2 w-72 rounded-xl border border-white/10 bg-black/70 p-3 text-sm shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold">
              <MonitorPlay className="h-4 w-4" aria-hidden />
              直播员面板
            </span>
            <Chip size="sm" variant="soft" color={ipcLabel.tone}>
              {ipcLabel.text}
            </Chip>
          </div>

          {/* Overlay link */}
          <div className="mt-3">
            <div className="mb-1 text-xs text-muted-foreground">Overlay 链接（OBS 浏览器源）</div>
            <div className="flex items-center gap-1.5">
              <code className="min-w-0 flex-1 truncate rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs">
                {overlayUrl || "/overlay/[code]"}
              </code>
              <Button size="sm" variant="secondary" aria-label="复制链接" onPress={copyLink}>
                {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              </Button>
            </div>
          </div>

          {/* Layout presets */}
          <div className="mt-3">
            <div className="mb-1 text-xs text-muted-foreground">布局预设（仅本机）</div>
            <div className="grid grid-cols-3 gap-1.5">
              {OVERLAY_LAYOUTS.map((preset) => (
                <Button
                  key={preset.id}
                  size="sm"
                  variant={layout === preset.id ? "primary" : "secondary"}
                  onPress={() => onLayoutChange(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* IPC scores */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">本地 IPC 分数</span>
            <span className="font-mono tabular-nums">
              {ipc.status === "live" && ipc.score1 !== null && ipc.score2 !== null
                ? `${ipc.score1} : ${ipc.score2}`
                : "—"}
            </span>
          </div>

          {/* Sound */}
          <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
            <span className="text-xs text-muted-foreground">音效</span>
            <Button
              size="sm"
              variant="secondary"
              aria-label={soundOn ? "关闭音效" : "开启音效"}
              onPress={() => onSoundToggle(!soundOn)}
            >
              {soundOn ? <Volume2 className="h-3.5 w-3.5" aria-hidden /> : <VolumeX className="h-3.5 w-3.5" aria-hidden />}
              {soundOn ? "开" : "关"}
            </Button>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
            <Link2 className="h-3 w-3" aria-hidden />
            需本机运行 <code>tools/ipc-bridge</code> 才能显示 IPC 分数
          </div>
        </div>
      )}
      <Button
        variant="secondary"
        aria-label="直播员面板"
        className="border border-white/10 bg-black/50 backdrop-blur-sm"
        onPress={() => setOpen((v) => !v)}
      >
        <Settings2 className="h-4 w-4" aria-hidden />
        直播员面板
      </Button>
    </div>
  );
}
