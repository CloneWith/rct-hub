"use client";

/**
 * StrategistActionBar — the strategist's action strip.
 *
 * Shows identity, whose turn it is, a plain-language guide for the current
 * phase, and command feedback. Legality is NOT judged here — the backend
 * `analysis` decides what the strategist may do; this component only renders
 * the resulting guidance (D5).
 *
 * D9: during WAITING_FOR_RESULT the strategist sees a read-only waiting note,
 * never a confirm button.
 */

import type { MatchActorAnalysis } from "@/app/lib/hooks";
import type { WSSnapshot } from "../../lib/ws-protocol";
import { LIFECYCLE_LABELS, TEAM_LABELS } from "../../lib/visuals";
import type { CommandFeedback } from "../../lib/useMatchCommands";

function teamDot(team: "RED" | "BLUE"): string {
  return team === "RED" ? "bg-[#FF5733]" : "bg-[#57C1FF]";
}

export default function StrategistActionBar({
  myTeam,
  isMyTurn,
  snapshot,
  analysis,
  selectedSlotID,
  feedback,
  clearFeedback,
}: {
  myTeam: "RED" | "BLUE";
  isMyTurn: boolean;
  snapshot: WSSnapshot | null;
  analysis: MatchActorAnalysis;
  selectedSlotID: string | null;
  feedback: CommandFeedback | null;
  clearFeedback: () => void;
}) {
  const phase = snapshot?.phase ?? "NONE";
  const lifecycle = snapshot?.lifecycle ?? "READY";

  let guide: string;
  let guideTone: "default" | "action" | "wait" = "default";

  if (lifecycle === "SUSPENDED") {
    guide = "比赛已暂停";
    guideTone = "wait";
  } else if (lifecycle === "FINISHED" || lifecycle === "ABORTED") {
    guide = LIFECYCLE_LABELS[lifecycle];
  } else if (lifecycle === "ADJUDICATION_REQUIRED") {
    guide = "流局待裁决，请等待裁判处理";
    guideTone = "wait";
  } else if (lifecycle !== "RUNNING") {
    guide = "比赛尚未开始";
  } else if (phase === "BAN") {
    guide = isMyTurn
      ? "轮到你了：点击图池中的可 Ban 槽位"
      : "等待对方进行 Ban…";
    guideTone = isMyTurn ? "action" : "wait";
  } else if (phase === "PICK") {
    if (!isMyTurn) {
      guide = "等待对方行动…";
      guideTone = "wait";
    } else if (selectedSlotID) {
      guide = `已选 ${selectedSlotID}，点击棋盘上的绿色高亮格落子`;
      guideTone = "action";
    } else if (analysis.allowedActions.includes("PLACE_SHIRO")) {
      guide = "轮到你了：点击棋盘上的高亮格放置 Shiro";
      guideTone = "action";
    } else if (analysis.allowedActions.includes("ROB_PIECE")) {
      guide = "轮到你了：可点击己方棋子发起夺棋，或从图池选谱落子";
      guideTone = "action";
    } else {
      guide = "轮到你了：点击图池槽位选择谱面";
      guideTone = "action";
    }
  } else if (phase === "WAITING_FOR_RESULT") {
    guide = "等待裁判确认本局结果…";
    guideTone = "wait";
  } else if (phase === "TB_PREPARATION") {
    guide = "本场进入 TB（决胜局）阶段";
    guideTone = "wait";
  } else if (phase === "TB_PLAYING") {
    guide = "TB 对局进行中";
    guideTone = "wait";
  } else {
    guide = "—";
  }

  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${teamDot(myTeam)}`} />
        <span className="text-sm font-semibold">
          {TEAM_LABELS[myTeam]}策略师
        </span>
        {isMyTurn && lifecycle === "RUNNING" && (
          <span className="ml-auto rounded bg-success/15 px-1.5 py-0.5 text-[0.65rem] font-bold text-success">
            你的回合
          </span>
        )}
      </div>

      <p
        className={`mt-2 text-xs leading-relaxed ${
          guideTone === "action"
            ? "text-success"
            : guideTone === "wait"
              ? "text-muted-foreground"
              : "text-muted-foreground"
        }`}
      >
        {guide}
      </p>

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
