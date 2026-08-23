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
    "\n  query Rooms(\n    $type: RoomType\n    $search: String\n    $round: String\n    $status: MatchLifecycle\n    $relatedToMe: Boolean\n    $page: Int\n    $perPage: Int\n  ) {\n    rooms(\n      type: $type\n      search: $search\n      round: $round\n      status: $status\n      relatedToMe: $relatedToMe\n      page: $page\n      perPage: $perPage\n    ) {\n      items {\n        id\n        code\n        name\n        type\n        round\n        scheduledAt\n        createdAt\n        ownerID\n        owner {\n          id\n          onlineID\n          username\n          avatarUrl: avatarURL\n        }\n        refereeUserID\n        matchID\n        match {\n          snapshot {\n            lifecycle\n          }\n        }\n        settings {\n          redStrategistUserID\n          blueStrategistUserID\n          streamerUserID\n          redLeader\n          blueLeader\n          redPlayers\n          bluePlayers\n          mpLink\n          streamLink\n        }\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": typeof types.RoomsDocument,
    "\n  query Announcements($page: Int, $perPage: Int) {\n    announcements(page: $page, perPage: $perPage) {\n      items {\n        id\n        pinned\n        visible\n        title\n        content\n        author {\n          id\n          onlineID\n          username\n          avatarUrl: avatarURL\n        }\n        publishedAt\n        createdAt\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": typeof types.AnnouncementsDocument,
    "\n  query Beatmaps($page: Int, $perPage: Int) {\n    beatmaps(page: $page, perPage: $perPage) {\n      items {\n        id\n        onlineID\n        title\n        artist\n        version: difficultyName\n        difficultyRating: starRating\n        bpm\n        status\n        modString\n        modIndex\n        coverUrl: coverURL\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": typeof types.BeatmapsDocument,
    "\n  query BeatmapByOsuId($osuId: Int!) {\n    beatmapByOsuId(osuId: $osuId) {\n      id\n      onlineID\n      title\n      artist\n      version: difficultyName\n      difficultyRating: starRating\n      bpm\n      status\n      modString\n      modIndex\n      coverUrl: coverURL\n    }\n  }\n": typeof types.BeatmapByOsuIdDocument,
};
const documents: Documents = {
    "\n  query Me {\n    me {\n      id\n      onlineID\n      username\n      avatarUrl: avatarURL\n      countryCode\n      roles\n      verifyStatus\n      isBanned\n      globalRank\n      pp\n    }\n  }\n": types.MeDocument,
    "\n  query Users($page: Int, $perPage: Int) {\n    users(page: $page, perPage: $perPage) {\n      items {\n        id\n        onlineID\n        username\n        avatarUrl: avatarURL\n        countryCode\n        roles\n        verifyStatus\n        isBanned\n        globalRank\n        pp\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": types.UsersDocument,
    "\n  query Rooms(\n    $type: RoomType\n    $search: String\n    $round: String\n    $status: MatchLifecycle\n    $relatedToMe: Boolean\n    $page: Int\n    $perPage: Int\n  ) {\n    rooms(\n      type: $type\n      search: $search\n      round: $round\n      status: $status\n      relatedToMe: $relatedToMe\n      page: $page\n      perPage: $perPage\n    ) {\n      items {\n        id\n        code\n        name\n        type\n        round\n        scheduledAt\n        createdAt\n        ownerID\n        owner {\n          id\n          onlineID\n          username\n          avatarUrl: avatarURL\n        }\n        refereeUserID\n        matchID\n        match {\n          snapshot {\n            lifecycle\n          }\n        }\n        settings {\n          redStrategistUserID\n          blueStrategistUserID\n          streamerUserID\n          redLeader\n          blueLeader\n          redPlayers\n          bluePlayers\n          mpLink\n          streamLink\n        }\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": types.RoomsDocument,
    "\n  query Announcements($page: Int, $perPage: Int) {\n    announcements(page: $page, perPage: $perPage) {\n      items {\n        id\n        pinned\n        visible\n        title\n        content\n        author {\n          id\n          onlineID\n          username\n          avatarUrl: avatarURL\n        }\n        publishedAt\n        createdAt\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": types.AnnouncementsDocument,
    "\n  query Beatmaps($page: Int, $perPage: Int) {\n    beatmaps(page: $page, perPage: $perPage) {\n      items {\n        id\n        onlineID\n        title\n        artist\n        version: difficultyName\n        difficultyRating: starRating\n        bpm\n        status\n        modString\n        modIndex\n        coverUrl: coverURL\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n": types.BeatmapsDocument,
    "\n  query BeatmapByOsuId($osuId: Int!) {\n    beatmapByOsuId(osuId: $osuId) {\n      id\n      onlineID\n      title\n      artist\n      version: difficultyName\n      difficultyRating: starRating\n      bpm\n      status\n      modString\n      modIndex\n      coverUrl: coverURL\n    }\n  }\n": types.BeatmapByOsuIdDocument,
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
export function graphql(source: "\n  query Rooms(\n    $type: RoomType\n    $search: String\n    $round: String\n    $status: MatchLifecycle\n    $relatedToMe: Boolean\n    $page: Int\n    $perPage: Int\n  ) {\n    rooms(\n      type: $type\n      search: $search\n      round: $round\n      status: $status\n      relatedToMe: $relatedToMe\n      page: $page\n      perPage: $perPage\n    ) {\n      items {\n        id\n        code\n        name\n        type\n        round\n        scheduledAt\n        createdAt\n        ownerID\n        owner {\n          id\n          onlineID\n          username\n          avatarUrl: avatarURL\n        }\n        refereeUserID\n        matchID\n        match {\n          snapshot {\n            lifecycle\n          }\n        }\n        settings {\n          redStrategistUserID\n          blueStrategistUserID\n          streamerUserID\n          redLeader\n          blueLeader\n          redPlayers\n          bluePlayers\n          mpLink\n          streamLink\n        }\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n"): typeof import('./graphql').RoomsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Announcements($page: Int, $perPage: Int) {\n    announcements(page: $page, perPage: $perPage) {\n      items {\n        id\n        pinned\n        visible\n        title\n        content\n        author {\n          id\n          onlineID\n          username\n          avatarUrl: avatarURL\n        }\n        publishedAt\n        createdAt\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n"): typeof import('./graphql').AnnouncementsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Beatmaps($page: Int, $perPage: Int) {\n    beatmaps(page: $page, perPage: $perPage) {\n      items {\n        id\n        onlineID\n        title\n        artist\n        version: difficultyName\n        difficultyRating: starRating\n        bpm\n        status\n        modString\n        modIndex\n        coverUrl: coverURL\n      }\n      page\n      perPage\n      total\n      totalPages\n    }\n  }\n"): typeof import('./graphql').BeatmapsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BeatmapByOsuId($osuId: Int!) {\n    beatmapByOsuId(osuId: $osuId) {\n      id\n      onlineID\n      title\n      artist\n      version: difficultyName\n      difficultyRating: starRating\n      bpm\n      status\n      modString\n      modIndex\n      coverUrl: coverURL\n    }\n  }\n"): typeof import('./graphql').BeatmapByOsuIdDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
