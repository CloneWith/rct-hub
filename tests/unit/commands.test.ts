import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Module mocks — registered BEFORE the dynamic import of commands.ts.
// `@/` alias specifiers are intercepted by mock.module; the real api.ts /
// operations.ts would otherwise be unresolvable under plain Node ESM.
// ---------------------------------------------------------------------------

const graphqlRequest = mock.fn<(...args: unknown[]) => Promise<unknown>>();

mock.module("@/app/lib/api", {
  namedExports: { graphqlRequest },
});

// Every *Document imported by commands.ts must exist in the stub.
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
const opsStub: Record<string, unknown> = {};
for (const n of DOC_NAMES) opsStub[n] = { kind: "Document", __stub: true };
mock.module("@/app/lib/operations", { namedExports: opsStub });

const {
  CommandTransportError,
  isReplay,
  isVersionConflict,
  newCommandId,
  placePiece,
} = await import("../../app/rooms/[code]/match/lib/commands");

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
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("is unique across calls", () => {
    assert.notEqual(newCommandId(), newCommandId());
  });
});

describe("submitCommand transport", () => {
  it("throws CommandTransportError on network failure (retry keeps same commandId)", async () => {
    graphqlRequest.mock.mockImplementationOnce(() => Promise.reject(new Error("offline")));
    await assert.rejects(placePiece(ARGS), CommandTransportError);
    // The same logical action retries with an identical commandId — that
    // idempotency contract is asserted in "passes meta + action fields".
  });

  it("maps GraphQL envelope errors to INTERNAL_ERROR", async () => {
    graphqlRequest.mock.mockImplementationOnce(() =>
      Promise.resolve({ data: undefined, errors: [{ message: "auth short-circuit" }] }),
    );
    const res = await placePiece(ARGS);
    assert.equal(res.ok, false);
    assert.equal(res.error?.code, "INTERNAL_ERROR");
  });

  it("handles an empty response body", async () => {
    graphqlRequest.mock.mockImplementationOnce(() =>
      Promise.resolve({ data: undefined, errors: undefined }),
    );
    const res = await placePiece(ARGS);
    assert.equal(res.ok, false);
    assert.equal(res.error?.message, "空响应");
  });
});

describe("submitCommand payloads", () => {
  it("forwards structured business errors with disposition", async () => {
    graphqlRequest.mock.mockImplementationOnce(() =>
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
    assert.equal(res.ok, false);
    assert.equal(res.error?.code, "NOT_ACTIVE_TEAM");
    assert.equal(res.disposition, "REPLAYED");
  });

  it("passes meta + action fields into the variables", async () => {
    graphqlRequest.mock.mockImplementationOnce(() =>
      Promise.resolve({
        data: { placePiece: { success: true, disposition: "APPLIED", resultingVersion: "8" } },
      }),
    );
    await placePiece(ARGS);
    // Note: mock.fn() call history is cumulative in Node 22 — assert the most
    // recent call rather than absolute counts.
    const lastCall = graphqlRequest.mock.calls.at(-1);
    const variables = lastCall?.arguments[1];
    assert.deepEqual(variables, {
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
    graphqlRequest.mock.mockImplementationOnce(() =>
      Promise.resolve({
        data: { placePiece: { success: true, disposition: "APPLIED", resultingVersion: "9" } },
      }),
    );
    const res = await placePiece(ARGS);
    assert.equal(res.ok, true);
    assert.equal(res.resultingVersion, "9");
  });
});

describe("error code helpers", () => {
  it("isVersionConflict only matches MATCH_VERSION_CONFLICT", () => {
    assert.equal(isVersionConflict({ code: "MATCH_VERSION_CONFLICT" }), true);
    assert.equal(isVersionConflict({ code: "TIMER_EXPIRED" }), false);
    assert.equal(isVersionConflict(undefined), false);
  });

  it("isReplay matches the REPLAYED disposition", () => {
    assert.equal(isReplay({ ok: false, disposition: "REPLAYED" }), true);
    assert.equal(isReplay({ ok: true, disposition: "APPLIED" }), false);
    assert.equal(isReplay({ ok: true }), false);
  });
});
