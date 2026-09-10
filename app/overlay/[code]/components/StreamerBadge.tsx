"use client";

/**
 * StreamerBadge — corner badge identifying the room's designated streamer
 * (avatar + username). Anti-impersonation: viewers of the overlay know who is
 * officially casting, per the original spec.
 */

import { Avatar } from "@heroui/react";

interface StreamerUser {
  username: string;
  avatarUrl?: string | null;
}

export default function StreamerBadge({
  streamer,
  roomName,
}: {
  streamer: StreamerUser | null | undefined;
  roomName?: string | null;
}) {
  return (
    <div className="pointer-events-none flex items-center gap-2 rounded-full border border-white/10 bg-black/40 py-1 pl-1 pr-3 backdrop-blur-sm">
      {streamer ? (
        <>
          <Avatar size="sm" className="h-6 w-6">
            <Avatar.Image src={streamer.avatarUrl ?? ""} alt="" />
            <Avatar.Fallback>{streamer.username.slice(0, 1).toUpperCase()}</Avatar.Fallback>
          </Avatar>
          <div className="flex flex-col leading-tight">
            <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
              直播员
            </span>
            <span className="text-xs font-semibold">{streamer.username}</span>
          </div>
        </>
      ) : (
        <span className="px-2 text-xs text-muted-foreground">
          {roomName ? `${roomName} · 未指定直播员` : "未指定直播员"}
        </span>
      )}
    </div>
  );
}
