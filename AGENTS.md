# RCT Hub Backend — Frontend / AI Agent Reference

This document describes the backend contract for frontend developers and AI agents working on the RCT Hub project. It covers authentication, RESTful endpoints, response formats, domain models, GraphQL API, and the current real-time status.

## Project Overview

RCT Hub is a web platform for the osu! "RCT" tournament format. The backend (`rctHubBackend`) is implemented in Go with Gin and exposes:

- A **slim REST API** for authentication, room pre-game setup, and admin CRUD.
- A **GraphQL API** at `/graphql` for reads, role-gated match views, and in-match commands.
- MongoDB as the primary database and Redis as a cache layer.

Key project layout in `rctHubBackend`:

```
rctHubBackend/
├── cmd/server/            # HTTP server entry point
├── cmd/initdb/            # DB initialization / seed / migration tool
├── internal/
│   ├── config/            # Environment configuration
│   ├── database/          # MongoDB + Redis clients, indexes, schema validators
│   ├── domain/            # Core domain models
│   ├── fetcher/           # 3-tier osu! user/beatmap cache (Redis → Mongo → osu! API)
│   ├── graphql/           # gqlgen resolvers, schema, directives, DataLoader
│   ├── handler/           # Gin REST handlers
│   ├── matchengine/       # Pure, deterministic match rules engine
│   ├── middleware/        # Auth, RBAC, error handling
│   ├── oauth/             # osu! OAuth 2.0 client
│   ├── persistence/       # Authoritative match snapshot store + recovery
│   ├── repository/        # MongoDB data access
│   ├── server/            # Gin route registration
│   └── service/           # Business logic
├── pkg/                   # Shared packages (errs, jwtutil, paginate, response)
├── tools/                 # verify, matchlab
├── schema.graphql         # Active GraphQL schema (source of truth)
├── docker-compose.yml     # MongoDB 7.0 + Redis 7.4
└── Makefile
```

- **Base URL (local)**: `http://localhost:8080`
- **API prefix**: `/api/v1`
- **Health**: `GET /health` and `GET /api/v1/health`
- **Authentication**: osu! OAuth 2.0 + JWT
- **CORS**: configured from `ALLOWED_ORIGINS` in `.env`

## Authentication

### Login Flow

1. Redirect the user to `GET /auth/osu`.
2. After authorization, osu! redirects to `GET /auth/osu/callback?code=...&state=...`.
3. The backend creates or updates the local user, issues a JWT, and redirects to:
   ```
   /auth/callback?token=<jwt>
   ```
4. The frontend stores the JWT and sends it on every protected request:
   ```
   Authorization: Bearer <jwt>
   ```

### Token Contents

The JWT contains:

- `user_id`: MongoDB ObjectID hex string
- `osu_id`: osu! user id (int64)
- `username`: osu! username
- `roles`: array of user roles (`player`, `strategist`, `referee`, `streamer`, `admin`)
- standard `exp`, `iat`, `iss` claims

### Current User

Use the GraphQL query:

```graphql
query {
  me {
    id
    onlineID
    username
    avatarUrl
    countryCode
    roles
    verifyStatus
    isBanned
    globalRank
    pp
  }
}
```

The old REST aliases `GET /api/v1/auth/me` and `GET /api/v1/users/me` are no longer registered.

## Response Format

### REST

All `/api/v1` endpoints return a unified envelope:

```json
{
  "success": true,
  "data": { ... }
}
```

On error:

```json
{
  "success": false,
  "error": "human readable message"
}
```

HTTP status codes follow REST conventions:

- `200 OK` — success
- `201 Created` — resource created
- `204 No Content` — deletion success
- `400 Bad Request` — invalid input
- `401 Unauthorized` — missing or invalid JWT
- `403 Forbidden` — insufficient role permissions
- `404 Not Found` — resource does not exist
- `409 Conflict` — duplicate or conflict
- `500 Internal Server Error` — unexpected server error

