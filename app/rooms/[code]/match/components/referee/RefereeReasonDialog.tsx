"use client";

/**
 * RefereeReasonDialog — generic reason-required confirmation for referee
 * actions (suspend/abort/skip/pause/resume/grant-time/start-TB…).
 *
 * The backend mandates `reason` for every referee command (audit trail); the
 * dialog always requires a non-empty reason. Dangerous actions (abort) can
 * pass `danger` for a red confirm button.
 */

import { useState, type ReactNode } from "react";
import { Button, Input, Modal } from "@heroui/react";

export interface ReasonIntent {
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: (reason: string) => void;
}

export default function RefereeReasonDialog({
  intent,
  isPending,
  onClose,
}: {
  intent: ReasonIntent | null;
  isPending: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const ready = reason.trim().length > 0;

  return (
    <Modal isOpen onOpenChange={(o) => !o && !isPending && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{intent?.title ?? "裁判操作"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {intent?.description && (
                <p className="text-sm text-muted-foreground">{intent.description}</p>
              )}
              <div className="mt-3 flex flex-col gap-1">
                <Label>原因（必填，写入审计日志）</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="例如：选手要求暂停 / 超时未操作 / 选手弃权"
                  disabled={isPending}
                  autoFocus
                />
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" isDisabled={isPending} onPress={onClose}>
                取消
              </Button>
              <Button
                variant="primary"
                isDisabled={!ready || isPending}
                onPress={() => intent?.onConfirm(reason.trim())}
                className={intent?.danger ? "bg-danger text-white" : undefined}
              >
                {isPending ? "提交中…" : intent?.confirmLabel ?? "确认"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-semibold text-muted-foreground">{children}</span>
  );
}
