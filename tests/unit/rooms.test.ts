/**
 * Unit tests for the room domain helpers in `app/lib/rooms.ts`.
 *
 * These functions are pure / side-effect free; the tests assert the chip
 * derivation, role/permission checks, and the pre-start checklist builder
 * (the same checks the backend runs server-side, mirrored client-side to
 * surface blocking issues before the user clicks "Start").
 */
import { describe, expect, it } from "vitest";

import {
  LIFECYCLE_LABELS,
  PIECE_MOD_LABELS,
  ROOM_ROUNDS,
  ROOM_TYPE_LABELS,
  TEAM_SIDE_LABELS,
  buildStartChecklist,
  canControlRoom,
  hasRole,
  isAdmin,
  roomStatusChip,
  showRelatedFilter,
  type RoomItem,
  type StartChecklistInput,
} from "@/app/lib/rooms";
import type { AuthUser } from "@/app/lib/hooks";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeUser(roles: AuthUser["roles"], onlineID = "1"): AuthUser {
  return {
    id: "u1",
    onlineID,
    username: "alice",
    avatarUrl: "",
    countryCode: "CN",
    roles,
    verifyStatus: "VERIFIED",
    isBanned: false,
    globalRank: null,
    pp: null,
  };
}

function makeRoom(overrides: Partial<RoomItem> = {}): RoomItem {
  return {
    id: "r1",
    code: "ABCDEF",
    name: "Test Room",
    type: "MATCH",
    round: "小组赛",
    scheduledAt: "2026-09-01T00:00:00Z",
    createdAt: "2026-08-01T00:00:00Z",
    ownerID: "1",
    refereeUserID: null,
    matchID: null,
    owner: { id: "1", onlineID: "1", username: "alice", avatarUrl: "" },
    match: null,
    settings: {
      streamerUserID: null,
      firstPick: null,
      firstBan: null,
      redTeamID: null,
      blueTeamID: null,
      mappoolID: null,
      redTeam: null,
      blueTeam: null,
      mappool: null,
      mpLink: null,
      streamLink: null,
    },
    ...overrides,
  };
}

function makeTeam(overrides: Partial<RoomItem["settings"]["redTeam"]> = {}) {
  return {
    id: "t-red",
    name: "Red",
    description: null,
    seed: null,
    leaderID: 100,
    strategistID: 200,
    playerIDs: [100, 101, 102, 103],
    isReady: true,
    ...overrides,
  };
}

function makeMappool(entries: { mod: "NM" | "SHIRO" | "TB" }[] = []) {
  return {
    id: "mp-1",
    name: "Pool",
    description: null,
    entries: entries.map((e, i) => ({
      mod: e.mod,
      index: i,
      beatmapID: 1000 + i,
      skill: null,
      selectorID: null,
    })),
  };
}

