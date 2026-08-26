"use client";

/**
 * Command submission layer (M2) — the single entry point for in-match
 * mutations. Wraps the GraphQL command mutations with the contract from
 * `internal/matchcommand/orchestrator.go`:
 *
 * - `commandId` must be a non-zero UUID; retries of the SAME logical action
 *   (network failures only) reuse the id → the backend replies REPLAYED and
 *   applies nothing twice (double-click / resend safe).
 * - `expectedVersion` comes from the latest WS snapshot; on
 *   `MATCH_VERSION_CONFLICT` the error carries `currentVersion` and the
 *   caller should refresh (resync) and let the user retry.
 * - Business errors return a structured `CommandError`; transport failures
 *   throw `CommandTransportError` (distinguishable so the UI can keep the
 *   commandId for a retry).
 *
 * The UI never renders raw errors — map via `errors.ts`.
 */

import { graphqlRequest } from "@/app/lib/api";
import type { TypedDocumentString } from "@/app/graphql/graphql";
import {
  BanPoolSlotDocument,
  PlacePieceDocument,
  PlaceShiroDocument,
  RequestTbDocument,
  RespondTbRequestDocument,
  RobPieceDocument,
} from "@/app/lib/operations";
import type { MatchErrorShape } from "./errors";
import { matchErrorMessage } from "./errors";

// ---------------------------------------------------------------------------
// Result shapes
// ---------------------------------------------------------------------------

export type CommandDisposition = "APPLIED" | "REPLAYED";

export interface CommandResult {
  ok: boolean;
  disposition?: CommandDisposition;
  resultingVersion?: string;
  error?: MatchErrorShape;
}

/** Transport-level failure (offline, 5xx, malformed response). Retryable. */
export class CommandTransportError extends Error {
  constructor(message = "网络异常，请重试") {
    super(message);
    this.name = "CommandTransportError";
  }
}

/** Backend rejected the command with a structured error. */
export function commandErrorMessage(error: MatchErrorShape): string {
  // Errors.ts maps codes to Chinese text; reuse the existing mapping.
  return matchErrorMessage(error);
}

// ---------------------------------------------------------------------------
// Low-level submit helper
// ---------------------------------------------------------------------------

async function submitCommand<TResult, TVariables>(
  doc: TypedDocumentString<TResult, TVariables>,
  variables: TVariables,
): Promise<CommandResult> {
  let res: Awaited<ReturnType<typeof graphqlRequest<TResult, TVariables>>>;
  try {
    res = await graphqlRequest(doc, variables);
  } catch {
    throw new CommandTransportError();
  }

  if (res.errors?.length) {
    // GraphQL envelope-level failure (validation/authz short-circuits).
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: res.errors[0].message },
    };
  }

  const result = res.data as
    | {
        [k: string]: {
          success?: boolean;
          disposition?: CommandDisposition;
          resultingVersion?: string;
          error?: MatchErrorShape | null;
        };
      }
    | undefined;
  const payload = result ? Object.values(result)[0] : undefined;
  if (!payload) {
    return { ok: false, error: { code: "INTERNAL_ERROR", message: "空响应" } };
  }
  if (payload.error) {
    return { ok: false, error: payload.error, disposition: payload.disposition };
  }
  return {
    ok: payload.success !== false,
    disposition: payload.disposition,
    resultingVersion: payload.resultingVersion,
  };
}

// ---------------------------------------------------------------------------
// Typed command builders
// ---------------------------------------------------------------------------

export interface CommandMetaArgs {
  matchId: string;
  /** Latest WS snapshot.version — optimistic concurrency guard. */
  expectedVersion: string;
  commandId: string;
}

/** Fresh UUID per logical action; transport retries reuse the same id. */
export function newCommandId(): string {
  return crypto.randomUUID();
}

export function banPoolSlot(args: CommandMetaArgs & { poolSlotId: string }): Promise<CommandResult> {
  return submitCommand(BanPoolSlotDocument, {
    input: { meta: metaOf(args), poolSlotId: args.poolSlotId },
  });
}

export function placePiece(
  args: CommandMetaArgs & { poolSlotId: string; position: { row: number; col: number } },
): Promise<CommandResult> {
  return submitCommand(PlacePieceDocument, {
    input: { meta: metaOf(args), poolSlotId: args.poolSlotId, position: args.position },
  });
}

export function placeShiro(
  args: CommandMetaArgs & { position: { row: number; col: number } },
): Promise<CommandResult> {
  return submitCommand(PlaceShiroDocument, {
    input: { meta: metaOf(args), position: args.position },
  });
}

export function robPiece(
  args: CommandMetaArgs & { targetPieceId: string; sacrificeSets: string[][] },
): Promise<CommandResult> {
  return submitCommand(RobPieceDocument, {
    input: {
      meta: metaOf(args),
      targetPieceId: args.targetPieceId,
      sacrificeSets: args.sacrificeSets,
    },
  });
}

export function requestTb(args: CommandMetaArgs & { requestId: string }): Promise<CommandResult> {
  return submitCommand(RequestTbDocument, { input: { meta: metaOf(args), requestId: args.requestId } });
}

export function respondTbRequest(
  args: CommandMetaArgs & { requestId: string; accept: boolean },
): Promise<CommandResult> {
  return submitCommand(RespondTbRequestDocument, {
    input: { meta: metaOf(args), requestId: args.requestId, accept: args.accept },
  });
}

function metaOf(args: CommandMetaArgs): CommandMetaArgs {
  return {
    matchId: args.matchId,
    expectedVersion: args.expectedVersion,
    commandId: args.commandId,
  };
}

// ---------------------------------------------------------------------------
// Error code helpers
// ---------------------------------------------------------------------------

export function isVersionConflict(error?: MatchErrorShape): boolean {
  return error?.code === "MATCH_VERSION_CONFLICT";
}

export function isReplay(result: CommandResult): boolean {
  return result.disposition === "REPLAYED";
}
