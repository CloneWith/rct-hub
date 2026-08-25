"use client";

import { useState } from "react";
import {
  Button,
  Input,
  Label,
  Modal,
  TextField,
  toast,
} from "@heroui/react";
import { useSetRoomReferee, useUpdateRoomMetadata } from "@/app/lib/hooks";
import type { RoomMetadataInput } from "@/app/lib/api";
import type { RoomItem } from "@/app/lib/rooms";

/** ISO string → `datetime-local` input value (local time, no timezone). */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "111, 222" → [111, 222]；解析失败的片段忽略。 */
function parseIdList(raw: string): number[] {
  return raw
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0);
}

function idListToInput(ids: string[]): string {
  return ids.join(", ");
}

/**
 * 房间编辑弹窗（admin）。基于 PUT /rooms/:id/metadata 的部分更新语义：
 * 只提交有改动的字段；裁判指派单独走 PATCH /rooms/:id/referee（带角色校验）。
 *
 * 注意：metadata 接口不支持 null 清空——轮次/时间/队长/玩家/直播员留空表示"不修改"，
 * 只有裁判支持清空（传 null）。
 */
export default function RoomEditDialog({
  room,
  onClose,
}: {
  room: RoomItem;
  onClose: () => void;
}) {
  const [name, setName] = useState(room.name);
  const [scheduledAt, setScheduledAt] = useState(isoToLocalInput(room.scheduledAt));
  const [redLeader, setRedLeader] = useState(room.settings.redLeader ?? "");
  const [blueLeader, setBlueLeader] = useState(room.settings.blueLeader ?? "");
  const [redPlayers, setRedPlayers] = useState(idListToInput(room.settings.redPlayers));
  const [bluePlayers, setBluePlayers] = useState(idListToInput(room.settings.bluePlayers));
  const [refereeId, setRefereeId] = useState(room.refereeUserID ?? "");
  const [streamerId, setStreamerId] = useState(room.settings.streamerUserID ?? "");

  const updateMeta = useUpdateRoomMetadata();
  const setReferee = useSetRoomReferee();

  const submit = async () => {
    const meta: RoomMetadataInput = {};

    if (name.trim() && name.trim() !== room.name) meta.name = name.trim();
    if (scheduledAt && new Date(scheduledAt).toISOString() !== room.scheduledAt) {
      meta.scheduledAt = new Date(scheduledAt).toISOString();
    }
    const redLeaderNum = redLeader.trim() ? Number(redLeader.trim()) : null;
    if (redLeaderNum !== null && String(redLeaderNum) !== room.settings.redLeader) {
      meta.redLeader = redLeaderNum;
    }
    const blueLeaderNum = blueLeader.trim() ? Number(blueLeader.trim()) : null;
    if (blueLeaderNum !== null && String(blueLeaderNum) !== room.settings.blueLeader) {
      meta.blueLeader = blueLeaderNum;
    }
    const redList = parseIdList(redPlayers);
    if (idListToInput(redList.map(String)) !== idListToInput(room.settings.redPlayers)) {
      meta.redPlayers = redList;
    }
    const blueList = parseIdList(bluePlayers);
    if (idListToInput(blueList.map(String)) !== idListToInput(room.settings.bluePlayers)) {
      meta.bluePlayers = blueList;
    }
    const streamerNum = streamerId.trim() ? Number(streamerId.trim()) : null;
    if (streamerNum !== null && String(streamerNum) !== room.settings.streamerUserID) {
      meta.streamerUserId = streamerNum;
    }

    const refereeNum = refereeId.trim() ? Number(refereeId.trim()) : null;
    const refereeChanged =
      (refereeNum === null ? null : String(refereeNum)) !== room.refereeUserID;

    try {
      if (Object.keys(meta).length > 0) {
        await updateMeta.mutateAsync({ id: room.id, ...meta });
      }
      if (refereeChanged) {
        await setReferee.mutateAsync({ id: room.id, refereeUserId: refereeNum });
      }
      if (Object.keys(meta).length === 0 && !refereeChanged) {
        toast.info("没有需要保存的改动");
        onClose();
        return;
      }
      toast.success("房间已更新");
      onClose();
    } catch {
      // 错误 toast 已由 useToastedMutation 统一处理
    }
  };

  const pending = updateMeta.isPending || setReferee.isPending;

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="max-h-[85vh]">
            <Modal.Header>
              <Modal.Heading>
                编辑房间 · {room.name}（{room.code}）
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-5">
                {/* ---- 基本信息 ---- */}
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">基本信息</h3>
                  <TextField variant="secondary">
                    <Label>房间名称</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName((e.target as HTMLInputElement).value)}
                    />
                  </TextField>
                  <TextField variant="secondary">
                    <Label>比赛时间（当前轮次：{room.round || "未设置"}）</Label>
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt((e.target as HTMLInputElement).value)}
                    />
                  </TextField>
                </section>

                {/* ---- 队伍 ---- */}
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">双方队伍（osu! ID）</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <TextField variant="secondary">
                      <Label>红方队长</Label>
                      <Input
                        type="number"
                        value={redLeader}
                        onChange={(e) => setRedLeader((e.target as HTMLInputElement).value)}
                      />
                    </TextField>
                    <TextField variant="secondary">
                      <Label>蓝方队长</Label>
                      <Input
                        type="number"
                        value={blueLeader}
                        onChange={(e) => setBlueLeader((e.target as HTMLInputElement).value)}
                      />
                    </TextField>
                    <TextField variant="secondary">
                      <Label>红方玩家（逗号分隔）</Label>
                      <Input
                        value={redPlayers}
                        placeholder="111, 112"
                        onChange={(e) => setRedPlayers((e.target as HTMLInputElement).value)}
                      />
                    </TextField>
                    <TextField variant="secondary">
                      <Label>蓝方玩家（逗号分隔）</Label>
                      <Input
                        value={bluePlayers}
                        placeholder="222, 223"
                        onChange={(e) => setBluePlayers((e.target as HTMLInputElement).value)}
                      />
                    </TextField>
                  </div>
                </section>

                {/* ---- 指派 ---- */}
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">指派（osu! ID）</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <TextField variant="secondary">
                      <Label>裁判（清空则移除）</Label>
                      <Input
                        type="number"
                        value={refereeId}
                        onChange={(e) => setRefereeId((e.target as HTMLInputElement).value)}
                      />
                    </TextField>
                    <TextField variant="secondary">
                      <Label>直播员</Label>
                      <Input
                        type="number"
                        value={streamerId}
                        onChange={(e) => setStreamerId((e.target as HTMLInputElement).value)}
                      />
                    </TextField>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    轮次、直播员等字段不支持清空，留空表示不修改；裁判留空保存即移除指派。
                  </p>
                </section>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={onClose}>
                取消
              </Button>
              <Button variant="primary" isDisabled={pending} onPress={() => void submit()}>
                {pending ? "保存中..." : "保存"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
