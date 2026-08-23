"use client";

import { useState } from "react";
import {
  Button,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextField,
  toast,
} from "@heroui/react";
import type { RoomType } from "@/app/graphql/graphql";
import { useCreateRoom, useUpdateRoomMetadata } from "@/app/lib/hooks";
import type { RoomMetadataInput } from "@/app/lib/api";
import { ROOM_ROUNDS } from "@/app/lib/rooms";

const TYPE_OPTIONS: Array<{ value: RoomType; label: string }> = [
  { value: "PRIVATE", label: "私密" },
  { value: "CASUAL", label: "休闲" },
  { value: "MATCH", label: "正式赛" },
];

/**
 * 新建房间弹窗（仅 admin）。创建接口只接受 {name, type}，
 * 轮次与比赛时间在创建成功后通过 metadata 接口补填。
 *
 * 以条件挂载方式使用（父级 `{open && <Dialog/>}`），表单初始值在挂载时确定。
 */
export default function RoomCreateDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<RoomType>("CASUAL");
  const [round, setRound] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");

  const create = useCreateRoom();
  const updateMeta = useUpdateRoomMetadata();

  const pending = create.isPending || updateMeta.isPending;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate(
      { name: trimmed, type },
      {
        onSuccess: (room) => {
          const extras: RoomMetadataInput = {};
          if (round) extras.round = round;
          if (scheduledAt) extras.scheduledAt = new Date(scheduledAt).toISOString();
          if (Object.keys(extras).length === 0) {
            toast.success("房间已创建");
            onClose();
            return;
          }
          updateMeta.mutate(
            { id: room.id, ...extras },
            {
              onSuccess: () => {
                toast.success("房间已创建");
                onClose();
              },
              onError: () => {
                toast.warning("房间已创建，但轮次/时间保存失败，请在列表中编辑补填");
              },
            },
          );
        },
      },
    );
  };

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>新建房间</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-4">
                <TextField variant="secondary">
                  <Label>房间名称</Label>
                  <Input
                    value={name}
                    placeholder="如：RCT 半决赛 A 场"
                    onChange={(e) => setName((e.target as HTMLInputElement).value)}
                  />
                </TextField>

                <Select
                  variant="secondary"
                  selectedKey={type}
                  onSelectionChange={(v) => setType(v as RoomType)}
                >
                  <Label>房间类型</Label>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {TYPE_OPTIONS.map((t) => (
                        <ListBox.Item key={t.value} id={t.value}>
                          {t.label}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <Select
                  variant="secondary"
                  selectedKey={round ?? "none"}
                  onSelectionChange={(v) => setRound(v === "none" ? null : (v as string))}
                >
                  <Label>比赛轮次（可选）</Label>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item key="none" id="none">
                        不设置
                      </ListBox.Item>
                      {ROOM_ROUNDS.map((r) => (
                        <ListBox.Item key={r} id={r}>
                          {r}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <TextField variant="secondary">
                  <Label>比赛时间（可选）</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt((e.target as HTMLInputElement).value)}
                  />
                </TextField>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={onClose}>
                取消
              </Button>
              <Button variant="primary" isDisabled={!name.trim() || pending} onPress={submit}>
                {pending ? "创建中..." : "创建"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
