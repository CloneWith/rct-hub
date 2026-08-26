"use client";

/**
 * CalibrateTimerDialog — referee timer calibration.
 *
 * The backend takes `remainingMilliseconds` (the authoritative remaining
 * time) plus a mandatory reason. Input is seconds; converted on submit.
 */

import { useMemo, useState } from "react";
import { Button, Input, Modal } from "@heroui/react";

export default function CalibrateTimerDialog({
  isPending,
  onConfirm,
  onClose,
}: {
  isPending: boolean;
  onConfirm: (remainingMilliseconds: number, reason: string) => void;
  onClose: () => void;
}) {
  const [seconds, setSeconds] = useState("60");
  const [reason, setReason] = useState("");

  const secondsNum = useMemo(() => {
    const n = Number(seconds);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  }, [seconds]);

  const ready = secondsNum !== null && reason.trim().length > 0;

  return (
    <Modal isOpen onOpenChange={(o) => !o && !isPending && onClose()}>
      <Modal.Backdrop />
      <Modal.Container>
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>校准计时器</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm text-muted-foreground">
              设置本轮剩余时间（秒）。校准将覆盖当前计时，请谨慎操作。
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  剩余时间（秒）
                </span>
                <Input
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  inputMode="numeric"
                  disabled={isPending}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  原因（必填）
                </span>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="例如：计时不同步，手动校准"
                  disabled={isPending}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" isDisabled={isPending} onPress={onClose}>
              取消
            </Button>
            <Button
              variant="primary"
              isDisabled={!ready || isPending}
              onPress={() => secondsNum !== null && onConfirm(secondsNum * 1000, reason.trim())}
            >
              {isPending ? "提交中…" : "确认校准"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal>
  );
}
