"use client";

/**
 * SurrenderDialog — record a team surrender (M3).
 *
 * Evidence rules (backend `SURRENDER_EVIDENCE_INVALID`): at least 4
 * confirming players including the team leader. The leader is always
 * selected; the referee toggles the other confirming players.
 */

import { useMemo, useState } from "react";
import { Button, Input, Modal } from "@heroui/react";
import type { ActingTeam } from "../../lib/commands";
import type { WSRosters } from "../../lib/ws-protocol";

const MIN_CONFIRMING = 4;

export default function SurrenderDialog({
  rosters,
  isPending,
  onConfirm,
  onClose,
}: {
  rosters: WSRosters | null;
  isPending: boolean;
  onConfirm: (surrenderingTeam: ActingTeam, confirmingPlayerIds: string[], reason: string) => void;
  onClose: () => void;
}) {
  const [team, setTeam] = useState<ActingTeam>("RED");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");

  const roster = rosters?.[team.toLowerCase() as "red" | "blue"];
  const leaderId = roster?.leaderId ?? "";
  const playerIds = roster?.playerIds ?? [];

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Leader is always part of the evidence; toggling switches team.
  const switchTeam = (t: ActingTeam) => {
    setTeam(t);
    setSelected(new Set());
  };

  const confirmingIds = useMemo(() => {
    const ids = new Set(selected);
    if (leaderId) ids.add(leaderId);
    return [...ids];
  }, [selected, leaderId]);

  const ready =
    confirmingIds.length >= MIN_CONFIRMING && reason.trim().length > 0;

  return (
    <Modal isOpen onOpenChange={(o) => !o && !isPending && onClose()}>
      <Modal.Backdrop />
      <Modal.Container>
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>录入认输</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm text-muted-foreground">
              选择认输方，并勾选确认认输的选手（含队长至少 {MIN_CONFIRMING} 人）。
            </p>

            <div className="mt-3 flex gap-2">
              {(["RED", "BLUE"] as ActingTeam[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTeam(t)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    team === t
                      ? t === "RED"
                        ? "border-danger/70 bg-danger/10 text-danger"
                        : "border-primary/70 bg-primary/10 text-primary"
                      : "border-border bg-background/40 text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  {t === "RED" ? "红方认输" : "蓝方认输"}
                </button>
              ))}
            </div>

            {playerIds.length === 0 ? (
              <p className="mt-3 text-sm text-warning">该队暂无可确认的选手名单</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {playerIds.map((id) => {
                  const isLeader = id === leaderId;
                  const active = confirmingIds.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => !isLeader && toggle(id)}
                      disabled={isLeader}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        active
                          ? "border-success/70 bg-success/15 text-success"
                          : "border-border bg-background/40 text-muted-foreground hover:border-foreground/30"
                      } ${isLeader ? "cursor-default" : "cursor-pointer"}`}
                    >
                      #{id}
                      {isLeader ? " · 队长" : ""}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-2 text-xs text-muted-foreground">
              已确认：{confirmingIds.length} 人
              {confirmingIds.length > 0 && confirmingIds.length < MIN_CONFIRMING
                ? `（至少 ${MIN_CONFIRMING} 人）`
                : ""}
            </div>

            <div className="mt-3 flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground">
                原因（必填）
              </span>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例如：选手网络故障，全队协商认输"
                disabled={isPending}
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
              onPress={() => onConfirm(team, confirmingIds, reason.trim())}
            >
              {isPending ? "提交中…" : "确认认输"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal>
  );
}
