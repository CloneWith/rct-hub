"use client";

/**
 * IrcPanel — referee IRC integration (M3).
 *
 * Shows the IRC connection status badge, pending result observations with
 * one-click confirm/reject, and failed IRC jobs with a retry action.
 */

import type {
  MatchIrcConnectionStatus,
  MatchIrcJob,
  MatchIrcObservation,
} from "@/app/lib/hooks";

function StatusBadge({ status }: { status: MatchIrcConnectionStatus | null }) {
  if (!status?.configured) {
    return (
      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
        IRC 未配置
      </span>
    );
  }
  if (status.connected) {
    return (
      <span className="rounded-full border border-success/60 bg-success/10 px-2 py-0.5 text-xs text-success">
        IRC 已连接{status.degraded ? "（降级）" : ""}
      </span>
    );
  }
  return (
    <span className="rounded-full border border-warning/60 bg-warning/10 px-2 py-0.5 text-xs text-warning" title={status.lastError ?? undefined}>
      IRC 未连接
    </span>
  );
}

export default function IrcPanel({
  status,
  observations,
  jobs,
  channel,
  isConfirming,
  onConfirm,
  onReject,
  onRetryJob,
}: {
  status: MatchIrcConnectionStatus | null;
  observations: MatchIrcObservation[];
  jobs: MatchIrcJob[];
  channel: string | null;
  isConfirming: boolean;
  onConfirm: (observation: MatchIrcObservation) => void;
  onReject: (observation: MatchIrcObservation) => void;
  onRetryJob: (job: MatchIrcJob) => void;
}) {
  const pending = observations.filter((o) => o.reviewStatus === "PENDING");
  const others = observations.filter((o) => o.reviewStatus !== "PENDING");
  const failedJobs = jobs.filter((j) => j.status === "FAILED");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">IRC 结果建议</h3>
        <StatusBadge status={status} />
      </div>

      {!channel && (
        <p className="text-xs text-muted-foreground">
          未设置 MP 链接，无法接收 IRC 观察建议。
        </p>
      )}

      {pending.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无待处理的观察建议。</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {pending.map((o) => (
            <li
              key={o.id}
              className="rounded-lg border border-border bg-background/40 p-2"
            >
              <p className="font-mono text-xs text-foreground">{o.raw}</p>
              <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                {o.sender} · {new Date(o.observedAt).toLocaleTimeString()}
              </p>
              {o.suggestedResult && (
                <p className="mt-1 text-xs">
                  <span className="text-muted-foreground">建议：</span>
                  <span className={o.suggestedResult.winningTeam === "RED" ? "font-semibold text-danger" : "font-semibold text-primary"}>
                    {o.suggestedResult.winningTeam === "RED" ? "红方" : "蓝方"}胜
                  </span>
                  <span className="ml-1 font-mono text-muted-foreground">
                    （棋子 {o.suggestedResult.boardPieceID}）
                  </span>
                </p>
              )}
              <div className="mt-1.5 flex gap-1.5">
                <button
                  type="button"
                  disabled={isConfirming || !o.suggestedResult}
                  onClick={() => onConfirm(o)}
                  className="rounded-md border border-success/60 bg-success/10 px-2 py-0.5 text-xs text-success transition-colors enabled:hover:bg-success/20 disabled:opacity-40"
                >
                  确认结果
                </button>
                <button
                  type="button"
                  disabled={isConfirming}
                  onClick={() => onReject(o)}
                  className="rounded-md border border-danger/60 bg-danger/10 px-2 py-0.5 text-xs text-danger transition-colors enabled:hover:bg-danger/20 disabled:opacity-40"
                >
                  拒绝
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            已处理（{others.length}）
          </summary>
          <ul className="mt-1 flex flex-col gap-1">
            {others.map((o) => (
              <li key={o.id} className="flex items-center gap-1.5 text-muted-foreground">
                <span className="font-mono">{o.raw}</span>
                <span
                  className={
                    o.reviewStatus === "CONFIRMED"
                      ? "text-success"
                      : o.reviewStatus === "REJECTED"
                        ? "text-danger"
                        : "text-warning"
                  }
                >
                  {o.reviewStatus === "CONFIRMED"
                    ? "已确认"
                    : o.reviewStatus === "REJECTED"
                      ? "已拒绝"
                      : "确认中"}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {failedJobs.length > 0 && (
        <div className="mt-1 border-t border-border pt-1.5">
          <p className="mb-1 text-[0.65rem] font-semibold text-muted-foreground">
            发送失败的任务
          </p>
          <ul className="flex flex-col gap-1">
            {failedJobs.map((j) => (
              <li
                key={j.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="truncate text-muted-foreground" title={j.lastError ?? undefined}>
                  {j.kind} · {j.channel}
                </span>
                <button
                  type="button"
                  onClick={() => onRetryJob(j)}
                  className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-xs text-foreground transition-colors hover:border-foreground/40"
                >
                  重试
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
