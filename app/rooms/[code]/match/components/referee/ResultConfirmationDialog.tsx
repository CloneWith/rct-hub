"use client";

/**
 * ResultConfirmationDialog — referee result confirmation (M3).
 *
 * Two shapes (D9 — only the referee confirms results):
 * - WAITING_FOR_RESULT: choose the winning team AND the WAITING_RESULT piece
 *   on the board that won (`confirmBeatmapResult` needs boardPieceId).
 * - TB_PLAYING: only the winning team (`confirmTbResult`).
 */

import { useMemo, useState } from "react";
import { Button, Modal } from "@heroui/react";
import type { ActingTeam } from "../../lib/commands";
import type { PieceMod } from "../../lib/ws-protocol";

export interface WaitingResultPiece {
  id: string;
  mod: PieceMod;
  owner?: "RED" | "BLUE";
  cell: string;
}

export default function ResultConfirmationDialog({
                                                   phase,
                                                   waitingPieces,
                                                   isPending,
                                                   onConfirm,
                                                   onClose,
                                                 }: {
  phase: "WAITING_FOR_RESULT" | "TB_PLAYING";
  waitingPieces: WaitingResultPiece[];
  isPending: boolean;
  onConfirm: (payload: { winningTeam: ActingTeam; boardPieceId?: string }) => void;
  onClose: () => void;
}) {
  const [winningTeam, setWinningTeam] = useState<ActingTeam>("RED");
  const [pieceId, setPieceId] = useState<string | null>(null);

  const isBeatmap = phase === "WAITING_FOR_RESULT";
  const ready = isBeatmap ? pieceId !== null : true;

  const sorted = useMemo(
    () =>
      [...waitingPieces].sort((a, b) => {
        const zone = a.mod === b.mod ? 0 : a.mod === "SHIRO" ? -1 : 1;
        return zone || a.cell.localeCompare(b.cell);
      }),
    [waitingPieces],
  );

  return (
    <Modal isOpen onOpenChange={(o) => !o && !isPending && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>
                {isBeatmap ? "确认比赛结果" : "确认 TB 结果"}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted-foreground">
                {isBeatmap
                  ? "选择获胜方与获胜棋子。该操作将结算本回合并推进棋盘。"
                  : "选择 TB 获胜方。该操作将结束本场比赛。"}
              </p>

              <div className="mt-3 flex gap-2">
                {(["RED", "BLUE"] as ActingTeam[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setWinningTeam(t)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      winningTeam === t
                        ? t === "RED"
                          ? "border-danger/70 bg-danger/10 text-danger"
                          : "border-primary/70 bg-primary/10 text-primary"
                        : "border-border bg-background/40 text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    {t === "RED" ? "红方胜" : "蓝方胜"}
                  </button>
                ))}
              </div>

              {isBeatmap && (
                <div className="mt-3 flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">
                    获胜棋子（等待结算中）
                  </span>
                  {sorted.length === 0 ? (
                    <p className="text-xs text-warning">
                      棋盘上暂无 WAITING_RESULT 棋子，无法确认。
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {sorted.map((p) => {
                        const active = pieceId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPieceId(p.id)}
                            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                              active
                                ? "border-success/70 bg-success/15 text-success"
                                : "border-border bg-background/40 text-muted-foreground hover:border-foreground/30"
                            }`}
                          >
                            <span className="font-mono font-bold">{p.mod}</span>
                            <span className="ml-1 opacity-70">
                              {p.cell}
                              {p.owner ? (p.owner === "RED" ? " 红" : " 蓝") : ""}
                            </span>
                          </button>
                        );
                      })}
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
                isDisabled={!ready || isPending || (isBeatmap && sorted.length === 0)}
                onPress={() =>
                  onConfirm(
                    isBeatmap && pieceId
                      ? {winningTeam, boardPieceId: pieceId}
                      : {winningTeam},
                  )
                }
              >
                {isPending ? "提交中…" : "确认"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