### GraphQL

GraphQL responses use the standard envelope:

```json
{
  "data": { ... },
  "errors": [ ... ]
}
```

Errors are returned in the `errors` array. Authentication/authorization failures are reported there.

## Pagination

REST list endpoints that still exist accept:

- `?page=1` — page number, defaults to 1
- `?per_page=20` — page size, defaults to 20, capped at 100

REST paginated response:

```json
{
  "success": true,
  "data": {
    "data": [ ... ],
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

GraphQL pagination uses `*Page` types (e.g. `UserPage`, `MatchPage`) with:

```graphql
{
  items: [ ... ]
  page: Int!
  perPage: Int!
  total: Int!
  totalPages: Int!
}
```

## Domain Models

### Identifier Convention

- **MongoDB ObjectID** is exposed as:
  - REST: `"_id"` on `User` and `Beatmap`; `"id"` on `Room`, `Match`, `Announcement`.
  - GraphQL: `id: ObjectID!` on all entities.
- **osu! user ID** is exposed as:
  - REST: `"id"` on `User`.
  - GraphQL: `onlineID: Int!` on `User`.
- **osu! beatmap ID** is exposed as:
  - REST: `"id"` on `Beatmap`.
  - GraphQL: `onlineID: Int!` on `Beatmap`.

### User

REST shape (`GET` no longer exists; shown for mutation payloads):

```json
{
  "_id": "...",
  "id": 123456,
  "username": "player_name",
  "avatarUrl": "https://a.ppy.sh/123456",
  "countryCode": "CN",
  "roles": ["player"],
  "verifyStatus": "pending",
  "isBanned": false,
  "globalRank": 1024,
  "pp": 114.51,
  "createdAt": "2026-07-23T04:09:19Z",
  "updatedAt": "2026-07-23T04:09:19Z"
}
```

Notes:

- `roles` can contain: `player`, `strategist`, `referee`, `streamer`, `admin`.
- `status` can be: `verified`, `pending`, `unverified`.
- On first osu! login, users are created with `player` role and `pending` status.

### Beatmap

REST shape:

```json
{
  "_id": "...",
  "id": 1000000,
  "beatmapset_id": 500000,
  "title": "Seed Beatmap",
  "artist": "Seed Artist",
  "version": "Normal",
  "user_id": 1000,
  "mode_int": 0,
  "status": "ranked",
  "difficulty_rating": 4.5,
  "bpm": 180,
  "total_length": 120,
  "drain": 5,
  "cs": 4,
  "ar": 9,
  "accuracy": 8,
  "cover_url": "https://assets.ppy.sh/beatmaps/500000/covers/cover.jpg",
  "comment": "",
  "is_original": false,
  "created_at": "...",
  "updated_at": "..."
}
```

Notes:

- Placement metadata (mod / index / selector / skill) lives on `MappoolEntry` inside `mappools`, not on the beatmap itself.

### Room

```json
{
  "id": "...",
  "code": "ABCDEF",
  "name": "Friendly Match",
  "type": "casual",
  "owner_id": 123456,
  "scheduled_at": "2026-09-01T12:00:00Z",
  "referee_user_id": 999,
  "settings": {
    "red_team_id": "...",
    "blue_team_id": "...",
    "mappool_id": "...",
    "streamer_user_id": 333,
    "first_pick": "red",
    "first_ban": "blue",
    "mp_link": "https://osu.ppy.sh/mp/...",
    "stream_link": "https://twitch.tv/..."
  },
  "match_id": "...",
  "created_at": "...",
  "updated_at": "..."
}
```

Room types: `private`, `casual`, `match`.

- Teams and the mappool are linked by `red_team_id` / `blue_team_id` / `mappool_id` (see `PATCH /rooms/:id/teams` and `PATCH /rooms/:id/mappool`).
- `casual` and `match` rooms require both teams ready (leader + strategist), BP order, a scheduled time and an assigned referee before starting; match rooms additionally need a mappool and an MP link. The streamer is optional.
- `private` rooms have no strict start requirements.

### Match

```json
{
  "id": "...",
  "room_id": "...",
  "code": "MATCH-001",
  "name": "Friendly Match",
  "room_type": "casual",
  "team_red": { ... },
  "team_blue": { ... },
  "mappool": { ... },
  "board": { ... },
  "bp_order": { "first_pick": "red", "first_ban": "blue" },
  "turn_state": { ... },
  "timer": { ... },
  "status": "active",
  "started_at": "...",
  "finished_at": null,
  "created_at": "...",
  "updated_at": "..."
}
```

Match statuses: `pending`, `active`, `finished`, `canceled`.

Turn phases: `setup`, `roll`, `ban`, `pick`, `win`, `tb`, `ended`.

Board zones (4×4):

```
HD HD DT DT
HD HD DT DT
HR HR NM NM
HR HR NM NM
```

Piece mods: `NM`, `HD`, `HR`, `DT`, `FM`, `Shiro`, `TB`.

### Move

Move types: `pick`, `unpick`, `ban`, `unban`, `claim`, `win`, `unwin`, `rob`, `unrob`, `dead`, `undead`, `surrender`.

GraphQL example shape:

```json
{
  "id": "...",
  "matchId": "...",
  "roomId": "...",
  "type": "pick",
  "teamSide": "red",
  "operatorId": 123456,
  "slot": { "mod": "NM", "index": 1 },
  "from": null,
  "to": { "x": 0, "y": 0 },
  "forceMod": null,
  "createdAt": "..."
}
```

### Announcement

```json
{
  "id": "...",
  "pinned": true,
  "visible": true,
  "title": "Welcome",
  "content": "...",
  "author_id": 1,
  "published_at": "...",
  "created_at": "...",
  "updated_at": "..."
}
```

### Result

A new `Result` entity is stored in the `results` collection for formal matches. It records the winner, win reason, team scores, won-piece counts, and alignment information.

## REST API Reference

The REST surface is intentionally slim. Read operations and in-match commands are provided through GraphQL.

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health probe (MongoDB + Redis) |
| GET | `/api/v1/health` | No | Same probe under API prefix |

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/auth/osu` | No | Start osu! OAuth login |
| GET | `/auth/osu/callback` | No | OAuth callback (redirects to `/auth/callback?token=<jwt>`) |

