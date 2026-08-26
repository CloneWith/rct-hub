"use client";

import { useState } from "react";
import { Button, Chip } from "@heroui/react";
import { Pencil, User } from "lucide-react";
import RoomEditDialog from "@/app/rooms/components/RoomEditDialog";
import { TEAM_SIDE_LABELS } from "@/app/lib/rooms";
import type { RoomSetup } from "@/app/lib/hooks";

function TeamCard({ label, team }: { label: string; team: RoomSetup["settings"]["redTeam"] }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-default-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{label}</h3>
        <Chip size="sm" variant="soft" color={team?.isReady ? "success" : "default"}>
          {team?.isReady ? "已就绪" : "未配置"}
        </Chip>
      </div>
      {team ? (
        <>
          <div className="font-medium">{team.name}</div>
          <div className="text-xs text-muted-foreground">
            队长 #{team.leaderID ?? "未指定"} · 策略师 #{team.strategistID ?? "未指定"}
          </div>
          <div className="text-xs text-muted-foreground">{team.playerIDs.length} 名队员</div>
        </>
      ) : (
        <span className="text-sm text-muted-foreground">尚未选择队伍</span>
      )}
    </div>
  );
}

export default function MembersSection({ room, canEdit }: { room: RoomSetup; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const s = room.settings;
  return (
    <section className="rounded-xl border border-default-200 bg-default-50/40 p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><User className="size-4" />成员与角色</h2>
        {canEdit && <Button variant="secondary" size="sm" onPress={() => setEditing(true)}><Pencil className="size-3.5" />编辑配置</Button>}
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        <TeamCard label={TEAM_SIDE_LABELS.RED} team={s.redTeam} />
        <TeamCard label={TEAM_SIDE_LABELS.BLUE} team={s.blueTeam} />
      </div>
      <div className="mt-3 grid gap-2 border-t border-default-200 pt-3 md:grid-cols-2 text-sm">
        <span>裁判：{room.referee?.username ?? (room.refereeUserID ? `#${room.refereeUserID}` : "未指派")}</span>
        <span>直播员：{s.streamerUserID ? `#${s.streamerUserID}` : "未指派"}</span>
      </div>
      {editing && <RoomEditDialog room={room} onClose={() => setEditing(false)} />}
    </section>
  );
}
