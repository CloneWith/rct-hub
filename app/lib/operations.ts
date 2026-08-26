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
  query Rooms(
    $type: RoomType
    $search: String
    $round: String
    $status: MatchLifecycle
    $relatedToMe: Boolean
    $page: Int
    $perPage: Int
  ) {
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
`);

// ---------------------------------------------------------------------------
// Queries — Match (board screen)
// ---------------------------------------------------------------------------

/**
 * Board screen bootstrap. The formal match's code equals the room code
 * (`formal_match_factory.go`: `legacy.Code = room.Code`), so the room code
 * from the URL resolves the match. The WS snapshot carries the live state;
 * this query provides identity, pool metadata (beatmap display info) and an
 * initial snapshot for first paint.
 */
export const MatchByCodeDocument = graphql(`
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
`);

// ---------------------------------------------------------------------------
// Mutations — In-match commands (strategist / captain)
//
// Every command carries CommandMeta { matchId, expectedVersion, commandId }.
// `commandId` must be a non-zero UUID; retries (network failures only) reuse
// the same id for idempotency. A `MATCH_VERSION_CONFLICT` error carries
// `currentVersion` — the command layer refreshes and may retry once.
// ---------------------------------------------------------------------------

export const BanPoolSlotDocument = graphql(`
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
`);

export const PlacePieceDocument = graphql(`
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
`);

export const PlaceShiroDocument = graphql(`
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
`);

export const RobPieceDocument = graphql(`
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
`);

export const RequestTbDocument = graphql(`
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
`);

export const RespondTbRequestDocument = graphql(`
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