### Rooms (pre-game setup)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/rooms` | Yes | Create room |
| PATCH | `/api/v1/rooms/:id/teams` | Yes | Link red/blue team entities (both ready: leader + strategist) |
| PATCH | `/api/v1/rooms/:id/mappool` | Yes | Link mappool entity (`{mappool_id}`) |
| PATCH | `/api/v1/rooms/:id/streamer` | Yes | Set streamer |
| PATCH | `/api/v1/rooms/:id/bp-order` | Yes | Set first pick / first ban |
| PATCH | `/api/v1/rooms/:id/referee` | Yes | Set assigned referee |
| PATCH | `/api/v1/rooms/:id/mp-link` | Yes | Set multiplayer link |
| PATCH | `/api/v1/rooms/:id/stream-link` | Yes | Set stream link |
| POST | `/api/v1/rooms/:id/start-match` | Yes | Start match from room |

### Beatmaps (admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/beatmaps` | Admin | Create beatmap |
| PATCH | `/api/v1/beatmaps/:id` | Admin | Partial update beatmap |
| DELETE | `/api/v1/beatmaps/:id` | Admin | Delete beatmap |

### Users (admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PATCH | `/api/v1/users/:id/roles` | Admin | Update user roles |
| PATCH | `/api/v1/users/:id/banned` | Admin | Ban/unban user |
| PATCH | `/api/v1/users/:id/verify-status` | Admin | Update verify status |

