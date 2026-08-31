"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, toast } from "@heroui/react";
import { AlertTriangle, CheckCircle2, Wrench, XCircle } from "lucide-react";
import { useStartRoomMatch } from "@/app/lib/hooks";
import { buildStartChecklist, type StartChecklistItem, type RoomItem } from "@/app/lib/rooms";

const STATUS_ICON = {
  ok: <CheckCircle2 className="size-4 shrink-0 text-success" />,
  error: <XCircle className="size-4 shrink-0 text-danger" />,
  warn: <AlertTriangle className="size-4 shrink-0 text-warning" />,
} as const;

const STATUS_TONE = {
  ok: "text-muted-foreground",
  error: "text-danger",
  warn: "text-warning",
} as const;

function ChecklistRow({ item }: { item: StartChecklistItem }) {
  return (
    <li className="flex items-start gap-2 py-1.5">
      {STATUS_ICON[item.status]}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm">
          <span className={`font-medium ${STATUS_TONE[item.status]}`}>{item.label}</span>
          <span className="ml-2 text-muted-foreground">{item.detail}</span>
        </span>
        {item.status !== "ok" && item.hint && (
          <span className="text-xs text-muted-foreground">
            {item.hint}
            <span className="ml-1 font-mono opacity-50">{item.field}</span>
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * 开赛前检查单对话框（P3）。替换房间卡片上原来的简单确认弹窗：
 * 打开即按当前房间数据渲染分组检查项，全部硬性项通过时才允许开赛。
 */
export default function StartChecklistDialog({
  room,
  isOpen,
  onOpenChange,
  onStarted,
}: {
  room: RoomItem;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful start (e.g. list refresh). */
  onStarted?: () => void;
}) {
  const router = useRouter();
  const startMatch = useStartRoomMatch();
  const checklist = useMemo(() => buildStartChecklist(room), [room]);

  const confirmStart = () => {
    startMatch.mutate(room.id, {
      onSuccess: () => {
        toast.success("比赛已开始");
        onOpenChange(false);
        onStarted?.();
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="max-w-lg">
            <Modal.Header>
              <Modal.Heading>开赛前检查单 · {room.name}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-4">
                {checklist.groups.map((group) => (
                  <section key={group.key}>
                    <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {group.title}
                    </h3>
                    <ul className="divide-y divide-border">
                      {group.items.map((item) => (
                        <ChecklistRow key={`${item.field}:${item.label}`} item={item} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <div className="flex w-full items-center justify-between gap-2">
                <span className="min-w-0 text-xs text-muted-foreground">
                  {checklist.ok
                    ? checklist.warnings.length > 0
                      ? `配置完备（${checklist.warnings.length} 项软提示）`
                      : "配置完备，可以开赛"
                    : `${checklist.errors.length} 项待处理`}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  {!checklist.ok && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => {
                        onOpenChange(false);
                        router.push(`/rooms/${room.code}`);
                      }}
                    >
                      <Wrench className="size-3.5" />
                      去修复
                    </Button>
                  )}
                  <Button variant="ghost" onPress={() => onOpenChange(false)}>
                    取消
                  </Button>
                  <Button
                    variant="primary"
                    isDisabled={!checklist.ok || startMatch.isPending}
                    onPress={confirmStart}
                  >
                    {startMatch.isPending ? "开赛中..." : "确认开赛"}
                  </Button>
                </div>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
