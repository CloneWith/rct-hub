/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type BeatmapMetadataStatus =
  | 'FAILED'
  | 'NOT_CONFIGURED'
  | 'PENDING'
  | 'READY';

export type FormalMatchPhase =
  | 'BAN'
  | 'NONE'
  | 'PICK'
  | 'TB_PLAYING'
  | 'TB_PREPARATION'
  | 'WAITING_FOR_RESULT';

export type MatchLifecycle =
  | 'ABORTED'
  | 'ADJUDICATION_REQUIRED'
  | 'FINISHED'
  | 'READY'
  | 'RUNNING'
  | 'SUSPENDED';

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


export type MatchByCodeQuery = { matchByCode: { id: string, code: string, name: string, roomType: RoomType, room: { name: string, round: string } | null, pool: Array<{ poolSlotID: string, metadataStatus: BeatmapMetadataStatus, beatmap: { onlineID: string, title: string, artist: string, difficultyName: string, starRating: number, bpm: number, totalLength: number, coverUrl: string } | null }>, snapshot: { version: string, lifecycle: MatchLifecycle, phase: FormalMatchPhase, turn: number, activeTeam: TeamSide | null, wonCounts: { red: number, blue: number } } } | null };

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
  }
}
    `) as unknown as TypedDocumentString<MatchByCodeQuery, MatchByCodeQueryVariables>;
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