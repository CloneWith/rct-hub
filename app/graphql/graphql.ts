/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type BanPoolSlotInput = {
  meta: CommandMeta;
  poolSlotId: string;
};

export type BeatmapMetadataStatus =
  | 'FAILED'
  | 'NOT_CONFIGURED'
  | 'PENDING'
  | 'READY';

export type CalibrateTimerInput = {
  meta: CommandMeta;
  reason: string;
  remainingMilliseconds: number;
};

export type CommandMeta = {
  commandId: string;
  expectedVersion: string;
  matchId: string | number;
};

export type ConfirmBeatmapResultInput = {
  boardPieceId: string;
  meta: CommandMeta;
  winningTeam: TeamSide;
};

export type ConfirmIrcResultInput = {
  boardPieceId: string | number;
  commandId: string;
  expectedVersion: string;
  matchId: string | number;
  observationId: string | number;
  winningTeam: TeamSide;
};

export type ConfirmTbResultInput = {
  meta: CommandMeta;
  winningTeam: TeamSide;
};

export type ForceMod =
  | 'HD'
  | 'HR'
  | 'NM';

export type FormalMatchPhase =
  | 'BAN'
  | 'NONE'
  | 'PICK'
  | 'TB_PLAYING'
  | 'TB_PREPARATION'
  | 'WAITING_FOR_RESULT';

export type IrcJobStatus =
  | 'ACKNOWLEDGED'
  | 'CANCELLED'
  | 'FAILED'
  | 'PENDING'
  | 'SENDING'
  | 'SENT';

export type IrcReviewStatus =
  | 'CONFIRMED'
  | 'CONFIRMING'
  | 'PENDING'
  | 'REJECTED';

export type MatchAction =
  | 'ABORT_MATCH'
  | 'BAN_POOL_SLOT'
  | 'CALIBRATE_TIMER'
  | 'CONFIRM_BEATMAP_RESULT'
  | 'CONFIRM_TB_RESULT'
  | 'GRANT_ADDITIONAL_TIME'
  | 'PAUSE_TIMER'
  | 'PLACE_PIECE'
  | 'PLACE_SHIRO'
  | 'RECORD_SURRENDER'
  | 'REQUEST_TB'
  | 'RESPOND_TB_REQUEST'
  | 'RESUME_MATCH'
  | 'RESUME_TIMER'
  | 'ROB_PIECE'
  | 'SKIP_CURRENT_ACTION'
  | 'START_MATCH'
  | 'START_TB'
  | 'SUSPEND_MATCH';

export type MatchActorCapability =
  | 'CAPTAIN'
  | 'REFEREE'
  | 'STRATEGIST';

export type MatchCommandDisposition =
  | 'APPLIED'
  | 'REPLAYED';

export type MatchErrorCode =
  | 'ACTION_NOT_ALLOWED'
  | 'ALIGNMENT_OVERLAP'
  | 'AUTH_REQUIRED'
  | 'DUPLICATE_COMMAND_MISMATCH'
  | 'GLOBAL_ROLE_REQUIRED'
  | 'INTERNAL_ERROR'
  | 'INVALID_BOARD_CELL'
  | 'INVALID_MOD_ZONE'
  | 'INVALID_POOL_SLOT'
  | 'INVALID_REQUEST'
  | 'MATCH_LIFECYCLE_CONFLICT'
  | 'MATCH_PHASE_CONFLICT'
  | 'MATCH_VERSION_CONFLICT'
  | 'NOT_ACTIVE_TEAM'
  | 'POOL_SLOT_UNAVAILABLE'
  | 'RESOURCE_NOT_FOUND'
  | 'RESULT_NOT_PENDING'
  | 'ROBBERY_NOT_AVAILABLE'
  | 'ROBBERY_REQUIREMENTS_NOT_MET'
  | 'ROOM_ROLE_REQUIRED'
  | 'SURRENDER_EVIDENCE_INVALID'
  | 'TB_NOT_AVAILABLE'
  | 'TEAM_PAUSE_ALREADY_USED'
  | 'TIMER_EXPIRED'
  | 'TIMER_PAUSED'
  | 'USER_BANNED'
  | 'USER_NOT_VERIFIED';

export type MatchEventType =
  | 'ACTION_SKIPPED'
  | 'ADDITIONAL_TIME_GRANTED'
  | 'ADJUDICATION_REQUIRED'
  | 'BAN_PHASE_STARTED'
  | 'BEATMAP_RESULT_CONFIRMED'
  | 'MATCH_ABORTED'
  | 'MATCH_FINISHED'
  | 'MATCH_RESUMED'
  | 'MATCH_STARTED'
  | 'MATCH_SUSPENDED'
  | 'PICK_PHASE_STARTED'
  | 'PIECES_SACRIFICED'
  | 'PIECE_PLACED'
  | 'PIECE_ROBBED'
  | 'PIECE_WON'
  | 'POOL_SLOT_BANNED'
  | 'REFEREE_PROXY_ACTION_RECORDED'
  | 'RESULT_CONFIRMATION_REQUESTED'
  | 'SHIRO_PLACED'
  | 'STALEMATE_DETECTED'
  | 'SURRENDER_RECORDED'
  | 'TB_FORCED'
  | 'TB_PREPARATION_STARTED'
  | 'TB_REQUESTED'
  | 'TB_REQUEST_ACCEPTED'
  | 'TB_REQUEST_EXPIRED'
  | 'TB_REQUEST_REJECTED'
  | 'TB_RESULT_CONFIRMED'
  | 'TB_STARTED'
  | 'TIMER_CALIBRATED'
  | 'TIMER_PAUSED'
  | 'TIMER_RESUMED'
  | 'TIMER_STARTED'
  | 'TIMER_STOPPED'
  | 'TURN_ADVANCED';