function makeChecklistInput(overrides: Partial<StartChecklistInput> = {}): StartChecklistInput {
  const red = makeTeam();
  const blue = makeTeam({
    id: "t-blue",
    name: "Blue",
    leaderID: 300,
    strategistID: 400,
    playerIDs: [300, 301, 302, 303],
  });
  return {
    type: "MATCH",
    scheduledAt: "2026-09-01T00:00:00Z",
    refereeUserID: "999",
    settings: {
      streamerUserID: null,
      firstPick: "RED",
      firstBan: "BLUE",
      mpLink: "https://osu.ppy.sh/mp/12345",
      redTeam: red,
      blueTeam: blue,
      mappool: makeMappool([
        { mod: "NM" },
        { mod: "SHIRO" },
        { mod: "TB" },
      ]),
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Constants & labels
// ---------------------------------------------------------------------------

describe("constants", () => {
  it("ROOM_ROUNDS lists the canonical set", () => {
    expect(ROOM_ROUNDS).toEqual(["小组赛", "16强", "8强", "半决赛", "决赛"]);
  });

  it("LIFECYCLE_LABELS covers every MatchLifecycle value", () => {
    const expectedKeys = [
      "READY",
      "RUNNING",
      "SUSPENDED",
      "ADJUDICATION_REQUIRED",
      "FINISHED",
      "ABORTED",
    ];
    for (const k of expectedKeys) {
      expect(LIFECYCLE_LABELS).toHaveProperty(k);
    }
  });

  it("ROOM_TYPE_LABELS covers private / casual / match", () => {
    expect(ROOM_TYPE_LABELS.PRIVATE).toBe("私密");
    expect(ROOM_TYPE_LABELS.CASUAL).toBe("休闲");
    expect(ROOM_TYPE_LABELS.MATCH).toBe("正式赛");
  });

  it("TEAM_SIDE_LABELS covers red / blue", () => {
    expect(TEAM_SIDE_LABELS.RED).toBe("红方");
    expect(TEAM_SIDE_LABELS.BLUE).toBe("蓝方");
  });

  it("PIECE_MOD_LABELS labels Shiro in mixed casing", () => {
    expect(PIECE_MOD_LABELS.SHIRO).toBe("Shiro");
    expect(PIECE_MOD_LABELS.NM).toBe("NM");
  });
});

// ---------------------------------------------------------------------------
// roomStatusChip
// ---------------------------------------------------------------------------

describe("roomStatusChip", () => {
  it("returns 未开局 when matchID is null", () => {
    const chip = roomStatusChip(makeRoom({ matchID: null }));
    expect(chip.label).toBe("未开局");
    expect(chip.tone).toBe("neutral");
  });

  it("returns 已开局 when matchID exists but match is null", () => {
    const chip = roomStatusChip(makeRoom({ matchID: "m1", match: null }));
    expect(chip.label).toBe("已开局");
    expect(chip.tone).toBe("primary");
  });

  it("maps RUNNING to success tone", () => {
    const chip = roomStatusChip(
      makeRoom({ matchID: "m1", match: { snapshot: { lifecycle: "RUNNING" } } }),
    );
    expect(chip.label).toBe("进行中");
    expect(chip.tone).toBe("success");
  });

  it("maps SUSPENDED to warning tone", () => {
    const chip = roomStatusChip(
      makeRoom({ matchID: "m1", match: { snapshot: { lifecycle: "SUSPENDED" } } }),
    );
    expect(chip.tone).toBe("warning");
  });

  it("maps ADJUDICATION_REQUIRED to warning tone", () => {
    const chip = roomStatusChip(
      makeRoom({ matchID: "m1", match: { snapshot: { lifecycle: "ADJUDICATION_REQUIRED" } } }),
    );
    expect(chip.tone).toBe("warning");
  });

  it("maps FINISHED to neutral tone", () => {
    const chip = roomStatusChip(
      makeRoom({ matchID: "m1", match: { snapshot: { lifecycle: "FINISHED" } } }),
    );
    expect(chip.tone).toBe("neutral");
  });

  it("maps ABORTED to danger tone", () => {
    const chip = roomStatusChip(
      makeRoom({ matchID: "m1", match: { snapshot: { lifecycle: "ABORTED" } } }),
    );
    expect(chip.tone).toBe("danger");
  });

  it("maps READY to primary tone", () => {
    const chip = roomStatusChip(
      makeRoom({ matchID: "m1", match: { snapshot: { lifecycle: "READY" } } }),
    );
    expect(chip.tone).toBe("primary");
  });
});

// ---------------------------------------------------------------------------
// Permission checks
// ---------------------------------------------------------------------------

describe("permission helpers", () => {
  it("isAdmin returns true only for ADMIN users", () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(makeUser([]))).toBe(false);
    expect(isAdmin(makeUser(["PLAYER"]))).toBe(false);
    expect(isAdmin(makeUser(["ADMIN"]))).toBe(true);
    expect(isAdmin(makeUser(["ADMIN", "REFEREE"]))).toBe(true);
  });

  it("hasRole matches a single role", () => {
    expect(hasRole(null, "PLAYER")).toBe(false);
    expect(hasRole(makeUser(["PLAYER"]), "PLAYER")).toBe(true);
    expect(hasRole(makeUser(["PLAYER"]), "REFEREE")).toBe(false);
  });

  it("canControlRoom is permissive for admin", () => {
    const user = makeUser(["ADMIN"]);
    const room = makeRoom({ refereeUserID: "999" });
    expect(canControlRoom(user, room)).toBe(true);
  });

  it("canControlRoom is permissive for the designated referee of a match", () => {
    const user = makeUser(["REFEREE"], "999");
    const room = makeRoom({ refereeUserID: "999" });
    expect(canControlRoom(user, room)).toBe(true);
  });

  it("canControlRoom rejects a referee assigned to a different room", () => {
    const user = makeUser(["REFEREE"], "999");
    const room = makeRoom({ refereeUserID: "888" });
    expect(canControlRoom(user, room)).toBe(false);
  });

  it("canControlRoom rejects non-referee / non-admin", () => {
    const user = makeUser(["PLAYER"]);
    const room = makeRoom({ refereeUserID: "999" });
    expect(canControlRoom(user, room)).toBe(false);
  });

  it("showRelatedFilter hides for admins and guests", () => {
    expect(showRelatedFilter(null)).toBe(false);
    expect(showRelatedFilter(makeUser(["ADMIN"]))).toBe(false);
  });

  it("showRelatedFilter shows for PLAYER / STRATEGIST / REFEREE / STREAMER", () => {
    expect(showRelatedFilter(makeUser(["PLAYER"]))).toBe(true);
    expect(showRelatedFilter(makeUser(["STRATEGIST"]))).toBe(true);
    expect(showRelatedFilter(makeUser(["REFEREE"]))).toBe(true);
    expect(showRelatedFilter(makeUser(["STREAMER"]))).toBe(true);
  });

  it("showRelatedFilter hides for users with no room-related roles", () => {
    expect(showRelatedFilter(makeUser(["ADMIN"]))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildStartChecklist — happy path
// ---------------------------------------------------------------------------

describe("buildStartChecklist — fully configured match room", () => {
  const checklist = buildStartChecklist(makeChecklistInput());

  it("returns ok=true when all hard requirements are met", () => {
    expect(checklist.ok).toBe(true);
    expect(checklist.errors).toHaveLength(0);
  });

  it("emits a soft warning for missing streamer", () => {
    expect(checklist.warnings.some((w) => w.field === "settings.streamer_user_id")).toBe(true);
  });

  it("emits 4 groups with stable keys", () => {
    expect(checklist.groups.map((g) => g.key)).toEqual([
      "info",
      "teams",
      "staff",
      "links",
    ]);
  });
});

// ---------------------------------------------------------------------------
// buildStartChecklist — failure cases
// ---------------------------------------------------------------------------

describe("buildStartChecklist — blocking issues", () => {
  it("blocks when scheduled_at is missing", () => {
    const checklist = buildStartChecklist(makeChecklistInput({ scheduledAt: null }));
    expect(checklist.errors.some((e) => e.field === "scheduled_at")).toBe(true);
    expect(checklist.ok).toBe(false);
  });

  it("blocks when red team is missing", () => {
    const checklist = buildStartChecklist(
      makeChecklistInput({
        settings: {
          ...makeChecklistInput().settings,
          redTeam: null,
        },
      }),
    );
    expect(checklist.errors.some((e) => e.field === "settings.red_team_id")).toBe(true);
    expect(checklist.ok).toBe(false);
  });

  it("blocks when red team is not ready (no leader/strategist)", () => {
    const checklist = buildStartChecklist(
      makeChecklistInput({
        settings: {
          ...makeChecklistInput().settings,
          redTeam: makeTeam({ isReady: false }),
        },
      }),
    );
    expect(checklist.errors.some((e) => e.field === "settings.red_team_id")).toBe(true);
  });

  it("blocks when first_pick / first_ban are missing", () => {
    const checklist = buildStartChecklist(
      makeChecklistInput({
        settings: {
          ...makeChecklistInput().settings,
          firstPick: null,
          firstBan: null,
        },
      }),
    );
    expect(checklist.errors.some((e) => e.field === "settings.first_pick")).toBe(true);
    expect(checklist.errors.some((e) => e.field === "settings.first_ban")).toBe(true);
  });

  it("blocks when the match has no MP link", () => {
    const checklist = buildStartChecklist(
      makeChecklistInput({
        settings: {
          ...makeChecklistInput().settings,
          mpLink: null,
        },
      }),
    );
    expect(checklist.errors.some((e) => e.field === "settings.mp_link")).toBe(true);
  });

  it("blocks when the MP link is just whitespace", () => {
    const checklist = buildStartChecklist(
      makeChecklistInput({
        settings: {
          ...makeChecklistInput().settings,
          mpLink: "   ",
        },
      }),
    );
    expect(checklist.errors.some((e) => e.field === "settings.mp_link")).toBe(true);
  });

  it("blocks when no mappool is selected (match only)", () => {
    const checklist = buildStartChecklist(
      makeChecklistInput({
        settings: {
          ...makeChecklistInput().settings,
          mappool: null,
        },
      }),
    );
    expect(checklist.errors.some((e) => e.field === "settings.mappool_id")).toBe(true);
  });

  it("blocks when Shiro slot count is not exactly 1", () => {
    const checklist = buildStartChecklist(
      makeChecklistInput({
        settings: {
          ...makeChecklistInput().settings,
          mappool: makeMappool([{ mod: "NM" }, { mod: "TB" }]),
        },
      }),
    );
    const shiroError = checklist.errors.find((e) => e.label === "Shiro 槽位");
    expect(shiroError).toBeDefined();
  });

  it("blocks when TB slot count is not exactly 1", () => {
    const checklist = buildStartChecklist(
      makeChecklistInput({
        settings: {
          ...makeChecklistInput().settings,
          mappool: makeMappool([{ mod: "NM" }, { mod: "SHIRO" }]),
        },
      }),
    );
    const tbError = checklist.errors.find((e) => e.label === "TB 槽位");
    expect(tbError).toBeDefined();
  });

  it("blocks when the same player appears on both teams", () => {
    const checklist = buildStartChecklist(
      makeChecklistInput({
        settings: {
          ...makeChecklistInput().settings,
          blueTeam: makeTeam({
            id: "t-blue",
            name: "Blue",
            leaderID: 300,
            strategistID: 400,
            // 100 is also on redTeam — duplicate
            playerIDs: [100, 301, 302, 303],
          }),
        },
      }),
    );
    expect(checklist.errors.some((e) => e.field === "settings.players")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildStartChecklist — room type differences
// ---------------------------------------------------------------------------

describe("buildStartChecklist — non-match rooms", () => {
  it("does not require an MP link for casual rooms", () => {
    const checklist = buildStartChecklist(
      makeChecklistInput({
        type: "CASUAL",
        settings: {
          ...makeChecklistInput().settings,
          mpLink: null,
          mappool: null,
        },
      }),
    );
    expect(checklist.errors.some((e) => e.field === "settings.mp_link")).toBe(false);
    expect(checklist.errors.some((e) => e.field === "settings.mappool_id")).toBe(false);
  });

  it("does not require a mappool Shiro / TB slot check for casual rooms", () => {
    const checklist = buildStartChecklist(
      makeChecklistInput({
        type: "CASUAL",
        settings: {
          ...makeChecklistInput().settings,
          mappool: makeMappool([{ mod: "NM" }]),
        },
      }),
    );
    expect(checklist.errors.some((e) => e.label === "Shiro 槽位")).toBe(false);
    expect(checklist.errors.some((e) => e.label === "TB 槽位")).toBe(false);
  });
});