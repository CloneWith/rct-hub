/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query Me {\n    me {\n      id\n      onlineID\n      username\n      avatarUrl: avatarURL\n      countryCode\n      roles\n      verifyStatus\n      isBanned\n      globalRank\n      pp\n    }\n  }\n": typeof types.MeDocument,
    "\n  query Users($page: Int, $perPage: Int) {\n    users(page: $page, perPage: $perPage) {\n      items {\n        id\n        onlineID\n        username\n        avatarUrl: avatarURL\n        countryCode\n        roles\n        verifyStatus\n        isBanned\n        globalRank\n        pp\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": typeof types.UsersDocument,
    "\n  query Rooms($type: RoomType, $page: Int, $perPage: Int) {\n    rooms(type: $type, page: $page, perPage: $perPage) {\n      items {\n        id\n        code\n        name\n        type\n        owner {\n          id\n          onlineID\n          username\n          avatarUrl: avatarURL\n        }\n        match {\n          id\n        }\n        createdAt\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": typeof types.RoomsDocument,
    "\n  query Matches($status: MatchStatus, $page: Int, $perPage: Int) {\n    matches(status: $status, page: $page, perPage: $perPage) {\n      items {\n        id\n        code\n        name\n        status\n        roomType\n        startedAt\n        turnState {\n          phase\n          activeTeam\n        }\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": typeof types.MatchesDocument,
    "\n  query Announcements($page: Int, $perPage: Int) {\n    announcements(page: $page, perPage: $perPage) {\n      items {\n        id\n        pinned\n        visible\n        title\n        content\n        author {\n          id\n          onlineID\n          username\n          avatarUrl: avatarURL\n        }\n        publishedAt\n        createdAt\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": typeof types.AnnouncementsDocument,
    "\n  query Beatmaps($page: Int, $perPage: Int) {\n    beatmaps(page: $page, perPage: $perPage) {\n      items {\n        id\n        onlineID\n        title\n        artist\n        version: difficultyName\n        difficultyRating: starRating\n        bpm\n        status\n        modString\n        modIndex\n        coverUrl: coverURL\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": typeof types.BeatmapsDocument,
};
const documents: Documents = {
    "\n  query Me {\n    me {\n      id\n      onlineID\n      username\n      avatarUrl: avatarURL\n      countryCode\n      roles\n      verifyStatus\n      isBanned\n      globalRank\n      pp\n    }\n  }\n": types.MeDocument,
    "\n  query Users($page: Int, $perPage: Int) {\n    users(page: $page, perPage: $perPage) {\n      items {\n        id\n        onlineID\n        username\n        avatarUrl: avatarURL\n        countryCode\n        roles\n        verifyStatus\n        isBanned\n        globalRank\n        pp\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": types.UsersDocument,
    "\n  query Rooms($type: RoomType, $page: Int, $perPage: Int) {\n    rooms(type: $type, page: $page, perPage: $perPage) {\n      items {\n        id\n        code\n        name\n        type\n        owner {\n          id\n          onlineID\n          username\n          avatarUrl: avatarURL\n        }\n        match {\n          id\n        }\n        createdAt\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": types.RoomsDocument,
    "\n  query Matches($status: MatchStatus, $page: Int, $perPage: Int) {\n    matches(status: $status, page: $page, perPage: $perPage) {\n      items {\n        id\n        code\n        name\n        status\n        roomType\n        startedAt\n        turnState {\n          phase\n          activeTeam\n        }\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": types.MatchesDocument,
    "\n  query Announcements($page: Int, $perPage: Int) {\n    announcements(page: $page, perPage: $perPage) {\n      items {\n        id\n        pinned\n        visible\n        title\n        content\n        author {\n          id\n          onlineID\n          username\n          avatarUrl: avatarURL\n        }\n        publishedAt\n        createdAt\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": types.AnnouncementsDocument,
    "\n  query Beatmaps($page: Int, $perPage: Int) {\n    beatmaps(page: $page, perPage: $perPage) {\n      items {\n        id\n        onlineID\n        title\n        artist\n        version: difficultyName\n        difficultyRating: starRating\n        bpm\n        status\n        modString\n        modIndex\n        coverUrl: coverURL\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": types.BeatmapsDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Me {\n    me {\n      id\n      onlineID\n      username\n      avatarUrl: avatarURL\n      countryCode\n      roles\n      verifyStatus\n      isBanned\n      globalRank\n      pp\n    }\n  }\n"): typeof import('./graphql').MeDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Users($page: Int, $perPage: Int) {\n    users(page: $page, perPage: $perPage) {\n      items {\n        id\n        onlineID\n        username\n        avatarUrl: avatarURL\n        countryCode\n        roles\n        verifyStatus\n        isBanned\n        globalRank\n        pp\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n"): typeof import('./graphql').UsersDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Rooms($type: RoomType, $page: Int, $perPage: Int) {\n    rooms(type: $type, page: $page, perPage: $perPage) {\n      items {\n        id\n        code\n        name\n        type\n        owner {\n          id\n          onlineID\n          username\n          avatarUrl: avatarURL\n        }\n        match {\n          id\n        }\n        createdAt\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n"): typeof import('./graphql').RoomsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Matches($status: MatchStatus, $page: Int, $perPage: Int) {\n    matches(status: $status, page: $page, perPage: $perPage) {\n      items {\n        id\n        code\n        name\n        status\n        roomType\n        startedAt\n        turnState {\n          phase\n          activeTeam\n        }\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n"): typeof import('./graphql').MatchesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Announcements($page: Int, $perPage: Int) {\n    announcements(page: $page, perPage: $perPage) {\n      items {\n        id\n        pinned\n        visible\n        title\n        content\n        author {\n          id\n          onlineID\n          username\n          avatarUrl: avatarURL\n        }\n        publishedAt\n        createdAt\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n"): typeof import('./graphql').AnnouncementsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Beatmaps($page: Int, $perPage: Int) {\n    beatmaps(page: $page, perPage: $perPage) {\n      items {\n        id\n        onlineID\n        title\n        artist\n        version: difficultyName\n        difficultyRating: starRating\n        bpm\n        status\n        modString\n        modIndex\n        coverUrl: coverURL\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n"): typeof import('./graphql').BeatmapsDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