export type MatchLifecycle =
  | 'ABORTED'
  | 'ADJUDICATION_REQUIRED'
  | 'FINISHED'
  | 'READY'
  | 'RUNNING'
  | 'SUSPENDED';

export type PieceMod =
  | 'DT'
  | 'FM'
  | 'HD'
  | 'HR'
  | 'NM'
  | 'SHIRO'
  | 'TB';

export type PieceState =
  | 'BANNED'
  | 'DEAD'
  | 'NORMAL'
  | 'PICKED'
  | 'WON';

export type PlacePieceInput = {
  meta: CommandMeta;
  poolSlotId: string;
  position: PositionInput;
};

export type PlaceShiroInput = {
  meta: CommandMeta;
  position: PositionInput;
};

export type PositionInput = {
  col: number;
  row: number;
};

export type ReasonCommandInput = {
  meta: CommandMeta;
  reason: string;
};

export type RecordSurrenderInput = {
  confirmingPlayerIds: Array<string | number>;
  meta: CommandMeta;
  reason: string;
  surrenderingTeam: TeamSide;
};

export type RefereeBanPoolSlotInput = {
  actingTeam: TeamSide;
  meta: CommandMeta;
  poolSlotId: string;
  reason: string;
};

export type RefereePlacePieceInput = {
  actingTeam: TeamSide;
  meta: CommandMeta;
  poolSlotId: string;
  position: PositionInput;
  reason: string;
};

export type RefereePlaceShiroInput = {
  actingTeam: TeamSide;
  meta: CommandMeta;
  position: PositionInput;
  reason: string;
};

export type RefereeRequestTbInput = {
  actingTeam: TeamSide;
  meta: CommandMeta;
  reason: string;
  requestId: string;
};

export type RefereeRespondTbRequestInput = {
  accept: boolean;
  actingTeam: TeamSide;
  meta: CommandMeta;
  reason: string;
  requestId: string;
};

export type RefereeRobPieceInput = {
  actingTeam: TeamSide;
  meta: CommandMeta;
  reason: string;
  sacrificeSets: Array<Array<string>>;
  targetPieceId: string;
};

export type RequestTbInput = {
  meta: CommandMeta;
  requestId: string;
};

export type RespondTbRequestInput = {
  accept: boolean;
  meta: CommandMeta;
  requestId: string;
};

export type RetryIrcJobInput = {
  jobID: string | number;
  matchID: string | number;
};

export type RetryMatchAutomationInput = {
  eventID: string | number;
  matchID: string | number;
};

export type RobPieceInput = {
  meta: CommandMeta;
  sacrificeSets: Array<Array<string>>;
  targetPieceId: string;
};

export type RoomType =
  | 'CASUAL'
  | 'MATCH'
  | 'PRIVATE';

export type TeamSide =
  | 'BLUE'
  | 'RED';

export type UserRole =
  | 'ADMIN'
  | 'PLAYER'
  | 'REFEREE'
  | 'STRATEGIST'
  | 'STREAMER';

export type VerifyStatus =
  | 'PENDING'
  | 'UNVERIFIED'
  | 'VERIFIED';

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: string, onlineID: string, username: string, countryCode: string, roles: Array<UserRole>, verifyStatus: VerifyStatus, isBanned: boolean, globalRank: number | null, pp: number | null, avatarUrl: string } | null };

export type UsersQueryVariables = Exact<{
  page?: number | null | undefined;
  perPage?: number | null | undefined;
}>;


export type UsersQuery = { users: { page: number, perPage: number, total: number, totalPages: number, items: Array<{ id: string, onlineID: string, username: string, countryCode: string, roles: Array<UserRole>, verifyStatus: VerifyStatus, isBanned: boolean, globalRank: number | null, pp: number | null, avatarUrl: string }> } };

export type RoomsQueryVariables = Exact<{
  type?: RoomType | null | undefined;
  search?: string | null | undefined;
  round?: string | null | undefined;
  status?: MatchLifecycle | null | undefined;
  relatedToMe?: boolean | null | undefined;
  page?: number | null | undefined;
  perPage?: number | null | undefined;
}>;


export type RoomsQuery = { rooms: { page: number, perPage: number, total: number, totalPages: number, items: Array<{ id: string, code: string, name: string, type: RoomType, round: string, scheduledAt: string | null, createdAt: string, ownerID: string, refereeUserID: string | null, matchID: string | null, owner: { id: string, onlineID: string, username: string, avatarUrl: string } | null, match: { snapshot: { lifecycle: MatchLifecycle } } | null, settings: { redStrategistUserID: string | null, blueStrategistUserID: string | null, streamerUserID: string | null, firstPick: TeamSide | null, firstBan: TeamSide | null, redLeader: string | null, blueLeader: string | null, redPlayers: Array<string>, bluePlayers: Array<string>, mpLink: string | null, streamLink: string | null } }> } };

