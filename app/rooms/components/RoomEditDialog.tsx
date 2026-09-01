"use client";

import { useState } from "react";
import { Button, Input, Label, ListBox, Modal, Select, TextField, toast } from "@heroui/react";
import { useSetRoomMPLink, useSetRoomMappool, useSetRoomStreamLink, useSetRoomTeams, useUpdateRoomMetadata, useMappools, useTeams } from "@/app/lib/hooks";
import type { RoomItem } from "@/app/lib/rooms";

function isoToLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function RoomEditDialog({ room, onClose }: { room: RoomItem; onClose: () => void }) {
  const [name, setName] = useState(room.name);
  const [scheduledAt, setScheduledAt] = useState(isoToLocalInput(room.scheduledAt));
  const [redTeamId, setRedTeamId] = useState(room.settings.redTeamID ?? "");
  const [blueTeamId, setBlueTeamId] = useState(room.settings.blueTeamID ?? "");
  const [mappoolId, setMappoolId] = useState(room.settings.mappoolID ?? "");
  const [mpLink, setMpLink] = useState(room.settings.mpLink ?? "");
  const [streamLink, setStreamLink] = useState(room.settings.streamLink ?? "");
  const { data: teams = [] } = useTeams(true, 1, 100);
  const { data: mappools = [] } = useMappools(true, 1, 100);
  const updateMeta = useUpdateRoomMetadata();
  const setTeams = useSetRoomTeams();
  const setPool = useSetRoomMappool();
  const setMp = useSetRoomMPLink();
  const setStream = useSetRoomStreamLink();

  const submit = async () => {
    try {
      const metadata: { name?: string; scheduledAt?: string } = {};
      if (name.trim() && name.trim() !== room.name) metadata.name = name.trim();
      if (scheduledAt) {
        const next = new Date(scheduledAt).toISOString();
        if (next !== room.scheduledAt) metadata.scheduledAt = next;
      }
      if (Object.keys(metadata).length) await updateMeta.mutateAsync({ id: room.id, ...metadata });
      if (redTeamId !== (room.settings.redTeamID ?? "") || blueTeamId !== (room.settings.blueTeamID ?? "")) {
        await setTeams.mutateAsync({ id: room.id, redTeamId: redTeamId || null, blueTeamId: blueTeamId || null });
      }
      if (mappoolId !== (room.settings.mappoolID ?? "")) await setPool.mutateAsync({ id: room.id, mappoolId: mappoolId || null });
      if (mpLink.trim() && mpLink.trim() !== (room.settings.mpLink ?? "")) await setMp.mutateAsync({ id: room.id, mpLink: mpLink.trim() });
      if (streamLink.trim() && streamLink.trim() !== (room.settings.streamLink ?? "")) await setStream.mutateAsync({ id: room.id, streamLink: streamLink.trim() });
      toast.success("房间已更新");
      onClose();
    } catch { /* mutation hook already reports the error */ }
  };

  const pending = [updateMeta, setTeams, setPool, setMp, setStream].some((mutation) => mutation.isPending);
  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop><Modal.Container><Modal.Dialog className="max-h-[85vh]">
        <Modal.Header><Modal.Heading>编辑房间 · {room.name}（{room.code}）</Modal.Heading></Modal.Header>
        <Modal.Body><div className="flex flex-col gap-5">
          <section className="flex flex-col gap-3"><h3 className="text-sm font-semibold">基本信息</h3>
            <TextField variant="secondary"><Label>房间名称</Label><Input value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} /></TextField>
            <TextField variant="secondary"><Label>比赛时间</Label><Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt((e.target as HTMLInputElement).value)} /></TextField>
          </section>
          <section className="flex flex-col gap-3"><h3 className="text-sm font-semibold">双方队伍</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {([['红方', redTeamId, setRedTeamId], ['蓝方', blueTeamId, setBlueTeamId]] as const).map(([label, value, setter]) => (
                <Select key={label} variant="secondary" value={value} onChange={(v) => setter(String(v ?? ""))}><Label>{label}队伍</Label><Select.Trigger><Select.Value /></Select.Trigger><Select.Popover><ListBox>{teams.filter((team) => team.isReady || team.id === value).map((team) => <ListBox.Item key={team.id} id={team.id} textValue={team.name}>{team.name} · {team.playerIDs.length}人</ListBox.Item>)}</ListBox></Select.Popover></Select>
              ))}
            </div>
            <Select variant="secondary" value={mappoolId} onChange={(v) => setMappoolId(String(v ?? ""))}><Label>图池</Label><Select.Trigger><Select.Value /></Select.Trigger><Select.Popover><ListBox>{mappools.map((pool) => <ListBox.Item key={pool.id} id={pool.id} textValue={pool.name}>{pool.name} · {pool.entries.length} 槽</ListBox.Item>)}</ListBox></Select.Popover></Select>
          </section>
          <section className="flex flex-col gap-3"><h3 className="text-sm font-semibold">链接</h3><TextField variant="secondary"><Label>MP 链接</Label><Input value={mpLink} onChange={(e) => setMpLink((e.target as HTMLInputElement).value)} /></TextField><TextField variant="secondary"><Label>直播链接</Label><Input value={streamLink} onChange={(e) => setStreamLink((e.target as HTMLInputElement).value)} /></TextField></section>
        </div></Modal.Body>
        <Modal.Footer><Button variant="ghost" onPress={onClose}>取消</Button><Button variant="primary" isDisabled={pending} onPress={() => void submit()}>{pending ? "保存中..." : "保存"}</Button></Modal.Footer>
      </Modal.Dialog></Modal.Container></Modal.Backdrop>
    </Modal>
  );
}