### Announcements (admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/announcements` | Admin | Create announcement |
| PATCH | `/api/v1/announcements/:id` | Admin | Partial update announcement |
| DELETE | `/api/v1/announcements/:id` | Admin | Delete announcement |
| POST | `/api/v1/announcements/:id/publish` | Admin | Publish announcement |

## GraphQL

The backend exposes a GraphQL endpoint at `/graphql` powered by `github.com/99designs/gqlgen`. The schema file `schema.graphql` in `rctHubBackend` is the source of truth.

- **Playground**: `GET /graphql`
- **Endpoint**: `POST /graphql`
- **Authentication**: optional via `Authorization: Bearer <jwt>`; protected fields use `@requireRole`.

### Queries

- `ping`
- `me`
- `user(id: ObjectID!)`
- `users(page: Int, perPage: Int)` → `UserPage`
- `beatmap(id: ObjectID!)`
- `beatmapByOsuId(osuId: Int!)`
- `beatmaps(page: Int, perPage: Int)` → `BeatmapPage`
- `room(id: ObjectID!)`
- `roomByCode(code: String!)`
- `rooms(type: RoomType, page: Int, perPage: Int)` → `RoomPage`
- `match(id: ObjectID!)`
- `matchByCode(code: String!)`
- `matches(status: MatchStatus, page: Int, perPage: Int)` → `MatchPage`
- `announcement(id: ObjectID!)`
- `announcements(page: Int, perPage: Int)` → `AnnouncementPage`

### Match Nested Fields & Client Views

- `moves` / `recentMove`
- `room`
- `strategistView` — requires `STRATEGIST` role
- `spectatorView` — public
- `overlayView` — public
- `refereeView` — requires `REFEREE` role (admin allowed)

### Mutations

All in-match mutations accept a `CommandMeta` input:

```graphql
input CommandMeta {
  matchId: ObjectID!
  expectedVersion: Int!
  commandId: String!
}
```

Implemented mutations:

- `banPoolSlot(meta: CommandMeta!, slot: PoolSlotInput!)`
- `placePiece(meta: CommandMeta!, slot: PoolSlotInput!, position: PositionInput!)`
- `completeRobbery(meta: CommandMeta!, slot: PoolSlotInput!)`
- `declareTbWinner(meta: CommandMeta!, teamSide: TeamSide!)`
- `declareSurrender(meta: CommandMeta!, teamSide: TeamSide!)`
- `advanceTurn(meta: CommandMeta!)`
- `pauseMatch(meta: CommandMeta!)`
- `resumeMatch(meta: CommandMeta!)`

Stubbed mutations (return `notImplemented`):

- `unbanPoolSlot`
- `grantWinPermission`
- `confirmPieceWinner`
- `beginRobbery`
- `cancelRobbery`
- `undoAction`

### Pagination Types

GraphQL page types expose:

```graphql
type UserPage {
  items: [User!]!
  page: Int!
  perPage: Int!
  total: Int!
  totalPages: Int!
}
```

## WebSocket / Real-time

**WebSocket is currently not implemented.** The `internal/websocket/` package exists but is empty, and the GraphQL handler does not register WebSocket subscriptions.

For live updates, frontend clients should:

1. Poll GraphQL queries such as `match` or `recentMove`.
2. Use the `recentMove` field on `Match` to detect new actions.

Planned WebSocket message types once implemented:

- `JOIN` — subscribe to a room/match
- `LEAVE` — unsubscribe
- `MOVE` — a ban/pick/rob/win action
- `BOARD_STATE` — full board state broadcast
- `TURN_UPDATE` — active team/phase/timer update
- `SYSTEM` — server notifications
- `ANNOUNCEMENT` — new CMS announcement

## Role-Based Access

### Global Roles (stored in JWT)

- `player` — default logged-in user
- `strategist` — can act on behalf of a team in a match
- `referee` — can control matches
- `streamer` — read-only access to streaming data
- `admin` — full access