export type RoomByCodeQueryVariables = Exact<{
  code: string;
}>;


export type RoomByCodeQuery = { roomByCode: { id: string, code: string, name: string, type: RoomType, round: string, scheduledAt: string | null, createdAt: string, ownerID: string, refereeUserID: string | null, matchID: string | null, owner: { id: string, onlineID: string, username: string, avatarUrl: string } | null, referee: { id: string, onlineID: string, username: string, avatarUrl: string } | null, match: { snapshot: { lifecycle: MatchLifecycle } } | null, settings: { redStrategistUserID: string | null, blueStrategistUserID: string | null, streamerUserID: string | null, firstPick: TeamSide | null, firstBan: TeamSide | null, redPlayers: Array<string>, bluePlayers: Array<string>, redLeader: string | null, blueLeader: string | null, mpLink: string | null, streamLink: string | null, redStrategist: { id: string, onlineID: string, username: string, avatarUrl: string } | null, blueStrategist: { id: string, onlineID: string, username: string, avatarUrl: string } | null, streamer: { id: string, onlineID: string, username: string, avatarUrl: string } | null, mappool: { slots: Array<{ mod: PieceMod, pieces: Array<{ mod: PieceMod, index: number, beatmapID: string | null, state: PieceState }> }> } } } | null };

export type MatchByCodeQueryVariables = Exact<{
  code: string;
}>;


export type MatchByCodeQuery = { matchByCode: { id: string, code: string, name: string, roomType: RoomType, room: { name: string, round: string, settings: { mpLink: string | null } } | null, pool: Array<{ poolSlotID: string, metadataStatus: BeatmapMetadataStatus, beatmap: { onlineID: string, title: string, artist: string, difficultyName: string, starRating: number, bpm: number, totalLength: number, coverUrl: string } | null }>, snapshot: { version: string, lifecycle: MatchLifecycle, phase: FormalMatchPhase, turn: number, activeTeam: TeamSide | null, wonCounts: { red: number, blue: number } }, strategistView: { isMyTurn: boolean, myTeam: TeamSide, analysis: { allowedActions: Array<MatchAction>, banPoolSlotIDs: Array<string>, shiroCells: Array<string>, pendingTBRequestID: string | null, canAcceptTBRequest: boolean, canRejectTBRequest: boolean, tbRequestTeams: Array<TeamSide>, tbResponseTeams: Array<TeamSide>, legalPlacements: Array<{ poolSlotID: string, cell: string, forceMod: ForceMod | null }>, robberyPlans: Array<{ targetPieceID: string, sacrificeSets: Array<Array<string>> }> } } | null, captainView: { myTeam: TeamSide, analysis: { allowedActions: Array<MatchAction>, banPoolSlotIDs: Array<string>, shiroCells: Array<string>, pendingTBRequestID: string | null, canAcceptTBRequest: boolean, canRejectTBRequest: boolean, tbRequestTeams: Array<TeamSide>, tbResponseTeams: Array<TeamSide>, legalPlacements: Array<{ poolSlotID: string, cell: string, forceMod: ForceMod | null }>, robberyPlans: Array<{ targetPieceID: string, sacrificeSets: Array<Array<string>> }> } } | null, refereeView: { matchID: string, suspensionReason: string | null, abortReason: string | null, analysis: { allowedActions: Array<MatchAction>, banPoolSlotIDs: Array<string>, shiroCells: Array<string>, pendingTBRequestID: string | null, canAcceptTBRequest: boolean, canRejectTBRequest: boolean, tbRequestTeams: Array<TeamSide>, tbResponseTeams: Array<TeamSide>, legalPlacements: Array<{ poolSlotID: string, cell: string, forceMod: ForceMod | null }>, robberyPlans: Array<{ targetPieceID: string, sacrificeSets: Array<Array<string>> }> }, auditLog: Array<{ actionId: string, sequence: string, commandType: string, previousVersion: string, resultingVersion: string, timestamp: string, reason: string | null, actor: { osuID: string, capability: MatchActorCapability, team: TeamSide | null, adminOverride: boolean, refereeOverride: boolean } }>, automationIssues: Array<{ eventID: string, sequence: string, eventType: MatchEventType, attempts: number, lastError: string, occurredAt: string }> } | null } | null };

export type BanPoolSlotMutationVariables = Exact<{
  input: BanPoolSlotInput;
}>;


