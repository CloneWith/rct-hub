"use client";

/**
 * RobberyFlowDialog — guided robbery (夺棋) flow.
 *
 * The backend `analysis.robberyPlans` lists every legal target with its
 * complete sacrifice-set options. This dialog walks the strategist through:
 * target → pick a sacrifice set → preview → confirm. All of that selection is
 * local; only the confirm submits `robPiece` (transactional, §14.7).
 */

import { useMemo, useState } from "react";
import { Button, Modal } from "@heroui/react";
import type { MatchRobberyPlan } from "@/app/lib/hooks";

export default function RobberyFlowDialog({
                                            targetPieceId,
                                            plans,
                                            onClose,
                                            onSubmit,
                                            isPending,
                                          }: {
  targetPieceId: string;
  /** All sacrifice-set options for `targetPieceId`. */
  plans: MatchRobberyPlan[];
  onClose: () => void;
  onSubmit: (sacrificeSets: string[][]) => void;
  isPending: boolean;
}) {
  const [setIndex, setSetIndex] = useState(0);

  // Mount-on-open: fresh selection every time the dialog opens.
  const choices = useMemo(() => plans.map((p) => p.sacrificeSets), [plans]);
  const current = choices[setIndex] ?? [];

  return (
    <Modal isOpen onOpenChange={(o) => !o && !isPending && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="max-h-[85vh]">
            <Modal.Header>
              <Modal.Heading>夺棋</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted-foreground">
                目标棋子 <span className="font-mono font-semibold text-foreground">{targetPieceId}</span>
                已参与获胜连线，可牺牲己方连线棋子将其夺回。
              </p>

              {plans.length === 0 ? (
                <p className="text-sm text-danger">该目标当前没有可用的夺棋方案</p>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">选择牺牲方案：</p>
                  {choices.map((sets, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSetIndex(idx)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        idx === setIndex
                          ? "border-success/70 bg-success/10"
                          : "border-border bg-background/40 hover:border-foreground/30"
                      }`}
                    >
                      <span className="w-5 text-center font-bold text-muted-foreground">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1">
                        {sets.length} 组牺牲 · 共{" "}
                        {sets.reduce((n, s) => n + s.length, 0)} 枚棋子
                      </span>
                    </button>
                  ))}

                  {current.length > 0 && (
                    <div className="mt-1 rounded-lg bg-black/20 p-3">
                      <p className="mb-1.5 text-xs font-semibold text-muted-foreground">预览（牺牲 → 夺回）：</p>
                      <div className="flex flex-col gap-1">
                        {current.map((set, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">第 {i + 1} 组：</span>
                            <span className="font-mono">{set.join(" + ")}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-mono font-semibold text-success">{targetPieceId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" isDisabled={isPending} onPress={onClose}>
                取消
              </Button>
              <Button
                variant="primary"
                isDisabled={isPending || plans.length === 0}
                onPress={() => onSubmit(current)}
              >
                {isPending ? "提交中…" : "确认夺棋"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
