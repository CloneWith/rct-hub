"use client";

/**
 * CaptainActionBar — team leader's TB (tiebreaker) controls.
 *
 * Only renders meaningful content when a TB-related action is available:
 * - request TB (REQUEST_TB in allowedActions, e.g. turn 11–14)
 * - respond to the opponent captain's pending request
 * - otherwise a minimal identity line (captains have no other in-match
 *   commands in M2).
 */

import type { MatchActorAnalysis } from "@/app/lib/hooks";
import { Button } from "@heroui/react";
import { TEAM_LABELS } from "../../lib/visuals";
import type { CommandFeedback } from "../../lib/useMatchCommands";

function teamDot(team: "RED" | "BLUE"): string {
  return team === "RED" ? "bg-[#FF5733]" : "bg-[#57C1FF]";
}

export default function CaptainActionBar({
  myTeam,
  analysis,
  onRequestTb,
  onRespondTb,
  isPending,
  feedback,
  clearFeedback,
}: {
  myTeam: "RED" | "BLUE";
  analysis: MatchActorAnalysis;
  onRequestTb: () => void;
  onRespondTb: (accept: boolean) => void;
  isPending: boolean;
  feedback: CommandFeedback | null;
  clearFeedback: () => void;
}) {
  const canRequestTb = analysis.allowedActions.includes("REQUEST_TB");
  const hasPendingRequest =
    Boolean(analysis.pendingTBRequestID) &&
    (analysis.canAcceptTBRequest || analysis.canRejectTBRequest);

  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${teamDot(myTeam)}`} />
        <span className="text-sm font-semibold">{TEAM_LABELS[myTeam]}队长</span>
        {hasPendingRequest && (
          <span className="ml-auto rounded bg-warning/15 px-1.5 py-0.5 text-[0.65rem] font-bold text-warning">
            TB 请求
          </span>
        )}
      </div>

      {canRequestTb && !hasPendingRequest && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            可以提议进入 TB（需双方队长同意）
          </p>
          <Button
            size="sm"
            variant="primary"
            isDisabled={isPending}
            onPress={onRequestTb}
          >
            请求 TB
          </Button>
        </div>
      )}

      {hasPendingRequest && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">对方队长请求进入 TB</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              isDisabled={isPending}
              onPress={() => onRespondTb(false)}
            >
              拒绝
            </Button>
            <Button
              size="sm"
              variant="primary"
              isDisabled={isPending}
              onPress={() => onRespondTb(true)}
            >
              接受
            </Button>
          </div>
        </div>
      )}

      {feedback && (
        <button
          type="button"
          onClick={clearFeedback}
          className={`mt-2 block w-full rounded border px-2 py-1.5 text-left text-xs ${
            feedback.kind === "ok"
              ? "border-success/40 bg-success/10 text-success"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
          title="点击关闭"
        >
          {feedback.message}
        </button>
      )}
    </div>
  );
}
