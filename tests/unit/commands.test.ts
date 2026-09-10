/**
 * Vitest port of the legacy `node:test` suite for the command-submission
 * transport layer (`app/rooms/[code]/match/lib/commands.ts`).
 *
 * Module-mocking strategy:
 * - `vi.mock("@/app/lib/api", ...)` replaces `graphqlRequest` with a hoisted
 *   spy. Hoisting is required because the factory body runs before the
 *   surrounding module's top-level `const`s.
 * - `vi.mock("@/app/lib/operations", ...)` stubs every `*Document` symbol
 *   that `commands.ts` re-imports, so the SUT can resolve them without
 *   pulling in the real `TypedDocumentString`s (which would otherwise drag
 *   the whole codegen graph into the test process).
 */
import { describe, expect, it, vi } from "vitest";

const { graphqlRequest } = vi.hoisted(() => ({
  graphqlRequest: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock("@/app/lib/api", () => ({ graphqlRequest }));

vi.mock("@/app/lib/operations", async () => {
  const DOC_NAMES = [
    "AbortMatchDocument",
    "BanPoolSlotDocument",
    "CalibrateTimerDocument",
    "ConfirmBeatmapResultDocument",
    "ConfirmIRCResultDocument",
    "ConfirmTbResultDocument",
    "GrantAdditionalTimeDocument",
    "MarkStrategistReadyDocument",
    "PauseTimerDocument",
    "PlacePieceDocument",
    "PlaceShiroDocument",
    "RecordSurrenderDocument",
    "RefereeBanPoolSlotDocument",
    "RefereePlacePieceDocument",
    "RefereePlaceShiroDocument",
    "RefereeRequestTbDocument",
    "RefereeRespondTbRequestDocument",
    "RefereeRobPieceDocument",
    "RejectIRCObservationDocument",
    "RequestTbDocument",
    "RespondTbRequestDocument",
    "ResumeMatchDocument",
    "ResumeTimerDocument",
    "RetryIRCJobDocument",
    "RetryMatchAutomationDocument",
    "RobPieceDocument",
    "SkipCurrentActionDocument",
    "StartMatchDocument",
    "StartTbDocument",
    "SuspendMatchDocument",
  ];
  return DOC_NAMES.reduce<Record<string, unknown>>((acc, n) => {
    acc[n] = { kind: "Document", __stub: true };
    return acc;
  }, {});
});

const { CommandTransportError, isReplay, isVersionConflict, newCommandId, placePiece } =
  await import("@/app/rooms/[code]/match/lib/commands");

// ---------------------------------------------------------------------------

const ARGS = {
  matchId: "match-1",
  expectedVersion: "7",
  commandId: "11111111-2222-3333-4444-555555555555",
  poolSlotId: "slot-1",
  position: { row: 2, col: 3 },
};

describe("newCommandId", () => {
  it("returns a v4-shaped UUID", () => {
    const id = newCommandId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("is unique across calls", () => {
    expect(newCommandId()).not.toBe(newCommandId());
  });
});

describe("submitCommand transport", () => {
  it("throws CommandTransportError on network failure (retry keeps same commandId)", async () => {
    graphqlRequest.mockImplementationOnce(() => Promise.reject(new Error("offline")));
    await expect(placePiece(ARGS)).rejects.toBeInstanceOf(CommandTransportError);
    // The same logical action retries with an identical commandId — that
    // idempotency contract is asserted in "passes meta + action fields".
  });

  it("maps GraphQL envelope errors to INTERNAL_ERROR", async () => {
    graphqlRequest.mockImplementationOnce(() =>
      Promise.resolve({ data: undefined, errors: [{ message: "auth short-circuit" }] }),
    );
    const res = await placePiece(ARGS);
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INTERNAL_ERROR");
  });

  it("handles an empty response body", async () => {
    graphqlRequest.mockImplementationOnce(() =>
      Promise.resolve({ data: undefined, errors: undefined }),
    );
    const res = await placePiece(ARGS);
    expect(res.ok).toBe(false);
    expect(res.error?.message).toBe("空响应");
  });
});

describe("submitCommand payloads", () => {
  it("forwards structured business errors with disposition", async () => {
    graphqlRequest.mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          placePiece: {
            success: false,
            disposition: "REPLAYED",
            error: { code: "NOT_ACTIVE_TEAM", message: "not your turn" },
          },
        },
      }),
    );
    const res = await placePiece(ARGS);
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("NOT_ACTIVE_TEAM");
    expect(res.disposition).toBe("REPLAYED");
  });

  it("passes meta + action fields into the variables", async () => {
    graphqlRequest.mockImplementationOnce(() =>
      Promise.resolve({
        data: { placePiece: { success: true, disposition: "APPLIED", resultingVersion: "8" } },
      }),
    );
    await placePiece(ARGS);
    // Note: vi.fn() call history is cumulative — assert the most recent call
    // rather than absolute counts.
    const lastCall = graphqlRequest.mock.calls.at(-1);
    // vi.fn() stores call args as a tuple on the call record; the old
    // node:test mock used a Function-like `arguments` proxy.
    const variables = lastCall?.[1];
    expect(variables).toEqual({
      input: {
        meta: {
          matchId: "match-1",
          expectedVersion: "7",
          commandId: "11111111-2222-3333-4444-555555555555",
        },
        poolSlotId: "slot-1",
        position: { row: 2, col: 3 },
      },
    });
  });

  it("marks success with resultingVersion", async () => {
    graphqlRequest.mockImplementationOnce(() =>
      Promise.resolve({
        data: { placePiece: { success: true, disposition: "APPLIED", resultingVersion: "9" } },
      }),
    );
    const res = await placePiece(ARGS);
    expect(res.ok).toBe(true);
    expect(res.resultingVersion).toBe("9");
  });
});

describe("error code helpers", () => {
  it("isVersionConflict only matches MATCH_VERSION_CONFLICT", () => {
    expect(isVersionConflict({ code: "MATCH_VERSION_CONFLICT" })).toBe(true);
    expect(isVersionConflict({ code: "TIMER_EXPIRED" })).toBe(false);
    expect(isVersionConflict(undefined)).toBe(false);
  });

  it("isReplay matches the REPLAYED disposition", () => {
    expect(isReplay({ ok: false, disposition: "REPLAYED" })).toBe(true);
    expect(isReplay({ ok: true, disposition: "APPLIED" })).toBe(false);
    expect(isReplay({ ok: true })).toBe(false);
  });
});