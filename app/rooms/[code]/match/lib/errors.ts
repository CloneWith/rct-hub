/**
 * MatchErrorCode → user-facing Chinese message.
 *
 * The backend returns structured errors (`code` + optional `currentVersion`).
 * The UI must never surface raw callstacks or internal error strings —
 * everything routes through this map. Unknown codes fall back to a generic
 * message with the raw code appended for reportability.
 */

export interface MatchErrorShape {
  code: string;
  message?: string;
  currentVersion?: number | null;
}

export const MATCH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_REQUEST: "请求参数无效",
  AUTH_REQUIRED: "需要登录后才能执行此操作",
  USER_NOT_VERIFIED: "账号尚未通过审核",
  USER_BANNED: "账号已被封禁",
  GLOBAL_ROLE_REQUIRED: "缺少所需的全局角色权限",
  ROOM_ROLE_REQUIRED: "你在此房间中没有执行该操作的权限",
  ACTION_NOT_ALLOWED: "当前状态不允许执行此操作",
  RESOURCE_NOT_FOUND: "资源不存在或已被删除",
  MATCH_VERSION_CONFLICT: "比赛状态已更新，请稍候重试",
  DUPLICATE_COMMAND_MISMATCH: "重复提交的命令内容不一致",
  INTERNAL_ERROR: "服务器开小差了，请稍后重试",
  MATCH_LIFECYCLE_CONFLICT: "比赛当前的生命周期状态不允许此操作",
  MATCH_PHASE_CONFLICT: "比赛当前的阶段不允许此操作",
  NOT_ACTIVE_TEAM: "当前不是己方行动回合",
  INVALID_POOL_SLOT: "无效的图池槽位",
  POOL_SLOT_UNAVAILABLE: "该图池槽位已被禁用或选中",
  INVALID_BOARD_CELL: "无效的棋盘位置",
  INVALID_MOD_ZONE: "该位置不属于此 Mod 的可放置区域",
  RESULT_NOT_PENDING: "当前没有等待确认的比赛结果",
  TIMER_EXPIRED: "计时器已过期，等待裁判处理",
  TIMER_PAUSED: "计时器已暂停",
  TEAM_PAUSE_ALREADY_USED: "该队伍的暂停次数已用完",
  ROBBERY_NOT_AVAILABLE: "当前不满足夺棋条件",
  ROBBERY_REQUIREMENTS_NOT_MET: "夺棋方案不满足规则要求",
  ALIGNMENT_OVERLAP: "目标棋子已参与连线，无法夺棋",
  TB_NOT_AVAILABLE: "当前不满足 TB 条件",
  SURRENDER_EVIDENCE_INVALID: "认输证据不满足要求（需 4 名不同玩家且含队长）",
};

/**
 * Resolve a backend error into a display message.
 * `MATCH_VERSION_CONFLICT` / `TIMER_EXPIRED` callers usually also trigger a
 * snapshot refresh — that behavior lives in the command layer, not here.
 */
export function matchErrorMessage(error: MatchErrorShape): string {
  const mapped = MATCH_ERROR_MESSAGES[error.code];
  if (mapped) return mapped;
  if (error.message) return error.message;
  return `操作失败（${error.code}）`;
}
