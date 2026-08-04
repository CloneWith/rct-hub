/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type MatchPhase =
  | 'BAN'
  | 'ENDED'
  | 'PICK'
  | 'ROLL'
  | 'SETUP'
  | 'TB'
  | 'WIN';

export type MatchStatus =
  | 'ACTIVE'
  | 'CANCELED'
  | 'FINISHED'
  | 'PENDING';

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


export type MeQuery = { me: { id: string, onlineID: number, username: string, countryCode: string, roles: Array<UserRole>, verifyStatus: VerifyStatus, isBanned: boolean, globalRank: number | null, pp: number | null, avatarUrl: string } | null };

export type UsersQueryVariables = Exact<{
  page?: number | null | undefined;
  perPage?: number | null | undefined;
}>;


export type UsersQuery = { users: { page: number, perPage: number, total: number, totalPages: number, items: Array<{ id: string, onlineID: number, username: string, countryCode: string, roles: Array<UserRole>, verifyStatus: VerifyStatus, isBanned: boolean, globalRank: number | null, pp: number | null, avatarUrl: string }> } };

export type RoomsQueryVariables = Exact<{
  type?: RoomType | null | undefined;
  page?: number | null | undefined;
  perPage?: number | null | undefined;
}>;


export type RoomsQuery = { rooms: { page: number, perPage: number, total: number, totalPages: number, items: Array<{ id: string, code: string, name: string, type: RoomType, createdAt: string, owner: { id: string, onlineID: number, username: string, avatarUrl: string } | null, match: { id: string } | null }> } };

export type MatchesQueryVariables = Exact<{
  status?: MatchStatus | null | undefined;
  page?: number | null | undefined;
  perPage?: number | null | undefined;
}>;


export type MatchesQuery = { matches: { page: number, perPage: number, total: number, totalPages: number, items: Array<{ id: string, code: string, name: string, status: MatchStatus, roomType: RoomType, startedAt: string | null, turnState: { phase: MatchPhase, activeTeam: TeamSide | null } | null }> } };

export type AnnouncementsQueryVariables = Exact<{
  page?: number | null | undefined;
  perPage?: number | null | undefined;
}>;


export type AnnouncementsQuery = { announcements: { page: number, perPage: number, total: number, totalPages: number, items: Array<{ id: string, pinned: boolean, visible: boolean, title: string, content: string, publishedAt: string | null, createdAt: string, author: { id: string, onlineID: number, username: string, avatarUrl: string } | null }> } };

export type BeatmapsQueryVariables = Exact<{
  page?: number | null | undefined;
  perPage?: number | null | undefined;
}>;


export type BeatmapsQuery = { beatmaps: { page: number, perPage: number, total: number, totalPages: number, items: Array<{ id: string, onlineID: number, title: string, artist: string, bpm: number, status: string, modString: string, modIndex: number, version: string, difficultyRating: number, coverUrl: string }> } };

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
    query Rooms($type: RoomType, $page: Int, $perPage: Int) {
  rooms(type: $type, page: $page, perPage: $perPage) {
    items {
      id
      code
      name
      type
      owner {
        id
        onlineID
        username
        avatarUrl: avatarURL
      }
      match {
        id
      }
      createdAt
    }
    page
    perPage
    total
    totalPages
  }
}
    `) as unknown as TypedDocumentString<RoomsQuery, RoomsQueryVariables>;
export const MatchesDocument = new TypedDocumentString(`
    query Matches($status: MatchStatus, $page: Int, $perPage: Int) {
  matches(status: $status, page: $page, perPage: $perPage) {
    items {
      id
      code
      name
      status
      roomType
      startedAt
      turnState {
        phase
        activeTeam
      }
    }
    page
    perPage
    total
    totalPages
  }
}
    `) as unknown as TypedDocumentString<MatchesQuery, MatchesQueryVariables>;
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