import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MATCH_ERROR_MESSAGES,
  matchErrorMessage,
} from "../../app/rooms/[code]/match/lib/errors";

describe("MATCH_ERROR_MESSAGES", () => {
  it("covers every contract code the UI must translate", () => {
    // These are the codes referenced by the match-command orchestrator; if a
    // new one appears the map must be extended before shipping.
    const codes = [
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
    for (const code of codes) {
      assert.ok(MATCH_ERROR_MESSAGES[code], `missing mapping for ${code}`);
    }
  });
});

describe("matchErrorMessage", () => {
  it("maps a known code to its Chinese message", () => {
    assert.equal(
      matchErrorMessage({ code: "MATCH_VERSION_CONFLICT" }),
      "比赛状态已更新，请稍候重试",
    );
    assert.equal(matchErrorMessage({ code: "NOT_ACTIVE_TEAM" }), "当前不是己方行动回合");
  });

  it("prefers the mapped message over a raw backend message", () => {
    assert.equal(
      matchErrorMessage({ code: "TIMER_EXPIRED", message: "raw internal detail" }),
      "计时器已过期，等待裁判处理",
    );
  });

  it("falls back to the raw message for unknown codes", () => {
    assert.equal(
      matchErrorMessage({ code: "SOME_NEW_CODE", message: "新规则提示" }),
      "新规则提示",
    );
  });

  it("generic fallback appends the raw code for reportability", () => {
    assert.equal(matchErrorMessage({ code: "SOME_NEW_CODE" }), "操作失败（SOME_NEW_CODE）");
  });

  it("never surfaces empty strings", () => {
    assert.equal(matchErrorMessage({ code: "UNKNOWN", message: "" }), "操作失败（UNKNOWN）");
  });
});
