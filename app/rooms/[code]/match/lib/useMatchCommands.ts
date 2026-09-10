"use client";

/**
 * useMatchCommand — shared command submission hook (M2).
 *
 * Wraps the low-level builders from `commands.ts` with the UI concerns:
 * - pending state (button disabling / "提交中…" transition)
 * - feedback toast line (ok / error) shown near the action bar
 * - commandId lifecycle: one id per logical action, reused across transport
 *   retries, reset after a definitive backend answer (incl. REPLAYED)
 * - `MATCH_VERSION_CONFLICT` → trigger a WS resync and tell the user to retry
 *
 * Optimistic mode (D5): we do NOT pre-render the future board. The only
 * optimistic surface is the pending/transition state itself; the authoritative
 * board comes from the next WS snapshot.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useMatchLive } from "../MatchLiveProvider";
import {
  CommandTransportError,
  isVersionConflict,
  newCommandId,
  type CommandMetaArgs,
  type CommandResult,
} from "./commands";
import { commandErrorMessage } from "./commands";
import type { MatchErrorShape } from "./errors";

export interface CommandFeedback {
  kind: "ok" | "error";
  message: string;
}

const FEEDBACK_TTL_MS = 5000;

export function useMatchCommand<TArgs extends Record<string, unknown>>(
  submit: (args: CommandMetaArgs & TArgs) => Promise<CommandResult>,
  opts?: { onSuccess?: (result: CommandResult) => void },
) {
  const { snapshot, matchId, resync } = useMatchLive();
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<CommandFeedback | null>(null);

  const commandIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitRef = useRef(submit);
  const onSuccessRef = useRef(opts?.onSuccess);

  // Keep latest callbacks without re-creating `mutate` on every render.
  useEffect(() => {
    submitRef.current = submit;
    onSuccessRef.current = opts?.onSuccess;
  }, [submit, opts?.onSuccess]);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showFeedback = useCallback(
    (fb: CommandFeedback) => {
      setFeedback(fb);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setFeedback(null), FEEDBACK_TTL_MS);
    },
    [],
  );

  // Changing match resets the in-flight command id (no cross-match reuse).
  useEffect(() => {
    commandIdRef.current = null;
  }, [matchId]);

  const mutate = useCallback(
    async (args: TArgs) => {
      if (!snapshot) return;
      // WS snapshot.version is a JSON number; CommandMeta.expectedVersion is a
      // UInt64 decimal string — bridge with String() (backend ParseUint).
      const expectedVersion = String(snapshot.version);
      // Reuse the same commandId while a logical action is in flight, so a
      // transport retry stays idempotent. Reset once the backend answered.
      const commandId = commandIdRef.current ?? newCommandId();
      commandIdRef.current = commandId;

      setIsPending(true);
      try {
        const result = await submitRef.current({
          ...args,
          matchId,
          expectedVersion,
          commandId,
        } as CommandMetaArgs & TArgs);

        if (result.ok) {
          commandIdRef.current = null;
          showFeedback({
            kind: "ok",
            message: result.disposition === "REPLAYED" ? "操作已提交" : "已提交",
          });
          onSuccessRef.current?.(result);
        } else if (isVersionConflict(result.error)) {
          // Snapshot is stale — resync via WS and let the user retry.
          commandIdRef.current = null;
          resync();
          showFeedback({ kind: "error", message: "比赛状态已更新，请重试" });
        } else {
          commandIdRef.current = null;
          showFeedback({ kind: "error", message: commandErrorMessage(result.error as MatchErrorShape) });
        }
      } catch (err) {
        if (err instanceof CommandTransportError) {
          // Transport failure: keep the commandId so a manual retry is
          // idempotent (backend will answer REPLAYED if it did apply).
          showFeedback({ kind: "error", message: err.message });
        } else {
          commandIdRef.current = null;
          showFeedback({ kind: "error", message: "操作失败，请重试" });
        }
      } finally {
        setIsPending(false);
      }
    },
    [snapshot, matchId, resync, showFeedback],
  );

  return { mutate, isPending, feedback, clearFeedback };
}

/** Fresh UUID for TB requests (`requestId` is generated client-side). */
export function newTbRequestId(): string {
  return newCommandId();
}