export type BanPoolSlotMutation = { banPoolSlot: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type PlacePieceMutationVariables = Exact<{
  input: PlacePieceInput;
}>;


export type PlacePieceMutation = { placePiece: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type PlaceShiroMutationVariables = Exact<{
  input: PlaceShiroInput;
}>;


export type PlaceShiroMutation = { placeShiro: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type RobPieceMutationVariables = Exact<{
  input: RobPieceInput;
}>;


export type RobPieceMutation = { robPiece: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type RequestTbMutationVariables = Exact<{
  input: RequestTbInput;
}>;


export type RequestTbMutation = { requestTb: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type RespondTbRequestMutationVariables = Exact<{
  input: RespondTbRequestInput;
}>;


export type RespondTbRequestMutation = { respondTbRequest: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type StartMatchMutationVariables = Exact<{
  input: CommandMeta;
}>;


export type StartMatchMutation = { startMatch: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type RefereeBanPoolSlotMutationVariables = Exact<{
  input: RefereeBanPoolSlotInput;
}>;


export type RefereeBanPoolSlotMutation = { refereeBanPoolSlot: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type RefereePlacePieceMutationVariables = Exact<{
  input: RefereePlacePieceInput;
}>;


export type RefereePlacePieceMutation = { refereePlacePiece: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type RefereePlaceShiroMutationVariables = Exact<{
  input: RefereePlaceShiroInput;
}>;


export type RefereePlaceShiroMutation = { refereePlaceShiro: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type RefereeRobPieceMutationVariables = Exact<{
  input: RefereeRobPieceInput;
}>;


export type RefereeRobPieceMutation = { refereeRobPiece: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type RefereeRequestTbMutationVariables = Exact<{
  input: RefereeRequestTbInput;
}>;


export type RefereeRequestTbMutation = { refereeRequestTb: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type RefereeRespondTbRequestMutationVariables = Exact<{
  input: RefereeRespondTbRequestInput;
}>;


export type RefereeRespondTbRequestMutation = { refereeRespondTbRequest: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type ConfirmBeatmapResultMutationVariables = Exact<{
  input: ConfirmBeatmapResultInput;
}>;


export type ConfirmBeatmapResultMutation = { confirmBeatmapResult: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type ConfirmTbResultMutationVariables = Exact<{
  input: ConfirmTbResultInput;
}>;


export type ConfirmTbResultMutation = { confirmTbResult: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type GrantAdditionalTimeMutationVariables = Exact<{
  input: ReasonCommandInput;
}>;


export type GrantAdditionalTimeMutation = { grantAdditionalTime: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type CalibrateTimerMutationVariables = Exact<{
  input: CalibrateTimerInput;
}>;


export type CalibrateTimerMutation = { calibrateTimer: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type PauseTimerMutationVariables = Exact<{
  input: ReasonCommandInput;
}>;


export type PauseTimerMutation = { pauseTimer: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type ResumeTimerMutationVariables = Exact<{
  input: ReasonCommandInput;
}>;


export type ResumeTimerMutation = { resumeTimer: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type SuspendMatchMutationVariables = Exact<{
  input: ReasonCommandInput;
}>;


export type SuspendMatchMutation = { suspendMatch: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type ResumeMatchMutationVariables = Exact<{
  input: ReasonCommandInput;
}>;


export type ResumeMatchMutation = { resumeMatch: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type SkipCurrentActionMutationVariables = Exact<{
  input: ReasonCommandInput;
}>;


export type SkipCurrentActionMutation = { skipCurrentAction: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type AbortMatchMutationVariables = Exact<{
  input: ReasonCommandInput;
}>;


export type AbortMatchMutation = { abortMatch: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type StartTbMutationVariables = Exact<{
  input: ReasonCommandInput;
}>;


export type StartTbMutation = { startTb: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type RecordSurrenderMutationVariables = Exact<{
  input: RecordSurrenderInput;
}>;


export type RecordSurrenderMutation = { recordSurrender: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type ConfirmIrcResultMutationVariables = Exact<{
  input: ConfirmIrcResultInput;
}>;


export type ConfirmIrcResultMutation = { confirmIRCResult: { success: boolean, commandId: string, disposition: MatchCommandDisposition | null, previousVersion: string | null, resultingVersion: string | null, currentVersion: string | null, error: { code: MatchErrorCode, message: string, currentVersion: string | null } | null } };

export type RejectIrcObservationMutationVariables = Exact<{
  matchId: string | number;
  observationId: string | number;
  reason: string;
}>;


export type RejectIrcObservationMutation = { rejectIRCObservation: boolean };

export type RetryMatchAutomationMutationVariables = Exact<{
  input: RetryMatchAutomationInput;
}>;


export type RetryMatchAutomationMutation = { retryMatchAutomation: boolean };

export type RetryIrcJobMutationVariables = Exact<{
  input: RetryIrcJobInput;
}>;


export type RetryIrcJobMutation = { retryIRCJob: boolean };

export type IrcConnectionStatusQueryVariables = Exact<{
  matchId: string | number;
}>;


export type IrcConnectionStatusQuery = { ircConnectionStatus: { configured: boolean, connected: boolean, degraded: boolean, lastError: string | null } };

export type IrcObservationsQueryVariables = Exact<{
  matchId: string | number;
  channel: string;
}>;


export type IrcObservationsQuery = { ircObservations: Array<{ id: string, channel: string, sender: string, command: string, raw: string, observedAt: string, reviewStatus: IrcReviewStatus, reviewReason: string | null, suggestedResult: { winningTeam: TeamSide, boardPieceID: string } | null }> };

export type IrcJobsQueryVariables = Exact<{
  matchId: string | number;
}>;


export type IrcJobsQuery = { ircJobs: Array<{ id: string, channel: string, kind: string, payload: string, status: IrcJobStatus, attempts: number, automaticRetry: boolean, nextTryAt: string | null, sentAt: string | null, ackDeadline: string | null, acknowledgedAt: string | null, lastError: string | null }> };

export type AnnouncementsQueryVariables = Exact<{
  page?: number | null | undefined;
  perPage?: number | null | undefined;
}>;


export type AnnouncementsQuery = { announcements: { page: number, perPage: number, total: number, totalPages: number, items: Array<{ id: string, pinned: boolean, visible: boolean, title: string, content: string, publishedAt: string | null, createdAt: string, author: { id: string, onlineID: string, username: string, avatarUrl: string } | null }> } };

export type BeatmapsQueryVariables = Exact<{
  page?: number | null | undefined;
  perPage?: number | null | undefined;
}>;


export type BeatmapsQuery = { beatmaps: { page: number, perPage: number, total: number, totalPages: number, items: Array<{ id: string, onlineID: string, title: string, artist: string, bpm: number, status: string, modString: string, modIndex: number, version: string, difficultyRating: number, coverUrl: string }> } };

export type BeatmapByOsuIdQueryVariables = Exact<{
  osuId: number;
}>;


export type BeatmapByOsuIdQuery = { beatmapByOsuId: { id: string, onlineID: string, title: string, artist: string, bpm: number, status: string, modString: string, modIndex: number, version: string, difficultyRating: number, coverUrl: string } | null };

export type TeamsQueryVariables = Exact<{
  page?: number | null | undefined;
  perPage?: number | null | undefined;
  search?: string | null | undefined;
}>;


export type TeamsQuery = { teams: { page: number, perPage: number, total: number, totalPages: number, items: Array<{ id: string, name: string, description: string | null, seed: string | null, leaderID: number | null, strategistID: number | null, playerIDs: Array<number>, isReady: boolean, createdAt: string, updatedAt: string, leader: { id: string, onlineID: string, username: string, avatarUrl: string } | null, strategist: { id: string, onlineID: string, username: string, avatarUrl: string } | null, players: Array<{ id: string, onlineID: string, username: string, avatarUrl: string }> }> } };

export type MappoolsQueryVariables = Exact<{
  page?: number | null | undefined;
  perPage?: number | null | undefined;
  search?: string | null | undefined;
}>;


export type MappoolsQuery = { mappools: { page: number, perPage: number, total: number, totalPages: number, items: Array<{ id: string, name: string, description: string | null, createdAt: string, updatedAt: string, entries: Array<{ mod: PieceMod, index: number, beatmapID: number | null, selectorID: number | null, skill: string | null, beatmap: { id: string, onlineID: string, title: string, artist: string, version: string, difficultyRating: number } | null, selector: { id: string, onlineID: string, username: string } | null }> }> } };

export type UserByOsuIdQueryVariables = Exact<{
  osuId: number;
}>;


export type UserByOsuIdQuery = { userByOsuId: { id: string, onlineID: string, username: string, countryCode: string, roles: Array<UserRole>, verifyStatus: VerifyStatus, isBanned: boolean, globalRank: number | null, pp: number | null, avatarUrl: string } };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const MeDocument = new TypedDocumentString(`
    query Me {
  me {
    id
    onlineID
    username
    avatarUrl: avatarURL
    countryCode
    roles
    verifyStatus
    isBanned
    globalRank
    pp
  }
}
    `) as unknown as TypedDocumentString<MeQuery, MeQueryVariables>;
export const UsersDocument = new TypedDocumentString(`
    query Users($page: Int, $perPage: Int) {
  users(page: $page, perPage: $perPage) {
    items {
      id
      onlineID
      username
      avatarUrl: avatarURL
      countryCode
      roles
      verifyStatus
      isBanned
      globalRank
      pp
    }
    page
    perPage
    total
    totalPages
  }
}
    `) as unknown as TypedDocumentString<UsersQuery, UsersQueryVariables>;
export const RoomsDocument = new TypedDocumentString(`
    query Rooms($type: RoomType, $search: String, $round: String, $status: MatchLifecycle, $relatedToMe: Boolean, $page: Int, $perPage: Int) {
  rooms(
    type: $type
    search: $search
    round: $round
    status: $status
    relatedToMe: $relatedToMe
    page: $page
    perPage: $perPage
  ) {
    items {
      id
      code
      name
      type
      round
      scheduledAt
      createdAt
      ownerID
      owner {
        id
        onlineID
        username
        avatarUrl: avatarURL
      }
      refereeUserID
      matchID
      match {
        snapshot {
          lifecycle
        }
      }
      settings {
        redStrategistUserID
        blueStrategistUserID
        streamerUserID
        firstPick
        firstBan
        redLeader
        blueLeader
        redPlayers
        bluePlayers
        mpLink
        streamLink
      }
    }
    page
    perPage
    total
    totalPages
  }
}
    `) as unknown as TypedDocumentString<RoomsQuery, RoomsQueryVariables>;
export const RoomByCodeDocument = new TypedDocumentString(`
    query RoomByCode($code: String!) {
  roomByCode(code: $code) {
    id
    code
    name
    type
    round
    scheduledAt
    createdAt
    ownerID
    owner {
      id
      onlineID
      username
      avatarUrl: avatarURL
    }
    refereeUserID
    referee {
      id
      onlineID
      username
      avatarUrl: avatarURL
    }
    matchID
    match {
      snapshot {
        lifecycle
      }
    }
    settings {
      redStrategistUserID
      redStrategist {
        id
        onlineID
        username
        avatarUrl: avatarURL
      }
      blueStrategistUserID
      blueStrategist {
        id
        onlineID
        username
        avatarUrl: avatarURL
      }
      streamerUserID
      streamer {
        id
        onlineID
        username
        avatarUrl: avatarURL
      }
      firstPick
      firstBan
      redPlayers
      bluePlayers
      redLeader
      blueLeader
      mpLink
      streamLink
      mappool {
        slots {
          mod
          pieces {
            mod
            index
            beatmapID
            state
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<RoomByCodeQuery, RoomByCodeQueryVariables>;
export const MatchByCodeDocument = new TypedDocumentString(`
    query MatchByCode($code: String!) {
  matchByCode(code: $code) {
    id
    code
    name
    roomType
    room {
      name
      round
      settings {
        mpLink
      }
    }
    pool {
      poolSlotID
      metadataStatus
      beatmap {
        onlineID
        title
        artist
        difficultyName
        starRating
        bpm
        totalLength
        coverUrl: coverURL
      }
    }
    snapshot {
      version
      lifecycle
      phase
      turn
      activeTeam
      wonCounts {
        red
        blue
      }
    }
    strategistView {
      isMyTurn
      myTeam
      analysis {
        allowedActions
        banPoolSlotIDs
        legalPlacements {
          poolSlotID
          cell
          forceMod
        }
        shiroCells
        robberyPlans {
          targetPieceID
          sacrificeSets
        }
        pendingTBRequestID
        canAcceptTBRequest
        canRejectTBRequest
        tbRequestTeams
        tbResponseTeams
      }
    }
    captainView {
      myTeam
      analysis {
        allowedActions
        banPoolSlotIDs
        legalPlacements {
          poolSlotID
          cell
          forceMod
        }
        shiroCells
        robberyPlans {
          targetPieceID
          sacrificeSets
        }
        pendingTBRequestID
        canAcceptTBRequest
        canRejectTBRequest
        tbRequestTeams
        tbResponseTeams
      }
    }
    refereeView {
      matchID
      analysis {
        allowedActions
        banPoolSlotIDs
        legalPlacements {
          poolSlotID
          cell
          forceMod
        }
        shiroCells
        robberyPlans {
          targetPieceID
          sacrificeSets
        }
        pendingTBRequestID
        canAcceptTBRequest
        canRejectTBRequest
        tbRequestTeams
        tbResponseTeams
      }
      suspensionReason
      abortReason
      auditLog(limit: 50) {
        actionId
        sequence
        actor {
          osuID
          capability
          team
          adminOverride
          refereeOverride
        }
        commandType
        previousVersion
        resultingVersion
        timestamp
        reason
      }
      automationIssues(limit: 50) {
        eventID
        sequence
        eventType
        attempts
        lastError
        occurredAt
      }
    }
  }
}
    `) as unknown as TypedDocumentString<MatchByCodeQuery, MatchByCodeQueryVariables>;
export const BanPoolSlotDocument = new TypedDocumentString(`
    mutation BanPoolSlot($input: BanPoolSlotInput!) {
  banPoolSlot(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<BanPoolSlotMutation, BanPoolSlotMutationVariables>;
export const PlacePieceDocument = new TypedDocumentString(`
    mutation PlacePiece($input: PlacePieceInput!) {
  placePiece(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<PlacePieceMutation, PlacePieceMutationVariables>;
export const PlaceShiroDocument = new TypedDocumentString(`
    mutation PlaceShiro($input: PlaceShiroInput!) {
  placeShiro(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<PlaceShiroMutation, PlaceShiroMutationVariables>;
export const RobPieceDocument = new TypedDocumentString(`
    mutation RobPiece($input: RobPieceInput!) {
  robPiece(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<RobPieceMutation, RobPieceMutationVariables>;
export const RequestTbDocument = new TypedDocumentString(`
    mutation RequestTb($input: RequestTbInput!) {
  requestTb(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<RequestTbMutation, RequestTbMutationVariables>;
export const RespondTbRequestDocument = new TypedDocumentString(`
    mutation RespondTbRequest($input: RespondTbRequestInput!) {
  respondTbRequest(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<RespondTbRequestMutation, RespondTbRequestMutationVariables>;
export const StartMatchDocument = new TypedDocumentString(`
    mutation StartMatch($input: CommandMeta!) {
  startMatch(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<StartMatchMutation, StartMatchMutationVariables>;
export const RefereeBanPoolSlotDocument = new TypedDocumentString(`
    mutation RefereeBanPoolSlot($input: RefereeBanPoolSlotInput!) {
  refereeBanPoolSlot(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<RefereeBanPoolSlotMutation, RefereeBanPoolSlotMutationVariables>;
export const RefereePlacePieceDocument = new TypedDocumentString(`
    mutation RefereePlacePiece($input: RefereePlacePieceInput!) {
  refereePlacePiece(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<RefereePlacePieceMutation, RefereePlacePieceMutationVariables>;
export const RefereePlaceShiroDocument = new TypedDocumentString(`
    mutation RefereePlaceShiro($input: RefereePlaceShiroInput!) {
  refereePlaceShiro(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<RefereePlaceShiroMutation, RefereePlaceShiroMutationVariables>;
export const RefereeRobPieceDocument = new TypedDocumentString(`
    mutation RefereeRobPiece($input: RefereeRobPieceInput!) {
  refereeRobPiece(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<RefereeRobPieceMutation, RefereeRobPieceMutationVariables>;
export const RefereeRequestTbDocument = new TypedDocumentString(`
    mutation RefereeRequestTb($input: RefereeRequestTbInput!) {
  refereeRequestTb(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<RefereeRequestTbMutation, RefereeRequestTbMutationVariables>;
export const RefereeRespondTbRequestDocument = new TypedDocumentString(`
    mutation RefereeRespondTbRequest($input: RefereeRespondTbRequestInput!) {
  refereeRespondTbRequest(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<RefereeRespondTbRequestMutation, RefereeRespondTbRequestMutationVariables>;
export const ConfirmBeatmapResultDocument = new TypedDocumentString(`
    mutation ConfirmBeatmapResult($input: ConfirmBeatmapResultInput!) {
  confirmBeatmapResult(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<ConfirmBeatmapResultMutation, ConfirmBeatmapResultMutationVariables>;
export const ConfirmTbResultDocument = new TypedDocumentString(`
    mutation ConfirmTbResult($input: ConfirmTbResultInput!) {
  confirmTbResult(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<ConfirmTbResultMutation, ConfirmTbResultMutationVariables>;
export const GrantAdditionalTimeDocument = new TypedDocumentString(`
    mutation GrantAdditionalTime($input: ReasonCommandInput!) {
  grantAdditionalTime(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<GrantAdditionalTimeMutation, GrantAdditionalTimeMutationVariables>;
export const CalibrateTimerDocument = new TypedDocumentString(`
    mutation CalibrateTimer($input: CalibrateTimerInput!) {
  calibrateTimer(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<CalibrateTimerMutation, CalibrateTimerMutationVariables>;
export const PauseTimerDocument = new TypedDocumentString(`
    mutation PauseTimer($input: ReasonCommandInput!) {
  pauseTimer(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<PauseTimerMutation, PauseTimerMutationVariables>;
export const ResumeTimerDocument = new TypedDocumentString(`
    mutation ResumeTimer($input: ReasonCommandInput!) {
  resumeTimer(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<ResumeTimerMutation, ResumeTimerMutationVariables>;
export const SuspendMatchDocument = new TypedDocumentString(`
    mutation SuspendMatch($input: ReasonCommandInput!) {
  suspendMatch(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<SuspendMatchMutation, SuspendMatchMutationVariables>;
export const ResumeMatchDocument = new TypedDocumentString(`
    mutation ResumeMatch($input: ReasonCommandInput!) {
  resumeMatch(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<ResumeMatchMutation, ResumeMatchMutationVariables>;
export const SkipCurrentActionDocument = new TypedDocumentString(`
    mutation SkipCurrentAction($input: ReasonCommandInput!) {
  skipCurrentAction(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<SkipCurrentActionMutation, SkipCurrentActionMutationVariables>;
export const AbortMatchDocument = new TypedDocumentString(`
    mutation AbortMatch($input: ReasonCommandInput!) {
  abortMatch(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<AbortMatchMutation, AbortMatchMutationVariables>;
export const StartTbDocument = new TypedDocumentString(`
    mutation StartTb($input: ReasonCommandInput!) {
  startTb(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<StartTbMutation, StartTbMutationVariables>;
export const RecordSurrenderDocument = new TypedDocumentString(`
    mutation RecordSurrender($input: RecordSurrenderInput!) {
  recordSurrender(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<RecordSurrenderMutation, RecordSurrenderMutationVariables>;
export const ConfirmIrcResultDocument = new TypedDocumentString(`
    mutation ConfirmIRCResult($input: ConfirmIRCResultInput!) {
  confirmIRCResult(input: $input) {
    success
    commandId
    disposition
    previousVersion
    resultingVersion
    currentVersion
    error {
      code
      message
      currentVersion
    }
  }
}
    `) as unknown as TypedDocumentString<ConfirmIrcResultMutation, ConfirmIrcResultMutationVariables>;
export const RejectIrcObservationDocument = new TypedDocumentString(`
    mutation RejectIRCObservation($matchId: ID!, $observationId: ID!, $reason: String!) {
  rejectIRCObservation(
    matchId: $matchId
    observationId: $observationId
    reason: $reason
  )
}
    `) as unknown as TypedDocumentString<RejectIrcObservationMutation, RejectIrcObservationMutationVariables>;
export const RetryMatchAutomationDocument = new TypedDocumentString(`
    mutation RetryMatchAutomation($input: RetryMatchAutomationInput!) {
  retryMatchAutomation(input: $input)
}
    `) as unknown as TypedDocumentString<RetryMatchAutomationMutation, RetryMatchAutomationMutationVariables>;
export const RetryIrcJobDocument = new TypedDocumentString(`
    mutation RetryIRCJob($input: RetryIRCJobInput!) {
  retryIRCJob(input: $input)
}
    `) as unknown as TypedDocumentString<RetryIrcJobMutation, RetryIrcJobMutationVariables>;
export const IrcConnectionStatusDocument = new TypedDocumentString(`
    query IrcConnectionStatus($matchId: ID!) {
  ircConnectionStatus(matchId: $matchId) {
    configured
    connected
    degraded
    lastError
  }
}
    `) as unknown as TypedDocumentString<IrcConnectionStatusQuery, IrcConnectionStatusQueryVariables>;
export const IrcObservationsDocument = new TypedDocumentString(`
    query IrcObservations($matchId: ID!, $channel: String!) {
  ircObservations(matchId: $matchId, channel: $channel) {
    id
    channel
    sender
    command
    raw
    observedAt
    reviewStatus
    reviewReason
    suggestedResult {
      winningTeam
      boardPieceID
    }
  }
}
    `) as unknown as TypedDocumentString<IrcObservationsQuery, IrcObservationsQueryVariables>;
export const IrcJobsDocument = new TypedDocumentString(`
    query IrcJobs($matchId: ID!) {
  ircJobs(matchId: $matchId) {
    id
    channel
    kind
    payload
    status
    attempts
    automaticRetry
    nextTryAt
    sentAt
    ackDeadline
    acknowledgedAt
    lastError
  }
}
    `) as unknown as TypedDocumentString<IrcJobsQuery, IrcJobsQueryVariables>;
export const AnnouncementsDocument = new TypedDocumentString(`
    query Announcements($page: Int, $perPage: Int) {
  announcements(page: $page, perPage: $perPage) {
    items {
      id
      pinned
      visible
      title
      content
      author {
        id
        onlineID
        username
        avatarUrl: avatarURL
      }
      publishedAt
      createdAt
    }
    page
    perPage
    total
    totalPages
  }
}
    `) as unknown as TypedDocumentString<AnnouncementsQuery, AnnouncementsQueryVariables>;
export const BeatmapsDocument = new TypedDocumentString(`
    query Beatmaps($page: Int, $perPage: Int) {
  beatmaps(page: $page, perPage: $perPage) {
    items {
      id
      onlineID
      title
      artist
      version: difficultyName
      difficultyRating: starRating
      bpm
      status
      modString
      modIndex
      coverUrl: coverURL
    }
    page
    perPage
    total
    totalPages
  }
}
    `) as unknown as TypedDocumentString<BeatmapsQuery, BeatmapsQueryVariables>;
export const BeatmapByOsuIdDocument = new TypedDocumentString(`
    query BeatmapByOsuId($osuId: Int!) {
  beatmapByOsuId(osuId: $osuId) {
    id
    onlineID
    title
    artist
    version: difficultyName
    difficultyRating: starRating
    bpm
    status
    modString
    modIndex
    coverUrl: coverURL
  }
}
    `) as unknown as TypedDocumentString<BeatmapByOsuIdQuery, BeatmapByOsuIdQueryVariables>;
export const TeamsDocument = new TypedDocumentString(`
    query Teams($page: Int, $perPage: Int, $search: String) {
  teams(page: $page, perPage: $perPage, search: $search) {
    items {
      id
      name
      description
      seed
      leaderID
      leader {
        id
        onlineID
        username
        avatarUrl: avatarURL
      }
      strategistID
      strategist {
        id
        onlineID
        username
        avatarUrl: avatarURL
      }
      playerIDs
      players {
        id
        onlineID
        username
        avatarUrl: avatarURL
      }
      isReady
      createdAt
      updatedAt
    }
    page
    perPage
    total
    totalPages
  }
}
    `) as unknown as TypedDocumentString<TeamsQuery, TeamsQueryVariables>;
export const MappoolsDocument = new TypedDocumentString(`
    query Mappools($page: Int, $perPage: Int, $search: String) {
  mappools(page: $page, perPage: $perPage, search: $search) {
    items {
      id
      name
      description
      entries {
        mod
        index
        beatmapID
        beatmap {
          id
          onlineID
          title
          artist
          version: difficultyName
          difficultyRating: starRating
        }
        selectorID
        selector {
          id
          onlineID
          username
        }
        skill
      }
      createdAt
      updatedAt
    }
    page
    perPage
    total
    totalPages
  }
}
    `) as unknown as TypedDocumentString<MappoolsQuery, MappoolsQueryVariables>;
export const UserByOsuIdDocument = new TypedDocumentString(`
    query UserByOsuId($osuId: Int!) {
  userByOsuId(osuId: $osuId) {
    id
    onlineID
    username
    avatarUrl: avatarURL
    countryCode
    roles
    verifyStatus
    isBanned
    globalRank
    pp
  }
}
    `) as unknown as TypedDocumentString<UserByOsuIdQuery, UserByOsuIdQueryVariables>;