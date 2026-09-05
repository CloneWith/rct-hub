/**
 * `useMatchByCode` queryFn behavior — locks the contract that field-level
 * GraphQL errors do not collapse the whole bootstrap into an error.
 *
 * Before this contract was added, any non-strategist user (e.g. an admin
 * viewing the board) hitting the strategistView field would cause the
 * entire `matchByCode` query to throw, surfacing "加载比赛信息失败"
 * even though snapshot / room / refereeView came back fine. The fix
 * returns partial data so the page can show the gated panels as empty
 * (their types are already nullable) and the admin / referee console
 * still works.
 *
 * Only the truly fatal cases — no match data, top-level errors — still
 * reject, so the page can render its "比赛不存在" / "加载失败" branch.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup as rtlCleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";

const mockGraphqlRequest = vi.fn();

vi.mock("@/app/lib/api", () => ({
  graphqlRequest: (...args: unknown[]) => mockGraphqlRequest(...args),
}));

// Import after mock so the module picks up the mocked `graphqlRequest`.
const { useMatchByCode } = await import("@/app/lib/hooks");

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={ qc }>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

beforeEach(() => {
  mockGraphqlRequest.mockReset();
});

afterEach(() => {
  rtlCleanup();
});

describe("useMatchByCode queryFn", () => {
  it("returns data when the GraphQL response is fully successful", async () => {
    mockGraphqlRequest.mockResolvedValueOnce({
      data: {
        matchByCode: {
          id: "m1",
          code: "TEST01",
          name: "Test Open Casual",
          roomType: "CASUAL",
          roomID: "r1",
          status: "PENDING",
          strategistReadiness: { redReady: false, blueReady: false },
          room: { id: "r1", name: "Test Open Casual", round: "eliminated", settings: { mpLink: null } },
          pool: [],
          snapshot: {
            version: "0",
            lifecycle: "READY",
            phase: "NONE",
            turn: 0,
            activeTeam: null,
            wonCounts: { red: 0, blue: 0 },
          },
          strategistView: null,
          captainView: null,
          refereeView: {
            matchID: "m1",
            analysis: {
              allowedActions: [],
              banPoolSlotIDs: [],
              legalPlacements: [],
              shiroCells: [],
              robberyPlans: [],
              pendingTBRequestID: null,
              canAcceptTBRequest: false,
              canRejectTBRequest: false,
              tbRequestTeams: [],
              tbResponseTeams: [],
            },
            suspensionReason: null,
            abortReason: null,
            auditLog: [],
            automationIssues: [],
          },
        },
      },
      errors: undefined,
    });

    const { result } = renderHook(() => useMatchByCode("TEST01"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current?.isSuccess).toBe(true));
    expect(result.current?.data?.id).toBe("m1");
    expect(result.current?.error).toBeNull();
  });

  it("returns partial data when only field-level errors are present (admin requesting strategistView)", async () => {
    // Admin user gets strategistView / captainView nulled out by the server
    // (the new contract returns "admin should read matchByCode.refereeView
    // instead of ..." errors on those fields) while the rest of the match
    // data still arrives.
    mockGraphqlRequest.mockResolvedValueOnce({
      data: {
        matchByCode: {
          id: "m1",
          code: "TEST01",
          name: "Test Open Casual",
          roomType: "CASUAL",
          roomID: "r1",
          status: "PENDING",
          strategistReadiness: { redReady: false, blueReady: false },
          room: { id: "r1", name: "Test Open Casual", round: "eliminated", settings: { mpLink: null } },
          pool: [],
          snapshot: {
            version: "0",
            lifecycle: "READY",
            phase: "NONE",
            turn: 0,
            activeTeam: null,
            wonCounts: { red: 0, blue: 0 },
          },
          strategistView: null,
          captainView: null,
          refereeView: {
            matchID: "m1",
            analysis: {
              allowedActions: [],
              banPoolSlotIDs: [],
              legalPlacements: [],
              shiroCells: [],
              robberyPlans: [],
              pendingTBRequestID: null,
              canAcceptTBRequest: false,
              canRejectTBRequest: false,
              tbRequestTeams: [],
              tbResponseTeams: [],
            },
            suspensionReason: null,
            abortReason: null,
            auditLog: [],
            automationIssues: [],
          },
        },
      },
      errors: [
        {
          message:
            "ACTION_NOT_ALLOWED: admin should read matchByCode.refereeView instead of strategistView",
          path: ["matchByCode", "strategistView"],
        },
        {
          message:
            "ACTION_NOT_ALLOWED: admin should read matchByCode.refereeView instead of captainView",
          path: ["matchByCode", "captainView"],
        },
      ],
    });

    const { result } = renderHook(() => useMatchByCode("TEST01"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current?.isSuccess).toBe(true));
    expect(result.current?.error).toBeNull();
    expect(result.current?.data?.id).toBe("m1");
    expect(result.current?.data?.strategistView).toBeNull();
    expect(result.current?.data?.refereeView?.matchID).toBe("m1");
  });

  it("throws when the match data is entirely missing (top-level error)", async () => {
    // mockRejectedValue (persistent) — useMatchByCode opts in to retry: 1,
    // so the second attempt must also reject for the error to surface.
    mockGraphqlRequest.mockRejectedValue(new Error("RESOURCE_NOT_FOUND"));

    const { result } = renderHook(() => useMatchByCode("MISSING"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current?.isError).toBe(true), { timeout: 3000 });
    expect(result.current?.error).toBeTruthy();
    expect(result.current?.error?.message).toContain("RESOURCE_NOT_FOUND");
  });

  it("returns null when the server replies with no data and no errors", async () => {
    mockGraphqlRequest.mockResolvedValueOnce({ data: undefined, errors: undefined });
    const { result } = renderHook(() => useMatchByCode("TEST01"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current?.isSuccess).toBe(true));
    expect(result.current?.data).toBeNull();
    expect(result.current?.error).toBeNull();
  });
});