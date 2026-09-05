"use client";

/**
 * TBRequestDialog — captain's tiebreaker request confirmation.
 *
 * The request id is generated client-side (UUID); the backend echoes it in the
 * command and the opposing captain responds with the same id.
 */

import { Button, Modal } from "@heroui/react";

export default function TBRequestDialog({
                                          onClose,
                                          onConfirm,
                                          isPending,
                                        }: {
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <Modal isOpen onOpenChange={(o) => !o && !isPending && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>请求进入 TB（决胜局）</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted-foreground">
                向对方队长发起 TB 提议。请求发出后需要对方队长接受才能进入 TB；
                若对方拒绝，比赛按正常流程继续。
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" isDisabled={isPending} onPress={onClose}>
                取消
              </Button>
              <Button
                variant="primary"
                isDisabled={isPending}
                onPress={onConfirm}
              >
                {isPending ? "发送中…" : "发送请求"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
