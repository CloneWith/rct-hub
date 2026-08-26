"use client";

/**
 * RefereeConsole — the M3 referee control panel.
 *
 * Pure presentation: every button set is derived from `referee.analysis.
 * allowedActions` (D5 — the backend decides what is legal; the UI never
 * re-implements the rule engine). The console deliberately shows a quiet
 * "passive waiting" state when there is nothing to do.
 *
 * The wiring (command submission, dialogs, IRC queries) lives in
 * `useRefereeInteractions`; this component only renders.
 */

import type { ReactNode } from "react";
import type {
  MatchAutomationIssue,
  MatchAuditEntry,
  MatchIrcConnectionStatus,
  MatchIrcJob,
  MatchIrcObservation,
  MatchRefereeView,
} from "@/app/lib/hooks";
import type { CommandFeedback } from "../../lib/useMatchCommands";
import type { ActingTeam } from "../../lib/commands";
import { cellToPosition } from "../../lib/board";
import type { MatchLifecycle, MatchPhase } from "../../lib/ws-protocol";
import { LIFECYCLE_LABELS, PHASE_LABELS } from "../../lib/visuals";
import IrcPanel from "./IrcPanel";

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-background/40 p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-xs font-bold text-foreground">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function ActionButton({
  label,
  danger,
  disabled,
  onClick,
  pending,
}: {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  pending?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
        danger
          ? "border-danger/60 bg-danger/10 text-danger enabled:hover:bg-danger/20"
          : "border-border bg-background/40 text-foreground enabled:hover:border-foreground/40"
      }`}
    >
      {pending ? "提交中…" : label}
    </button>
  );
}

function TeamToggle({
  team,
  onChange,
  disabled,
}: {
  team: ActingTeam;
  onChange: (t: ActingTeam) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {(["RED", "BLUE"] as ActingTeam[]).map((t) => (
        <button
          key={t}
          type="button"
          disabled={disabled}
          onClick={() => onChange(t)}
          className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-bold transition-colors disabled:opacity-40 ${
            team === t
              ? t === "RED"
                ? "border-danger/70 bg-danger/15 text-danger"
                : "border-primary/70 bg-primary/15 text-primary"
              : "border-border bg-background/40 text-muted-foreground enabled:hover:border-foreground/30"
          }`}
        >
          {t === "RED" ? "红" : "蓝"}
        </button>
      ))}
    </div>
  );
}

const CAPABILITY_LABEL: Record<MatchAuditEntry["actor"]["capability"], string> = {
  STRATEGIST: "策略师",
  CAPTAIN: "队长",
  REFEREE: "裁判",
};

