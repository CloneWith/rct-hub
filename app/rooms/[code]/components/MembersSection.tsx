"use client";

import { useState } from "react";
import { Button, Chip, ListBox, Select, toast } from "@heroui/react";
import { Pencil, User } from "lucide-react";
import RoomEditDialog from "@/app/rooms/components/RoomEditDialog";
import InlineEdit from "./InlineEdit";
import IdLookupInput from "@/app/components/IdLookupInput";
import {
  useSetRoomBpOrder,
  useSetRoomReferee,
  useSetRoomStreamer,
  useUserSearch,
  type RoomSetup,
} from "@/app/lib/hooks";
import { TEAM_SIDE_LABELS } from "@/app/lib/rooms";
import type { TeamSide } from "@/app/graphql/graphql";

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

type EditingField = "referee" | "streamer" | "bpOrder" | null;

export default function MembersSection({ room, canEdit }: { room: RoomSetup; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [editingField, setEditingField] = useState<EditingField>(null);

  // Draft values for the inline editors.
  const [refereeDraft, setRefereeDraft] = useState<number | null>(null);
  const [streamerDraft, setStreamerDraft] = useState<number | null>(null);
  const [firstPickDraft, setFirstPickDraft] = useState<TeamSide | null>(null);
  const [firstBanDraft, setFirstBanDraft] = useState<TeamSide | null>(null);

  const setReferee = useSetRoomReferee();
  const setStreamer = useSetRoomStreamer();
  const setBpOrder = useSetRoomBpOrder();

  const s = room.settings;

  const cancelEdit = () => setEditingField(null);

  const saveReferee = () => {
    setReferee.mutate(
      { id: room.id, refereeUserId: refereeDraft },
      { onSuccess: () => setEditingField(null) },
    );
  };

  const saveStreamer = () => {
    setStreamer.mutate(
      { id: room.id, streamerUserId: streamerDraft },
      { onSuccess: () => setEditingField(null) },
    );
  };

  const saveBpOrder = () => {
    if (!firstPickDraft || !firstBanDraft) {
      toast.danger("先选方与先禁方均需选择");
      return;
    }
    setBpOrder.mutate(
      {
        id: room.id,
        firstPick: firstPickDraft.toLowerCase() as "red" | "blue",
        firstBan: firstBanDraft.toLowerCase() as "red" | "blue",
      },
      { onSuccess: () => setEditingField(null) },
    );
  };

  const refereeLabel = room.referee?.username ?? (room.refereeUserID ? `#${room.refereeUserID}` : "未指派");
  const streamerLabel = s.streamer?.username ?? (s.streamerUserID ? `#${s.streamerUserID}` : "未指派");
  const bpLabel = `${s.firstPick ? TEAM_SIDE_LABELS[s.firstPick] : "未设置"} / ${s.firstBan ? TEAM_SIDE_LABELS[s.firstBan] : "未设置"}`;

  return (
    <section className="rounded-xl border border-default-200 bg-default-50/40 p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <User className="size-4" />成员与角色
        </h2>
        {canEdit && (
          <Button variant="secondary" size="sm" onPress={() => setEditing(true)}>
            <Pencil className="size-3.5" />编辑配置
          </Button>
        )}
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <TeamCard label={TEAM_SIDE_LABELS.RED} team={s.redTeam} />
        <TeamCard label={TEAM_SIDE_LABELS.BLUE} team={s.blueTeam} />
      </div>

      {/* ---- Inline-editable assignments & BP order ---- */}
      <div className="mt-3 flex flex-col gap-3 border-t border-default-200 pt-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-muted-foreground">裁判</span>
          <div className="min-w-0 flex-1">
            <InlineEdit
              display={refereeLabel}
              canEdit={canEdit}
              editing={editingField === "referee"}
              pending={setReferee.isPending}
              onStartEdit={() => {
                setRefereeDraft(room.refereeUserID ? Number(room.refereeUserID) : null);
                setEditingField("referee");
              }}
              onCancel={cancelEdit}
              onSave={saveReferee}
            >
              <IdLookupInput
                placeholder="搜索裁判用户名或 ID"
                useSearch={useUserSearch}
                getItemId={(u) => Number(u.onlineID)}
                getItemLabel={(u) => `${u.username} (#${u.onlineID})`}
                value={refereeDraft}
                onChange={(v) => setRefereeDraft(v)}
              />
            </InlineEdit>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-muted-foreground">直播员</span>
          <div className="min-w-0 flex-1">
            <InlineEdit
              display={streamerLabel}
              canEdit={canEdit}
              editing={editingField === "streamer"}
              pending={setStreamer.isPending}
              onStartEdit={() => {
                setStreamerDraft(s.streamerUserID ? Number(s.streamerUserID) : null);
                setEditingField("streamer");
              }}
              onCancel={cancelEdit}
              onSave={saveStreamer}
            >
              <IdLookupInput
                placeholder="搜索直播员用户名或 ID"
                useSearch={useUserSearch}
                getItemId={(u) => Number(u.onlineID)}
                getItemLabel={(u) => `${u.username} (#${u.onlineID})`}
                value={streamerDraft}
                onChange={(v) => setStreamerDraft(v)}
              />
            </InlineEdit>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-muted-foreground">先选/先禁</span>
          <div className="min-w-0 flex-1">
            <InlineEdit
              display={bpLabel}
              canEdit={canEdit}
              editing={editingField === "bpOrder"}
              pending={setBpOrder.isPending}
              onStartEdit={() => {
                setFirstPickDraft(s.firstPick ?? null);
                setFirstBanDraft(s.firstBan ?? null);
                setEditingField("bpOrder");
              }}
              onCancel={cancelEdit}
              onSave={saveBpOrder}
            >
              <div className="flex items-center gap-2">
                <SideSelect value={firstPickDraft} onChange={setFirstPickDraft} label="先选" />
                <SideSelect value={firstBanDraft} onChange={setFirstBanDraft} label="先禁" />
              </div>
            </InlineEdit>
          </div>
        </div>
      </div>

      {editing && <RoomEditDialog room={room} onClose={() => setEditing(false)} />}
    </section>
  );
}

function SideSelect({
  value,
  onChange,
  label,
}: {
  value: TeamSide | null;
  onChange: (v: TeamSide | null) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <Select
        value={value ?? undefined}
        onChange={(v) => onChange((v as TeamSide) ?? null)}
      >
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {(["RED", "BLUE"] as const).map((side) => (
              <ListBox.Item key={side} id={side} textValue={TEAM_SIDE_LABELS[side]}>
                {TEAM_SIDE_LABELS[side]}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
