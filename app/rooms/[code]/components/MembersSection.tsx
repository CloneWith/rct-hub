"use client";

/**
 * M4 — 成员与角色展示卡。
 *
 * 只读展示策略师/裁判/直播员/队长/选手（osu! ID + 已解析用户名），
 * 编辑统一走 RoomEditDialog（admin 或 match 房间指定裁判可见）。
 */

import { useState } from "react";
import { Button, Chip } from "@heroui/react";
import { Pencil, User } from "lucide-react";
import RoomEditDialog from "@/app/rooms/components/RoomEditDialog";
import { TEAM_SIDE_LABELS } from "@/app/lib/rooms";
import type { RoomSetup } from "@/app/lib/hooks";

type UserRef = { onlineID: string; username: string | null; avatarUrl?: string | null };

function MemberRow({
  label,
  userId,
  user,
}: {
  label: string;
  userId: string | null;
  user?: UserRef | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-default-200 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {userId ? (
        <span className="flex items-center gap-2 text-sm">
          {user?.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt=""
              className="size-5 rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <span className="font-medium">
            {user?.username ?? `osu! #${userId}`}
            <span className="ml-1.5 text-xs text-muted-foreground">#{userId}</span>
          </span>
        </span>
      ) : (
        <Chip variant="soft" color="default" size="sm">
          未指派
        </Chip>
      )}
    </div>
  );
}

export default function MembersSection({
  room,
  canEdit,
}: {
  room: RoomSetup;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const s = room.settings;

  const players = (side: "red" | "blue") => {
    const ids = side === "red" ? s.redPlayers : s.bluePlayers;
    const leader = side === "red" ? s.redLeader : s.blueLeader;
    return ids.length === 0 ? (
      <span className="text-xs text-muted-foreground">未配置</span>
    ) : (
      <span className="text-sm">
        {ids.map((id, i) => (
          <span key={id}>
            {i > 0 && "、"}
            <span className={id === leader ? "font-semibold text-primary" : undefined}>
              #{id}
              {id === leader && "（队长）"}
            </span>
          </span>
        ))}
      </span>
    );
  };

  return (
    <section className="rounded-xl border border-default-200 bg-default-50/40 p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <User className="size-4" />
          成员与角色
        </h2>
        {canEdit && (
          <Button variant="secondary" size="sm" onPress={() => setEditing(true)}>
            <Pencil className="size-3.5" />
            编辑配置
          </Button>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground">红方（{TEAM_SIDE_LABELS.RED}）</h3>
          <MemberRow
            label="策略师"
            userId={s.redStrategistUserID}
            user={s.redStrategist ? { onlineID: s.redStrategist.onlineID, username: s.redStrategist.username, avatarUrl: s.redStrategist.avatarUrl } : null}
          />
          <MemberRow
            label="队长"
            userId={s.redLeader}
          />
          <div className="rounded-lg border border-default-200 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">选手</span>
              <span className="text-xs text-muted-foreground">{s.redPlayers.length} 人</span>
            </div>
            <div className="mt-1">{players("red")}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground">蓝方（{TEAM_SIDE_LABELS.BLUE}）</h3>
          <MemberRow
            label="策略师"
            userId={s.blueStrategistUserID}
            user={s.blueStrategist ? { onlineID: s.blueStrategist.onlineID, username: s.blueStrategist.username, avatarUrl: s.blueStrategist.avatarUrl } : null}
          />
          <MemberRow
            label="队长"
            userId={s.blueLeader}
          />
          <div className="rounded-lg border border-default-200 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">选手</span>
              <span className="text-xs text-muted-foreground">{s.bluePlayers.length} 人</span>
            </div>
            <div className="mt-1">{players("blue")}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 border-t border-default-200 pt-4 md:grid-cols-2">
        <MemberRow
          label="裁判"
          userId={room.refereeUserID}
          user={room.referee ? { onlineID: room.referee.onlineID, username: room.referee.username, avatarUrl: room.referee.avatarUrl } : null}
        />
        <MemberRow
          label="直播员"
          userId={s.streamerUserID}
          user={s.streamer ? { onlineID: s.streamer.onlineID, username: s.streamer.username, avatarUrl: s.streamer.avatarUrl } : null}
        />
      </div>

      {editing && <RoomEditDialog room={room} onClose={() => setEditing(false)} />}
    </section>
  );
}
