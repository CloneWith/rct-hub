"use client";

/**
 * RefereeProxyDialog — referee proxy-action confirmation (M3).
 *
 * Every proxy command needs `actingTeam` + a mandatory `reason` (audit
 * trail). For ROB the referee also picks a sacrifice set, mirroring the
 * strategist's RobberyFlowDialog but adding the reason field.
 */

import { useMemo, useState } from "react";
import { Button, Input, Modal } from "@heroui/react";
import type { MatchRobberyPlan } from "@/app/lib/hooks";
import type { ActingTeam } from "../../lib/commands";

export type ProxyKind = "BAN" | "PLACE" | "SHIRO" | "ROB";

export interface ProxyIntent {
  kind: ProxyKind;
  poolSlotId?: string;
  position?: { row: number; col: number };
  targetPieceId?: string;
  plans?: MatchRobberyPlan[];
}

const KIND_LABEL: Record<ProxyKind, string> = {
  BAN: "代行 Ban",
  PLACE: "代行落子",
  SHIRO: "代行放置 Shiro",
  ROB: "代行夺棋",
};

export default function RefereeProxyDialog({
                                             intent,
                                             actingTeam,
                                             isPending,
                                             onConfirm,
                                             onClose,
                                           }: {
  intent: ProxyIntent | null;
  actingTeam: ActingTeam;
  isPending: boolean;
  onConfirm: (reason: string, sacrificeSets?: string[][]) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [setIndex, setSetIndex] = useState(0);

  const choices = useMemo(
    () => (intent?.plans ?? []).map((p) => p.sacrificeSets),
    [intent],
  );
  const current = choices[setIndex] ?? [];
  const needsSacrifice = intent?.kind === "ROB" && choices.length > 0;
  const ready = reason.trim().length > 0 && (!needsSacrifice || choices.length > 0);

  return (
    <Modal isOpen onOpenChange={(o) => !o && !isPending && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>
                {intent ? KIND_LABEL[intent.kind] : "裁判代理操作"}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">代理方：</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    actingTeam === "RED"
                      ? "bg-danger/15 text-danger"
                      : "bg-primary/15 text-primary"
                  }`}
                >
                  {actingTeam === "RED" ? "红方" : "蓝方"}
                </span>
              </div>

              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {intent?.kind === "BAN" && `图池槽位 ${intent.poolSlotId}`}
                {intent?.kind === "PLACE" &&
                  `槽位 ${intent.poolSlotId} → ${intent.position ? `(${intent.position.col + 1}, ${intent.position.row + 1})` : ""}`}
                {intent?.kind === "SHIRO" &&
                  `目标格 ${intent.position ? `(${intent.position.col + 1}, ${intent.position.row + 1})` : ""}`}
                {intent?.kind === "ROB" && `目标棋子 ${intent.targetPieceId}`}
              </p>

              {needsSacrifice && (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    选择牺牲方案：
                  </p>
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
                    <div className="rounded-lg bg-black/20 p-3 text-xs">
                      {current.map((set, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">第 {i + 1} 组：</span>
                          <span className="font-mono">{set.join(" + ")}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-mono font-semibold text-success">
                            {intent?.targetPieceId}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  原因（必填，写入审计日志）
                </span>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="例如：选手操作失误，裁判代行"
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
                onPress={() =>
                  onConfirm(reason.trim(), needsSacrifice ? current : undefined)
                }
              >
                {isPending ? "提交中…" : "确认执行"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
