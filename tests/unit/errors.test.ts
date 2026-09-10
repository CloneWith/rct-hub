/**
 * Vitest port of the legacy `node:test` suite for the error-code → Chinese
 * message map. Pure function; no mocks.
 */
import { describe, expect, it } from "vitest";

import { MATCH_ERROR_MESSAGES, matchErrorMessage } from "@/app/rooms/[code]/match/lib/errors";

const EXPECTED_CODES = [
  "INVALID_REQUEST",
  "AUTH_REQUIRED",
  "USER_NOT_VERIFIED",
  "USER_BANNED",
  "GLOBAL_ROLE_REQUIRED",
  "ROOM_ROLE_REQUIRED",
  "ACTION_NOT_ALLOWED",
  "RESOURCE_NOT_FOUND",
  "MATCH_VERSION_CONFLICT",
  "DUPLICATE_COMMAND_MISMATCH",
  "INTERNAL_ERROR",
  "MATCH_LIFECYCLE_CONFLICT",
  "MATCH_PHASE_CONFLICT",
  "NOT_ACTIVE_TEAM",
  "INVALID_POOL_SLOT",
  "POOL_SLOT_UNAVAILABLE",
  "INVALID_BOARD_CELL",
  "INVALID_MOD_ZONE",
  "RESULT_NOT_PENDING",
  "TIMER_EXPIRED",
  "TIMER_PAUSED",
  "TEAM_PAUSE_ALREADY_USED",
  "ROBBERY_NOT_AVAILABLE",
  "ROBBERY_REQUIREMENTS_NOT_MET",
  "ALIGNMENT_OVERLAP",
  "TB_NOT_AVAILABLE",
  "SURRENDER_EVIDENCE_INVALID",
];

describe("MATCH_ERROR_MESSAGES", () => {
  it("covers every contract code the UI must translate", () => {
    for (const code of EXPECTED_CODES) {
      if (!MATCH_ERROR_MESSAGES[code]) {
        throw new Error(`missing mapping for ${code}`);
      }
    }
  });
});

describe("matchErrorMessage", () => {
  it("maps a known code to its Chinese message", () => {
    expect(matchErrorMessage({ code: "MATCH_VERSION_CONFLICT" })).toBe("比赛状态已更新，请稍候重试");
    expect(matchErrorMessage({ code: "NOT_ACTIVE_TEAM" })).toBe("当前不是己方行动回合");
  });

  it("prefers the mapped message over a raw backend message", () => {
    expect(matchErrorMessage({ code: "TIMER_EXPIRED", message: "raw internal detail" })).toBe(
      "计时器已过期，等待裁判处理",
    );
  });

  it("falls back to the raw message for unknown codes", () => {
    expect(matchErrorMessage({ code: "SOME_NEW_CODE", message: "新规则提示" })).toBe("新规则提示");
  });

  it("generic fallback appends the raw code for reportability", () => {
    expect(matchErrorMessage({ code: "SOME_NEW_CODE" })).toBe("操作失败（SOME_NEW_CODE）");
  });

  it("never surfaces empty strings", () => {
    expect(matchErrorMessage({ code: "UNKNOWN", message: "" })).toBe("操作失败（UNKNOWN）");
  });
});