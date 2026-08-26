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

export type CommandMeta = {
  commandId: string;
  expectedVersion: string;
  matchId: string | number;
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

export type MatchLifecycle =
  | 'ABORTED'
  | 'ADJUDICATION_REQUIRED'
  | 'FINISHED'
  | 'READY'
  | 'RUNNING'
  | 'SUSPENDED';

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

export type RequestTbInput = {
  meta: CommandMeta;
  requestId: string;
};

export type RespondTbRequestInput = {
  accept: boolean;
  meta: CommandMeta;
  requestId: string;
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


export type RoomsQuery = { rooms: { page: number, perPage: number, total: number, totalPages: number, items: Array<{ id: string, code: string, name: string, type: RoomType, round: string, scheduledAt: string | null, createdAt: string, ownerID: string, refereeUserID: string | null, matchID: string | null, owner: { id: string, onlineID: string, username: string, avatarUrl: string } | null, match: { snapshot: { lifecycle: MatchLifecycle } } | null, settings: { redStrategistUserID: string | null, blueStrategistUserID: string | null, streamerUserID: string | null, redLeader: string | null, blueLeader: string | null, redPlayers: Array<string>, bluePlayers: Array<string>, mpLink: string | null, streamLink: string | null } }> } };

export type MatchByCodeQueryVariables = Exact<{
  code: string;
}>;


export type MatchByCodeQuery = { matchByCode: { id: string, code: string, name: string, roomType: RoomType, room: { name: string, round: string } | null, pool: Array<{ poolSlotID: string, metadataStatus: BeatmapMetadataStatus, beatmap: { onlineID: string, title: string, artist: string, difficultyName: string, starRating: number, bpm: number, totalLength: number, coverUrl: string } | null }>, snapshot: { version: string, lifecycle: MatchLifecycle, phase: FormalMatchPhase, turn: number, activeTeam: TeamSide | null, wonCounts: { red: number, blue: number } }, strategistView: { isMyTurn: boolean, myTeam: TeamSide, analysis: { allowedActions: Array<MatchAction>, banPoolSlotIDs: Array<string>, shiroCells: Array<string>, pendingTBRequestID: string | null, canAcceptTBRequest: boolean, canRejectTBRequest: boolean, tbRequestTeams: Array<TeamSide>, tbResponseTeams: Array<TeamSide>, legalPlacements: Array<{ poolSlotID: string, cell: string, forceMod: ForceMod | null }>, robberyPlans: Array<{ targetPieceID: string, sacrificeSets: Array<Array<string>> }> } } | null, captainView: { myTeam: TeamSide, analysis: { allowedActions: Array<MatchAction>, banPoolSlotIDs: Array<string>, shiroCells: Array<string>, pendingTBRequestID: string | null, canAcceptTBRequest: boolean, canRejectTBRequest: boolean, tbRequestTeams: Array<TeamSide>, tbResponseTeams: Array<TeamSide>, legalPlacements: Array<{ poolSlotID: string, cell: string, forceMod: ForceMod | null }>, robberyPlans: Array<{ targetPieceID: string, sacrificeSets: Array<Array<string>> }> } } | null } | null };

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