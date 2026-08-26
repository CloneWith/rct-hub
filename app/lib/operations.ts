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
`);

/**
 * Full room configuration for the pre-game setup page (M4).
 *
 * Unlike the list query, this includes the mappool, BP order and resolved
 * member users (strategists / referee / streamer) for display. The mappool
 * `beatmapID` is a GraphQL `ID` (decimal string); the REST mappool payload
 * expects numeric ids, so callers convert with `Number()` before saving.
 */
export const RoomByCodeDocument = graphql(`
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
// Mutations — Referee commands (M3 referee console)
//
// Referee proxy commands take an `actingTeam` (the side being acted on
// behalf of) plus a mandatory `reason` (audit trail). Timer/lifecycle
// commands use `ReasonCommandInput`. `confirmIRCResult` is a flat input
// (no nested `meta`) because the observation claim binds the commandId.
// ---------------------------------------------------------------------------

export const StartMatchDocument = graphql(`
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
`);

export const RefereeBanPoolSlotDocument = graphql(`
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
`);

export const RefereePlacePieceDocument = graphql(`
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
`);

export const RefereePlaceShiroDocument = graphql(`
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
`);

export const RefereeRobPieceDocument = graphql(`
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
`);

export const RefereeRequestTbDocument = graphql(`
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
`);

export const RefereeRespondTbRequestDocument = graphql(`
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
`);

export const ConfirmBeatmapResultDocument = graphql(`
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
`);

export const ConfirmTbResultDocument = graphql(`
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
`);

export const GrantAdditionalTimeDocument = graphql(`
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
`);

export const CalibrateTimerDocument = graphql(`
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
`);

export const PauseTimerDocument = graphql(`
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
`);

export const ResumeTimerDocument = graphql(`
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
`);

export const SuspendMatchDocument = graphql(`
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
`);

export const ResumeMatchDocument = graphql(`
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
`);

export const SkipCurrentActionDocument = graphql(`
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
`);

export const AbortMatchDocument = graphql(`
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
`);

export const StartTbDocument = graphql(`
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
`);

export const RecordSurrenderDocument = graphql(`
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
`);

export const ConfirmIRCResultDocument = graphql(`
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
`);

export const RejectIRCObservationDocument = graphql(`
  mutation RejectIRCObservation($matchId: ID!, $observationId: ID!, $reason: String!) {
    rejectIRCObservation(matchId: $matchId, observationId: $observationId, reason: $reason)
  }
`);

export const RetryMatchAutomationDocument = graphql(`
  mutation RetryMatchAutomation($input: RetryMatchAutomationInput!) {
    retryMatchAutomation(input: $input)
  }
`);

export const RetryIRCJobDocument = graphql(`
  mutation RetryIRCJob($input: RetryIRCJobInput!) {
    retryIRCJob(input: $input)
  }
`);

// ---------------------------------------------------------------------------
// Queries — IRC (referee console)
// ---------------------------------------------------------------------------

export const IrcConnectionStatusDocument = graphql(`
  query IrcConnectionStatus($matchId: ID!) {
    ircConnectionStatus(matchId: $matchId) {
      configured
      connected
      degraded
      lastError
    }
  }
`);

export const IrcObservationsDocument = graphql(`
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
`);

export const IrcJobsDocument = graphql(`
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

// ---------------------------------------------------------------------------
// Queries — Teams (admin)
// ---------------------------------------------------------------------------

export const TeamsDocument = graphql(`
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
`);

// ---------------------------------------------------------------------------
// Queries — Mappools (admin)
// ---------------------------------------------------------------------------

export const MappoolsDocument = graphql(`
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
`);

// ---------------------------------------------------------------------------
// Queries — Users by osu! id (admin, fetch-through upsert)
// ---------------------------------------------------------------------------

/**
 * Fetch a user by osu! user id. The backend resolver goes through the 3-tier
 * fetcher (Redis → Mongo → osu! API): a cache miss pulls the profile from the
 * osu! API and upserts the document before returning it, so this doubles as
 * the admin "add user" entry point (D4).
 */
export const UserByOsuIdDocument = graphql(`
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
`);
