/**
 * GraphQL Operations
 *
 * All GraphQL queries and mutations are defined here using the codegen-generated
 * `graphql()` tag function. This provides full type safety — each document is a
 * `TypedDocumentString<TResult, TVariables>` that `graphqlRequest` can consume
 * directly without manual type annotations.
 *
 * After changing any operation, run `pnpm codegen` to regenerate types.
 */

import { graphql } from "@/app/graphql";

// ---------------------------------------------------------------------------
// Queries — Auth
// ---------------------------------------------------------------------------

export const MeDocument = graphql(`
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
`);

// ---------------------------------------------------------------------------
// Queries — Users (admin)
// ---------------------------------------------------------------------------

export const UsersDocument = graphql(`
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
`);

// ---------------------------------------------------------------------------
// Queries — Rooms
// ---------------------------------------------------------------------------

export const RoomsDocument = graphql(`
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
`);

// ---------------------------------------------------------------------------
// Queries — Matches
// ---------------------------------------------------------------------------

export const MatchesDocument = graphql(`
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
`);

// ---------------------------------------------------------------------------
// Queries — Announcements
// ---------------------------------------------------------------------------

export const AnnouncementsDocument = graphql(`
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
`);

// ---------------------------------------------------------------------------
// Queries — Beatmaps (admin)
// ---------------------------------------------------------------------------

export const BeatmapsDocument = graphql(`
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
`);

/**
 * Fetch a beatmap by its osu! beatmap id. The backend resolver goes through
 * the 3-tier fetcher (Redis → Mongo → osu! API), so a cache miss triggers a
 * live osu! API pull and upserts the document before returning it.
 */
export const BeatmapByOsuIdDocument = graphql(`
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
`);