function AuditLog({ entries }: { entries: MatchAuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-[0.65rem] text-muted-foreground">
        暂无审计记录。命令提交后将在此显示版本区间。
      </p>
    );
  }
  return (
    <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto pr-0.5">
      {[...entries].reverse().map((e) => (
        <li
          key={e.actionId}
          className="rounded-md bg-black/20 px-2 py-1.5 text-[0.65rem]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-mono font-semibold text-foreground">
              {e.commandType}
            </span>
            <span className="shrink-0 font-mono text-muted-foreground">
              v{e.previousVersion} → v{e.resultingVersion}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-muted-foreground">
            <span>
              {CAPABILITY_LABEL[e.actor.capability]}
              {e.actor.team ? (e.actor.team === "RED" ? "·红" : "·蓝") : ""}
              {e.actor.adminOverride ? "·管理员代行" : ""}
              {e.actor.refereeOverride ? "·裁判代行" : ""}
            </span>
            <span className="ml-auto shrink-0">
              {new Date(e.timestamp).toLocaleTimeString()}
            </span>
          </div>
          {e.reason && (
            <p className="mt-0.5 truncate text-muted-foreground/80" title={e.reason}>
              {e.reason}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function AutomationIssues({
  issues,
  isPending,
  onRetry,
}: {
  issues: MatchAutomationIssue[];
  isPending: boolean;
  onRetry: (eventId: string) => void;
}) {
  if (issues.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {issues.map((i) => (
        <li
          key={i.eventID}
          className="flex items-center justify-between gap-2 rounded-md bg-warning/10 px-2 py-1.5 text-[0.65rem]"
        >
          <span className="min-w-0 truncate text-warning" title={i.lastError}>
            {i.eventType} · 尝试 {i.attempts} 次
          </span>
          <button
            type="button"
            disabled={isPending}
            onClick={() => onRetry(i.eventID)}
            className="shrink-0 rounded border border-warning/50 px-1.5 py-0.5 text-[0.65rem] font-semibold text-warning transition-colors enabled:hover:bg-warning/20 disabled:opacity-40"
          >
            重试
          </button>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Main console
// ---------------------------------------------------------------------------

export interface RefereeConsoleProps {
  referee: MatchRefereeView;
  lifecycle: MatchLifecycle | null;
  phase: MatchPhase | null;
  activeTeam: "RED" | "BLUE" | null;
  actingTeam: ActingTeam;
  isPending: boolean;
  feedback: CommandFeedback | null;
  onClearFeedback: () => void;
  onToggleActingTeam: (t: ActingTeam) => void;
  // lifecycle & flow
  onStartMatch: () => void;
  onSuspendMatch: () => void;
  onResumeMatch: () => void;
  onAbortMatch: () => void;
  onSkipCurrentAction: () => void;
  onRecordSurrender: () => void;
  // timer
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onCalibrateTimer: () => void;
  onGrantAdditionalTime: () => void;
  // results
  onStartTb: () => void;
  onConfirmResult: () => void;
  // proxy
  onProxyBan: (poolSlotId: string) => void;
  onProxyPlace: (poolSlotId: string, position: { row: number; col: number }) => void;
  onProxyShiro: (position: { row: number; col: number }) => void;
  onProxyRob: (
    targetPieceId: string,
    plans: { targetPieceID: string; sacrificeSets: string[][] }[],
  ) => void;
  // automation
  onRetryAutomation: (eventId: string) => void;
  // IRC
  irc: {
    status: MatchIrcConnectionStatus | null;
    observations: MatchIrcObservation[];
    jobs: MatchIrcJob[];
    channel: string | null;
    isConfirming: boolean;
    onConfirm: (observation: MatchIrcObservation) => void;
    onReject: (observation: MatchIrcObservation) => void;
    onRetryJob: (job: MatchIrcJob) => void;
  };
}

export default function RefereeConsole(props: RefereeConsoleProps) {
  const { referee, lifecycle, phase, activeTeam, actingTeam, isPending } = props;
  const analysis = referee.analysis;
  const allowed = new Set(analysis.allowedActions);

  const hasResultAction =
    allowed.has("CONFIRM_BEATMAP_RESULT") || allowed.has("CONFIRM_TB_RESULT");

  // --- proxy targets (phase-scoped, derived from the merged analysis)
  const banTargets = allowed.has("BAN_POOL_SLOT") ? analysis.banPoolSlotIDs : [];
  const placeTargets = allowed.has("PLACE_PIECE")
    ? analysis.legalPlacements
    : [];
  const shiroTargets = allowed.has("PLACE_SHIRO") ? analysis.shiroCells : [];
  const robTargets = allowed.has("ROB_PIECE") ? analysis.robberyPlans : [];
  const hasProxy =
    banTargets.length > 0 || placeTargets.length > 0 || shiroTargets.length > 0 || robTargets.length > 0;

  const actions: ReactNode[] = [];

  if (allowed.has("START_MATCH")) {
    actions.push(
      <ActionButton key="start" label="开始比赛" pending={isPending} onClick={props.onStartMatch} />,
    );
  }
  if (allowed.has("SUSPEND_MATCH")) {
    actions.push(
      <ActionButton key="suspend" label="挂起比赛" danger pending={isPending} onClick={props.onSuspendMatch} />,
    );
  }
  if (allowed.has("RESUME_MATCH")) {
    actions.push(
      <ActionButton key="resume" label="恢复比赛" pending={isPending} onClick={props.onResumeMatch} />,
    );
  }
  if (allowed.has("SKIP_CURRENT_ACTION")) {
    actions.push(
      <ActionButton key="skip" label="跳过当前行动" pending={isPending} onClick={props.onSkipCurrentAction} />,
    );
  }
  if (allowed.has("ABORT_MATCH")) {
    actions.push(
      <ActionButton key="abort" label="中止比赛" danger pending={isPending} onClick={props.onAbortMatch} />,
    );
  }
  if (allowed.has("RECORD_SURRENDER")) {
    actions.push(
      <ActionButton key="surrender" label="录入认输" danger pending={isPending} onClick={props.onRecordSurrender} />,
    );
  }
  if (allowed.has("PAUSE_TIMER")) {
    actions.push(
      <ActionButton key="pause" label="暂停计时" pending={isPending} onClick={props.onPauseTimer} />,
    );
  }
  if (allowed.has("RESUME_TIMER")) {
    actions.push(
      <ActionButton key="resume-timer" label="恢复计时" pending={isPending} onClick={props.onResumeTimer} />,
    );
  }
  if (allowed.has("CALIBRATE_TIMER")) {
    actions.push(
      <ActionButton key="calibrate" label="校准计时" pending={isPending} onClick={props.onCalibrateTimer} />,
    );
  }
  if (allowed.has("GRANT_ADDITIONAL_TIME")) {
    actions.push(
      <ActionButton key="grant-time" label="加时" pending={isPending} onClick={props.onGrantAdditionalTime} />,
    );
  }
  if (allowed.has("START_TB")) {
    actions.push(
      <ActionButton key="start-tb" label="开始 TB" pending={isPending} onClick={props.onStartTb} />,
    );
  }
  if (hasResultAction) {
    actions.push(
      <ActionButton key="confirm-result" label="确认结果" pending={isPending} onClick={props.onConfirmResult} />,
    );
  }

  // Group placement cells by pool slot for compact rendering.
  const placeBySlot = new Map<string, typeof placeTargets>();
  for (const p of placeTargets) {
    const list = placeBySlot.get(p.poolSlotID) ?? [];
    list.push(p);
    placeBySlot.set(p.poolSlotID, list);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Status header */}
      <div className="rounded-lg border border-border bg-background/40 p-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">裁判控制台</h2>
          <span className="rounded-full border border-border px-2 py-0.5 text-[0.65rem] text-muted-foreground">
            {LIFECYCLE_LABELS[lifecycle ?? "READY"]}
            {phase && phase !== "NONE" ? ` · ${PHASE_LABELS[phase]}` : ""}
          </span>
        </div>
        {referee.suspensionReason && (
          <p className="mt-1.5 text-[0.65rem] text-warning">
            挂起原因：{referee.suspensionReason}
          </p>
        )}
        {referee.abortReason && (
          <p className="mt-1.5 text-[0.65rem] text-danger">
            中止原因：{referee.abortReason}
          </p>
        )}
        {props.feedback && (
          <p
            className={`mt-1.5 text-[0.65rem] font-semibold ${
              props.feedback.kind === "ok" ? "text-success" : "text-danger"
            }`}
          >
            {props.feedback.message}
          </p>
        )}
      </div>

      {/* Command buttons — passive waiting mode when empty */}
      <Section title="命令">
        {actions.length === 0 ? (
          <p className="text-[0.65rem] text-muted-foreground">
            {lifecycle === "FINISHED" || lifecycle === "ABORTED"
              ? "比赛已结束，无可用命令。"
              : "等待操作…"}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">{actions}</div>
        )}
        {/* Undo placeholder (R-note: backend does not support undo yet) */}
        <button
          type="button"
          disabled
          title="待后端支持"
          className="mt-2 w-full cursor-not-allowed rounded-md border border-dashed border-border px-2 py-1 text-[0.65rem] text-muted-foreground/60"
        >
          撤销上一步（待后端支持）
        </button>
      </Section>

      {/* Proxy section — actingTeam "safety switch" */}
      {hasProxy && (
        <Section
          title="代理操作"
          right={
            <TeamToggle
              team={actingTeam}
              onChange={props.onToggleActingTeam}
              disabled={isPending}
            />
          }
        >
          <p className="mb-1.5 text-[0.65rem] text-muted-foreground">
            代 {actingTeam === "RED" ? "红方" : "蓝方"} 执行
            {activeTeam ? ` · 当前回合 ${activeTeam === "RED" ? "红方" : "蓝方"}` : ""}
          </p>

          {banTargets.length > 0 && (
            <div className="mb-1.5">
              <p className="mb-1 text-[0.65rem] font-semibold text-muted-foreground">Ban 候选槽位</p>
              <div className="flex flex-wrap gap-1">
                {banTargets.map((id) => (
                  <button
                    key={id}
                    type="button"
                    disabled={isPending}
                    onClick={() => props.onProxyBan(id)}
                    className="rounded border border-border bg-background/40 px-2 py-0.5 font-mono text-[0.65rem] text-foreground transition-colors enabled:hover:border-danger/50"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          )}

          {placeBySlot.size > 0 && (
            <div className="mb-1.5">
              <p className="mb-1 text-[0.65rem] font-semibold text-muted-foreground">落子候选</p>
              <div className="flex flex-col gap-1">
                {[...placeBySlot.entries()].map(([slotId, cells]) => (
                  <div key={slotId} className="flex flex-wrap items-center gap-1">
                    <span className="font-mono text-[0.65rem] text-muted-foreground">{slotId}</span>
                    {cells.map((c) => {
                      const pos = cellToPosition(c.cell);
                      if (!pos) return null;
                      return (
                        <button
                          key={c.cell}
                          type="button"
                          disabled={isPending}
                          onClick={() => props.onProxyPlace(slotId, pos)}
                          className="rounded border border-border bg-background/40 px-1.5 py-0.5 font-mono text-[0.65rem] text-foreground transition-colors enabled:hover:border-success/50"
                        >
                          {c.cell}
                          {c.forceMod ? `·${c.forceMod}` : ""}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {shiroTargets.length > 0 && (
            <div className="mb-1.5">
              <p className="mb-1 text-[0.65rem] font-semibold text-muted-foreground">Shiro 候选格</p>
              <div className="flex flex-wrap gap-1">
                {shiroTargets.map((cell) => {
                  const pos = cellToPosition(cell);
                  if (!pos) return null;
                  return (
                    <button
                      key={cell}
                      type="button"
                      disabled={isPending}
                      onClick={() => props.onProxyShiro(pos)}
                      className="rounded border border-border bg-background/40 px-1.5 py-0.5 font-mono text-[0.65rem] text-foreground transition-colors enabled:hover:border-primary/50"
                    >
                      {cell}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {robTargets.length > 0 && (
            <div>
              <p className="mb-1 text-[0.65rem] font-semibold text-muted-foreground">夺棋目标</p>
              <div className="flex flex-wrap gap-1">
                {robTargets.map((p) => (
                  <button
                    key={p.targetPieceID}
                    type="button"
                    disabled={isPending}
                    onClick={() => props.onProxyRob(p.targetPieceID, robTargets.filter((r) => r.targetPieceID === p.targetPieceID))}
                    className="rounded border border-border bg-background/40 px-2 py-0.5 font-mono text-[0.65rem] text-foreground transition-colors enabled:hover:border-warning/50"
                  >
                    夺 {p.targetPieceID}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* IRC integration */}
      <Section title="IRC">
        <IrcPanel {...props.irc} />
      </Section>

      {/* Audit trail */}
      <Section title="审计日志">
        <AuditLog entries={referee.auditLog} />
      </Section>

      {/* Automation issues */}
      {referee.automationIssues.length > 0 && (
        <Section title="自动化问题">
          <AutomationIssues
            issues={referee.automationIssues}
            isPending={isPending}
            onRetry={props.onRetryAutomation}
          />
        </Section>
      )}
    </div>
  );
}