### Room-Scoped Roles (stored per room/match)

- `admin` — room owner / referee
- `strategist` — assigned team strategist
- `streamer` — match streamer
- `spectator` — viewer

## Common Patterns for Frontend

1. **Always send JWT on protected routes.** Missing tokens return `401`.
2. **Use GraphQL for reads and in-match commands.** REST is now limited to room setup and admin CRUD.
3. **Use `code` for public lookups.** Rooms and matches have short human-readable codes for sharing (`roomByCode`, `matchByCode`).
4. **Poll for live updates.** WebSocket is not implemented; poll `recentMove` or `match` on GraphQL.
5. **Admin-only mutations require the `admin` role.** Attempting admin actions without it returns `403`.
6. **Room setup order.** Create room → (admin) create teams + mappool → link teams → link mappool → set BP order → set referee/scheduled time → set MP link → start match (pre-start checklist gates the button; scheduled time + referee are hard requirements, streamer is optional).
7. **Treat IDs carefully.** The REST `User`/`Beatmap` response uses `"_id"` for the Mongo ID and `"id"` for the osu/beatmap online ID. In GraphQL, use `id` for the Mongo ID and `onlineID` for the online ID.

## Local Development

```bash
# Start dependencies
cd rctHubBackend
make docker-up

# Initialize database
make initdb-seed

# Run server
make run
```

Other useful commands:

```bash
make build       # compile to ./bin/server
make test        # run unit tests
make verify      # CI-style verification
make generate    # regenerate GraphQL code from schema.graphql
```

Default local URLs:

- API: `http://localhost:8080`
- Health: `http://localhost:8080/health`
- GraphQL Playground: `http://localhost:8080/graphql`
- Match Engine Lab: `http://127.0.0.1:8091`

## Environment Variables

Key variables for frontend behavior:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | `development` | `production` enables Gin release mode |
| `PORT` | `8080` | Backend port |
| `OSU_REDIRECT_URI` | `http://localhost:8080/auth/osu/callback` | Must match osu! OAuth app settings |
| `ALLOWED_ORIGINS` | `*` | Frontend origin for CORS |
| `JWT_SECRET` | *(required)* | JWT signing secret (≥32 bytes) |
| `JWT_EXPIRY_HOURS` | `168` | Token lifetime |
| `OSU_FETCHER_USER_CACHE_TTL_MIN` | `30` | User cache TTL |
| `OSU_FETCHER_BEATMAP_CACHE_TTL_HR` | `24` | Beatmap cache TTL |

See `.env.example` in `rctHubBackend` for the full list.

## Notes for AI Agents

- Prefer **GraphQL** for reads, match views, and in-match commands. Use **REST** only for room setup and admin CRUD.
- Use `Authorization: Bearer <token>` for protected calls.
- The backend returns a unified `{"success", "data"}` envelope on REST and standard GraphQL `data`/`errors` on GraphQL.
- Treat IDs carefully: the MongoDB ObjectID is exposed differently in REST vs. GraphQL. In GraphQL use `id`; in REST use `id` for `Room`/`Match`/`Announcement` and `_id` for `User`/`Beatmap`.
- Use `onlineID` (GraphQL) or `"id"` (REST) for osu!/beatmap online IDs.
- Do not hardcode admin credentials; rely on osu! OAuth and role assignment.
- WebSocket is not implemented; do not write client code that depends on it.
- Admin write endpoints cache-invalidate user and beatmap data; frontend reads via GraphQL will observe fresh data.

<!-- BEGIN:nextjs-agent-rules -->

## Next.js

ALWAYS read docs before coding.

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

## Hero UI

You can read [this reference file](https://heroui.com/react/llms.txt) for details about Hero UI. Other resources are:

- For component-specific documentation: https://heroui.com/react/llms-components.txt
- For patterns and best practices: https://heroui.com/react/llms-patterns.txt
