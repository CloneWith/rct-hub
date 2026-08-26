# 队伍 / 图池实体化、开赛前检查单与管理后台扩展 — 实施规划

> 状态：待评审
> 日期：2026-08-26
> 范围：后端 `D:/Projects/rctHubBackend`（Go/Gin/Mongo/GraphQL）+ 前端 `D:/Projects/rct-hub`（Next.js/HeroUI v3）

---

## 1. 背景与已确认决策

当前痛点：

1. **开赛排障体验差**：房间列表页「开赛」按钮只有一个简单确认弹窗（`app/rooms/components/RoomCard.tsx`），配置不符时只收到后端聚合报错（`NewValidationError` details → toast），无法逐项定位。
2. **图池管理缺失**：图池内嵌在 `Room.Settings.Mappool`（`domain/pool.go` 的 `Mappool{Slots map[PieceMod][]Piece}`），没有独立实体，无法复用、无法在后台维护；且谱面模型上残留 `ModString/ModIndex/SelectorID/Skill` 等放置信息，语义混乱。
3. **队伍结构原始**：队伍信息以 6 个平铺字段（红/蓝 players、leaders、strategists）散落在 `RoomSettings` 中，`domain.Team` 仅作为 Match 内嵌值对象存在，没有可管理的队伍实体。
4. **User 无法按需入库**：`fetcher.GetUser/SyncUser`（三级缓存 Redis → Mongo → osu! API v2）已具备"按 osu ID 拉取并 upsert"能力，但没有任何端点暴露给管理员。

已确认的四项设计决策（本轮 AskUserQuestion 结论）：

| # | 决策点 | 结论 |
|---|--------|------|
| D1 | 队伍/图池引用覆盖范围 | **全量替换**：所有房间类型统一改为 `red_team_id / blue_team_id / mappool_id` 引用，删除 `RoomSettings` 中 6 个队伍字段与内嵌图池 |
| D2 | 图池条目"谱面信息"存储 | **引用 beatmaps 集合**：条目只存 `beatmap_id`（osu ID），详情经 fetcher / GraphQL 关联获取 |
| D3 | 检查单阻断规则 | **名称 / 时间 / 裁判缺失即阻断**（前端禁用开赛按钮，后端 `MissingStartRequirements` 同步加强为硬性校验）；**直播员保持可选，仅展示** |
| D4 | 添加用户入库时机 | **与谱面一致**：输入 osu ID → 后端 fetcher 拉取并直接 upsert 入库（复用 `beatmapByOsuId` 语义）→ 前端展示信息 → 确认关闭、列表刷新 |

规则解释（默认按此实现，如有异议请在评审时指出）：

- **R1 队伍就绪门槛**：队伍在被房间引用关联前必须有队长、策略师各一名。由于 D1 选择了全量替换，casual 房间同样引用队伍实体，而 casual 房间现状也要求双方策略师 → 该门槛对所有房间类型一致生效（`PATCH /rooms/:id/teams` 时即校验）。
- **R2 图池条目拓扑**：条目作为 `mappools` 文档内的**内嵌数组**存储，而非独立 `mappool_entries` 集合。理由：条目永远随图池整体读写（与现有 `PATCH /rooms/:id/mappool` 全量替换语义一致）、天然避免孤儿条目、更新原子性好。
- **R3 Shiro 槽位**：沿用现状语义 —— `mod=SHIRO` 的条目 `beatmap_id` 为空（Shiro 为无谱面槽位），引擎仍要求图池恰好 1 Shiro + 1 TB。

---

## 2. 现状要点（速览）

| 关注点 | 现状 |
|--------|------|
| 开赛链路 | `RoomCard` 确认弹窗 → `useStartRoomMatch`（REST `POST /rooms/:id/start-match`）→ `room_service` → `formal_match_factory.BuildFormalMatchSeed` |
| 开赛校验（后端权威） | `RoomSettings.MissingStartRequirements`（策略师/BP/队长/人数/MP链接）+ `matchengine.NewReadyState`（每队恰好 8 人、跨队唯一、队长在名单、恰好 1 Shiro + 1 TB、棋子全 NORMAL） |
| 开赛校验（前端镜像） | `app/lib/rooms.ts → validateRoomForStart(room: RoomSetup)`，仅在房间配置页使用，列表页未用 |
| 内嵌类型 | `domain.Mappool`（pool.go，Slots 分组）、`domain.Piece`（piece.go）、`domain.Team`（match.go，Match 内嵌值对象） |
| fetcher | `GetUser(ctx, osuID)`（读穿 + upsert）、`SyncUser`（强制刷新）、同款 Beatmap 双函数齐备 |
| GraphQL 预览语义 | `beatmapByOsuId` 查询：冷获取即 upsert，前端 `useFetchBeatmapByOsuId` 之后弹出确认 Modal 再 `POST /beatmaps`（409=已存在） |
| 管理后台 | `app/admin/page.tsx` Tabs：users / beatmaps / announcements，Panel 组件接收 `enabled` prop；`BeatmapsPanel.tsx` 为"ID 获取→确认"两段式模板 |
| verify 工具 | `tools/verify/main.go`：format / matchengine-purity / match-command-boundaries / error-contract / graphqlcompat / vet / test / build |
| initdb | `cmd/initdb/main.go`：建集合 + EnsureIndexes + schema validator（users/rooms）+ seed（手写 domain 结构体）+ `-admin-id` 建管理员 |
| seed 过期点 | seed 房间直接写 `RedPlayers/BluePlayers/Leaders/Strategists/Mappool` 内嵌字段；引用的 user 3/4 根本不存在；Beatmap 上的 `ModString/ModIndex/SelectorID/Skill` 已属放置信息，与图池实体化后语义冲突 |

---

## 3. 后端设计

### 3.1 领域模型（`internal/domain`）

**新增 `team.go` — 队伍实体（集合 `teams`）**

```go
type Team struct {
    ID           bson.ObjectID `bson:"_id" json:"id"`
    Name         string        `bson:"name" json:"name"`                     // 必填
    Description  *string       `bson:"description" json:"description"`      // 可选
    Seed         *string       `bson:"seed" json:"seed"`                     // 可选 seed 字符串
    LeaderID     *int64        `bson:"leader_id" json:"leader_id"`           // 队长（就绪必需）
    StrategistID *int64        `bson:"strategist_id" json:"strategist_id"`  // 策略师（就绪必需）
    Players      []int64       `bson:"players" json:"players"`               // 其他队员可选
    CreatedAt    time.Time     `bson:"created_at" json:"created_at"`
    UpdatedAt    time.Time     `bson:"updated_at" json:"updated_at"`
}

func (t *Team) IsReady() bool // LeaderID != nil && StrategistID != nil
```

- service 层校验：`LeaderID/StrategistID` 必须 ∈ `Players`（设置时自动补入名单亦可，实现时取其一并保持一致）；Players 内部不得重复。
- **命名冲突处理**：`match.go` 中现有内嵌 `domain.Team` 重命名为 `TeamSnapshot`（字段与 bson tag 完全不变，存量 Match 文档零迁移；编译器兜底改全量引用）。`TeamSnapshot.ID` 在开赛时直接取队伍实体的 ID。

**新增 `mappool.go` — 图池实体（集合 `mappools`）**

```go
type Mappool struct {
    ID          bson.ObjectID  `bson:"_id" json:"id"`
    Name        string         `bson:"name" json:"name"`           // 必填
    Description *string        `bson:"description" json:"description"`
    Entries     []MappoolEntry `bson:"entries" json:"entries"`
    CreatedAt   time.Time      `bson:"created_at" json:"created_at"`
    UpdatedAt   time.Time      `bson:"updated_at" json:"updated_at"`
}

type MappoolEntry struct {
    BeatmapID  *int64    `bson:"beatmap_id" json:"beatmap_id"`  // osu beatmap ID；SHIRO 槽为 nil
    Mod        PieceMod  `bson:"mod" json:"mod"`                 // NM/HD/HR/DT/FM/SHIRO/TB，必填
    Index      int       `bson:"index" json:"index"`             // 组内 1-based，必填
    SelectorID *int64    `bson:"selector_id" json:"selector_id"` // 可选选图者
    Skill      *string   `bson:"skill" json:"skill"`             // 可选谱面能力点
}
```

- **命名冲突处理**：`pool.go` 中现有运行时结构 `domain.Mappool` 重命名为 `domain.Pool`（`Slots map[PieceMod][]Piece` 不变）。`domain.Pool` 继续作为 Match 快照 / matchengine 的运行时图池，引擎零改动（verify 的 matchengine-purity 检查不受影响）。
- 实体 → 运行时转换：`mappool_service` 提供 `ToRuntime() domain.Pool`（按 Mod 分组、按 Index 排序装 Piece，SHIRO 槽 BeatmapID=nil、其余从 beatmap_id 映射）。开赛工厂从实体构建，引擎消费的仍是 `domain.Pool`。
- 条目校验：同 `(mod, index)` 不得重复；非 SHIRO 条目 `beatmap_id` 必填；beatmap 存在性由 fetcher 兜底（可选：保存时校验已入库）。

**`room.go` — RoomSettings 改造（D1 全量替换）**

```diff
 type RoomSettings struct {
-    RedStrategistUserID  *int64
-    BlueStrategistUserID *int64
-    RedPlayers           []int64
-    BluePlayers          []int64
-    RedLeader            *int64
-    BlueLeader           *int64
-    Mappool              Mappool        // 内嵌图池
+    RedTeamID            *bson.ObjectID `bson:"red_team_id"`
+    BlueTeamID           *bson.ObjectID `bson:"blue_team_id"`
+    MappoolID            *bson.ObjectID `bson:"mappool_id"`
     FirstPick            *TeamSide      // 保留
     FirstBan             *TeamSide      // 保留
     MPLink               *string        // 保留
     StreamLink           *string        // 保留
     StreamerUserID       *int64         // 保留
 }
```

**Beatmap 模型清理（建议随本需求一并做）**：删除 `ModString / ModIndex / SelectorID / Skill`（放置信息全部移入 `MappoolEntry`），保留 `Comment / CreditUserIDs / IsOriginal`。存量值由 initdb 迁移步骤搬入新建图池条目。

### 3.2 数据库层（`internal/database`）

- `EnsureIndexes` 新增：
  - `teams`：`{_id}`；`{leader_id: 1}`、`{strategist_id: 1}`（后台按人反查）；`{name: 1}`（普通索引，支持前缀搜索）。
  - `mappools`：`{_id}`；`{name: 1}`。
  - `rooms` 新增：`{settings.red_team_id: 1}`、`{settings.blue_team_id: 1}`、`{settings.mappool_id: 1}`（删除守卫的查询支撑）。
- schema validator（initdb 的 `ensureSchemaValidation` 同步）：`teams` 必填 `name/created_at/updated_at`；`mappools` 必填 `name/entries/created_at/updated_at`，`entries.items` 必填 `mod/index` 且 `mod` ∈ 七枚举。
- 集合清单（initdb `collections` slice）追加 `teams`、`mappools`。

### 3.3 Repository / Service

- `internal/repository/`：新增 `team.go`、`mappool.go`（接口 + Mongo 实现，仿 `announcement.go`），`repositories.go` 聚合结构追加 `Teams TeamRepository`、`Mappools MappoolRepository`。均提供 `ByID / Create / Update / Delete / List(分页,搜索) / ExistsByName` 等。
- `internal/service/`：
  - 新增 `team_service.go`：创建（name 必填）、更新（含队长/策略师/名单校验：成员 ∈ Players、无重复）、删除前守卫（`rooms` 中 `settings.red_team_id/blue_team_id` 引用计数 = 0 才允许删）。
  - 新增 `mappool_service.go`：CRUD + 条目全量替换（对齐现有 `PATCH /rooms/:id/mappool` 的替换语义）+ `ToRuntime()` 转换 + 删除守卫。
  - `services.go`：聚合注入。
- `room_service.go`：
  - 新增 `SetTeams(roomID, redTeamID, blueTeamID)`（admin 或非 match owner —— 沿用配置编辑权限分级）：校验队伍存在且 `IsReady()`（R1）、红蓝不得为同一队伍、双方 Players 无交集。
  - 新增 `SetMappool(roomID, mappoolID)`：校验图池存在。
  - **删除** `SetPlayers / SetStrategists / SetMappool(内嵌)` 三个旧方法与对应 handler。
  - `StartMatch` 校验重构：见 3.6。
- `formal_match_factory.go`：`BuildFormalMatchSeed` 从"读 RoomSettings 平铺字段"改为"读两支 Team 实体 + Mappool 实体"，产出 `TeamSnapshot{ID: team.ID, Side, Color: 按 side 派生, Name, Description, Seed, LeaderID, StrategistID, Players}` 与 `domain.Pool`。引擎与 matchengine 完全不动。

### 3.4 REST API 变更（`internal/server/server.go` + `internal/handler/`）

**新增（管理员 CRUD，仿 beatmap/announcement handler 模式 + `middleware.RequireRole(domain.RoleAdmin)`）**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/teams` | 创建队伍（name 必填，desc/seed 可选） |
| PATCH | `/api/v1/teams/:id` | 更新队伍（名称/描述/seed/队长/策略师/名单） |
| DELETE | `/api/v1/teams/:id` | 删除（被房间引用时 409） |

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/mappools` | 创建图池（name + 可选 desc + entries 全量） |
| PATCH | `/api/v1/mappools/:id` | 更新元信息 / 全量替换 entries |
| DELETE | `/api/v1/mappools/:id` | 删除（被房间引用时 409） |

**房间配置（authorized 组）**

| 方法 | 路径 | 说明 |
|------|------|------|
| PATCH | `/rooms/:id/teams` | 新增：设置红/蓝队伍引用（就绪校验 R1） |
| PATCH | `/rooms/:id/mappool` | 语义变更：`{mappool_id}` 选择图池实体（旧的内嵌全量替换下线） |
| ~~PATCH~~ | ~~`/rooms/:id/players`~~ | **移除** |
| ~~PATCH~~ | ~~`/rooms/:id/strategists`~~ | **移除**（策略师随队伍实体走） |

> 列表/详情读取仍全部走 GraphQL（维持"slim REST + GraphQL 读"的架构约定）。`PUT /rooms/:id/metadata` 部分更新保持不动（不支持 null 清空的现状语义不变）。

### 3.5 GraphQL schema 变更（`schema.graphql` + `internal/graphql/`）

**新增类型**

```graphql
type Team {
  id: ObjectID!
  name: String!
  description: String
  seed: String
  leader: User            # dataloader 解析
  strategist: User
  players: [User!]!       # dataloader 批量解析
  playerIDs: [Int!]!
  isReady: Boolean!       # 队长+策略师齐备
  createdAt: Time!
  updatedAt: Time!
}
type TeamPage { items: [Team!]!, page: Int!, perPage: Int!, total: Int!, totalPages: Int! }

type MappoolEntry {
  beatmap: Beatmap        # SHIRO 槽为 null
  beatmapID: Int          # 与 Beatmap.onlineID 同源（osu ID）
  mod: PieceMod!
  index: Int!
  selector: User
  skill: String
}
type Mappool {
  id: ObjectID!
  name: String!
  description: String
  entries: [MappoolEntry!]!
  createdAt: Time!
  updatedAt: Time!
}
type MappoolPage { items: [Mappool!]!, page: Int!, perPage: Int!, total: Int!, totalPages: Int! }
```

**RoomSettings 重构**：删除 `redStrategistUserID / blueStrategistUserID / redLeader / blueLeader / redPlayers / bluePlayers / mappool(内嵌)`，新增 `redTeamID / blueTeamID / mappoolID: ObjectID` 与已解析对象 `redTeam: Team`、`blueTeam: Team`、`mappool: Mappool`。

**运行时图池类型更名**：现 GraphQL `Mappool`（slots 运行时视图，用于 match 视图 / overlay）更名为 `Pool`；`Match.mappool: Pool`。前端 match 页 / overlay 的文档随之机械更名（codegen 全量兜底）。

**新增查询 / 变更**

```graphql
# 管理后台（admin 门控，directive 沿用现有 @auth/@role 机制）
teams(page: Int, perPage: Int, search: String): TeamPage!
mappools(page: Int, perPage: Int, search: String): MappoolPage!
userByOsuId(osuID: Int!): User!      # D4：fetcher.GetUser 读穿 upsert，admin-only

createTeam(input: TeamInput!): Team!                # admin
updateTeam(id: ObjectID!, input: TeamInput!): Team! # admin
deleteTeam(id: ObjectID!): Boolean!                # admin
createMappool(input: MappoolInput!): Mappool!
updateMappool(id: ObjectID!, input: MappoolInput!): Mappool!   # entries 全量替换
deleteMappool(id: ObjectID!): Boolean!
```

- resolver / mapper / dataloader：`dataloader.go` 增加按 osu ID 批量取 User 的 loader（队伍 leader/strategist/players、条目 selector 复用）；`models_gen.go` / `schema.resolvers.go` 由 gqlgen 重新生成。
- **工作流**：改 `schema.graphql` → `gqlgen generate` → 拷贝 schema 至前端 `D:/Projects/rct-hub/schema.graphql` → `pnpm codegen`（产物过期时删除 `tsconfig.tsbuildinfo`）。

### 3.6 开赛校验重构（D3）

后端 `MissingStartRequirements` 从"纯 RoomSettings 方法"升级为 service 层函数（入参 room + 两支 Team + Mappool），输出保持 `errs.NewValidationError` 的字段级 details 结构（前端 `throwOnRestError` 合并逻辑不变）。规则映射：

| 检查项 | 旧来源 | 新来源 | 阻断 |
|--------|--------|--------|------|
| 比赛名称非空 | 创建时已保证 | 不变 | （天然满足） |
| **比赛时间 scheduled_at** | 无要求 | room.scheduled_at ≠ nil | **新增硬性**（casual+match；private 不变） |
| **裁判 referee_user_id** | 无要求 | room.refereeUserID ≠ nil | **新增硬性**（casual+match） |
| 直播员 streamer_user_id | 无要求 | 不变 | 软性（仅检查单展示） |
| 双方策略师 | settings 两字段 | 两支 Team 均 `IsReady()` | 硬性 |
| 队长 + 名单 + 跨队唯一 | settings 平铺字段 | Team 实体（队长 ∈ Players、双方无交集） | 硬性 |
| 人数 | match：≥4（房间层）/ 恰好 8（引擎层） | 不变，来源改 Team.Players | 硬性 |
| 先选/先禁方 | settings | 不变 | 硬性 |
| 图池 1 Shiro + 1 TB、棋子 NORMAL、无 removed | 内嵌 slots | Mappool 实体 → `ToRuntime()` 后同规则 | 硬性 |
| MP 链接 | match 房间 | 不变 | 硬性 |

实现时需要复核的语义点（不改行为，仅确认）：casual 房间当前是否要求图池可用（现状 `validateRoomForStart` 只对 MATCH 校验图池）→ 保持现状语义，仅切换数据来源。

### 3.7 User 按需获取（D4）

- `fetcher.GetUser` / `SyncUser` 已具备全部能力，**无需改动**。
- 仅新增 GraphQL `userByOsuId`（admin-only）暴露之；语义完全对齐 `beatmapByOsuId`：冷获取即 upsert（新用户默认 `player` + `pending`，与 OAuth 首登一致）。

---

## 4. 前端设计（`D:/Projects/rct-hub`）

### 4.1 开赛前检查单对话框（核心交互改造）

**新组件** `app/rooms/components/StartChecklistDialog.tsx`，替换 `RoomCard` 内的简单确认 Modal：

- 打开即通过 react-query 拉取房间详情（复用房间配置页的 `useRoom(code)` GraphQL 查询，需含 `redTeam/blueTeam/mappool` 解析对象 + `scheduledAt/refereeUserID/settings`）。
- **分组渲染**（对应你要求的四个分项 + 引擎硬性项）：

| 分组 | 条目（✓/✗ + 当前值 + 修复提示） |
|------|------|
| 比赛名称与时间 | 名称（恒 ✓）；开赛时间未设置 → ✗ 提示"前往配置页设置"，附跳转 |
| 比赛队伍选择 | 红方队伍未选择/未就绪（缺队长或策略师）/人数不足（match 恰 8 人）/队长不在名单/双方名单重复 → 逐条 ✗ |
| 裁判与直播员 | 裁判未指定 → ✗（硬性）；直播员未指定 → ⚠ 软提示（不阻断） |
| 比赛链接与图池 | MP 链接缺失 ✗；图池未选择 ✗；图池非恰好 1 Shiro + 1 TB ✗；先选/先禁方未设置 ✗ |

- **按钮逻辑**：全部硬性条目 ✓ → "开赛"按钮启用；任一 ✗ → 禁用并汇总"N 项待处理"。每个 ✗ 条目提供"去修复"跳转（房间配置页 `/rooms/[code]`，可带锚点）。
- 提交仍走 `useStartRoomMatch`；成功后 toast + 关闭 + 列表刷新（开赛后的房间卡片状态由 `matchID` 驱动，无需额外处理）。

**`app/lib/rooms.ts` 改造**：`validateRoomForStart(room: RoomSetup)` 重构为 `buildStartChecklist(room): StartChecklist`，返回**分组结构化条目**（`{group, field, label, status: 'ok'|'error'|'warn', hint}`），供对话框直接渲染；旧扁平 `issues` 结构移除。校验规则与 3.6 表格逐条对齐（前后端一致，前端仍为镜像实现）。

### 4.2 管理后台新 tab：队伍管理 / 图池管理

`app/admin/page.tsx` Tabs 顺序调整为：**用户 → 谱面 → 队伍 → 图池 → 公告**（用户与谱面之后，符合要求）。

**`app/admin/components/TeamsPanel.tsx`**（仿 `UsersPanel`/`BeatmapsPanel` 布局：`SearchBar` + 表格 + `PaginationBar` + `EmptyTableState`，接收 `enabled` prop）：

- 列表列：名称 / seed / 队长 / 策略师 / 队员数（展开或悬停看名单）/ 就绪状态 Chip / 描述 / 更新时间。
- 创建/编辑 Modal：名称（必填）、描述、seed；队长/策略师/队员用**用户选择器**（搜索已入库用户，输入 osu ID 未命中时可直接走"添加用户"入口或 fetcher 拉取 —— 实现为：输入 osu ID → `userByOsuId` → 回填）。
- 删除确认 Modal（后端 409"被房间引用"时 toast 展示）。

**`app/admin/components/MappoolsPanel.tsx`**：

- 列表列：名称 / 描述 / 条目数（按 mod 统计徽标，如 NM×2 HD×2 …）/ 更新时间。
- 创建/编辑 Modal：名称、描述 + **条目编辑器**（复用现有 `app/rooms/[code]/components/MappoolEditor.tsx` 的分组/槽位交互思路改造）：每条目 = 谱面（osu ID 输入 → `beatmapByOsuId` 获取回填，复用谱面板两段式）+ mod 下拉 + index + 选图者 + 能力点；SHIRO 特殊条目（无谱面）。保存走 `createMappool/updateMappool`（entries 全量替换）。

**hooks（`app/lib/hooks.ts`）**：按现有约定新增 `useTeams(enabled, page, perPage, search?)`、`useCreateTeam/useUpdateTeam/useDeleteTeam`、`useMappools(...)`、`useCreateMappool/useUpdateMappool/useDeleteMappool`、`useSetRoomTeams`、`useSetRoomMappool`；GraphQL 文档加入 `app/graphql/`，重跑 codegen。

### 4.3 用户管理：添加用户（D4）

`UsersPanel.tsx` 顶部新增「添加用户」按钮，两段式 Modal（完整复刻 `BeatmapsPanel` 的 bmModal 模式）：

1. 输入 osu ID → `useFetchUserByOsuId()`（GraphQL `userByOsuId`，fetch 即 upsert）。
2. 展示用户卡片（头像、用户名、国家、全球排名、pp）→ 「完成」关闭，invalidate `["admin","users"]` 列表刷新。已存在用户（列表可见）→ 后端幂等 upsert，前端无 409 分支。

### 4.4 房间配置页 / 编辑对话框改造

- `app/rooms/[code]/page.tsx`（赛前配置页）：删除 选手/策略师/图池 三个编辑区块，替换为：**红方/蓝方队伍选择器**（下拉列出 `isReady` 队伍，显示名称+人数；选中后展示队伍摘要）+ **图池选择器**（下拉列出图池，显示名称+条目统计）。保存走 `PATCH /rooms/:id/teams`、`PATCH /rooms/:id/mappool`。
- `RoomEditDialog.tsx`：字段同步替换（队伍/图池下拉）。
- `MappoolEditor.tsx`：从房间配置中退役（其交互逻辑迁移至 MappoolsPanel 的条目编辑器，避免两份实现）。
- `RoomCard.tsx`：`TeamSummary` 区块改为读取 `redTeam/blueTeam`（名称、队长、人数）；开赛按钮 → `StartChecklistDialog`。
- `useParams` 动态路由页继续遵守 `<Suspense>` 约定；所有数据请求保持 react-query + `credentials:"include"`。

---

## 5. initdb / verify 翻新

**`cmd/initdb/main.go`**

1. 集合清单 + EnsureIndexes + validator 覆盖 `teams` / `mappools`（见 3.2）。
2. **seed 重写**（修复过期结构）：
   - 种子用户：admin + 16 名轻量用户（`seed-p01`…，avatar 用 `a.ppy.sh/{id}` 占位）；
   - 种子队伍 ×2：红/蓝各 8 人（含队长、策略师）→ `IsReady()=true`，可直接被房间引用；
   - 种子图池 ×1：NM×2 / HD×2 / HR×2 / DT×2 / FM×2 / SHIRO×1 / TB×1（beatmap 引用种子谱面，允许复用同一谱面填充多槽，仅开发用途）；
   - 种子房间：`red_team_id/blue_team_id/mappool_id` 引用上述实体，删除全部旧内嵌字段写入；
   - 种子 Match（保留）：内嵌 `TeamSnapshot`（字段名与 bson 不变）+ `domain.Pool`。
3. **新增 `-migrate-rooms` 迁移命令**（幂等，服务于已有数据的环境）：
   - 扫描含旧内嵌 `settings.red_players` 等字段的 rooms → 为红/蓝各建队伍实体（从旧 players/leader/strategist 生成）→ 内嵌图池转 `mappools` 实体 → 写回三个引用 ID 并 `$unset` 旧字段；
   - Beatmap 上的 `mod_string/mod_index/selector_id/skill` 若有值，搬入迁移生成的图池条目；
   - 迁移后跑一遍开赛校验打印报告（哪些房间仍不满足新硬性规则）。

**`tools/verify/main.go`**

- 现有检查（format / matchengine-purity / match-command-boundaries / error-contract / graphqlcompat / vet / test / build）因同模块编译自动覆盖新代码，无需结构性改动；
- **新增一条轻量检查 `seed-consistency`**：把 seed 构造逻辑抽到可测试的纯函数包（如 `cmd/initdb/seed.go` 导出 builder），单测断言"种子房间 + 种子队伍 + 种子图池能通过 service 层开赛校验规则"（不含 scheduled_at/referee 的项单独豁免或 seed 补齐）—— 防止 seed 与领域模型再次漂移；
- graphqlcompat 继续兜底 schema 与 resolver 的一致性。

---

## 6. 实施阶段划分（每阶段结束仓库均可编译、verify 可过）

| 阶段 | 内容 | 交付物 |
|------|------|--------|
| **P1 后端实体 + 后台 CRUD**（纯增量，无破坏） | domain 两实体 + 内嵌类型更名（TeamSnapshot/Pool）；repository / database / service / handler / 路由（teams、mappools CRUD）；GraphQL 新类型 + 分页查询 + mutations；`userByOsuId`；gqlgen + 前端 codegen | 后端 API 全量可用；管理后台新 tab（4.2）+ 添加用户（4.3）可先行接入 |
| **P2 房间引用切换**（破坏性，前后端同切） | RoomSettings 字段替换 + room_service（SetTeams/SetMappool，删旧三端点）+ formal_match_factory 改读实体 + GraphQL RoomSettings 重构 + `Pool` 更名；前端房间配置页/RoomEditDialog/RoomCard 类型与选择器改造；initdb（集合/validator/seed 重写 + `-migrate-rooms`）；Beatmap 放置字段清理 | 全量替换完成（D1） |
| **P3 开赛前检查单** | 后端 `MissingStartRequirements` 升级为 service 层结构化校验 + 新硬性规则（D3）；前端 `buildStartChecklist` + `StartChecklistDialog` + RoomCard 接入 | 检查单完整可用 |
| **P4 收尾** | verify `seed-consistency` 检查；全量 `go test ./...`、verify、前端 build；文档（AGENTS.md 契约段落同步） | 验收 |

> P2 是唯一破坏性变更点：REST 房间配置三端点移除 + GraphQL RoomSettings 字段删减，前端必须同 PR/同一批提交内完成 codegen 与页面改造。

---

## 7. 风险与待确认问题

1. **存量数据迁移 vs 重灌**：开发库若可接受 `--drop --seed` 重灌，`-migrate-rooms` 可以降级为"尽力而为"不作为验收项 —— 需要你确认目标环境里是否有必须保留的真实房间数据。
2. **队伍就绪门槛范围（R1）**：当前解释为"任何房间类型引用队伍都要求队长+策略师"。若你希望 casual 房间允许引用未就绪队伍（仅 match 强制），需调整 `SetTeams` 校验与检查单文案。
3. **图池条目内嵌 vs 独立集合（R2）**：报告按内嵌数组实现；若你坚持独立 `mappool_entries` 集合（字面"一个表"），repository 层需要补 join 语义，工作量 +0.5 天左右。
4. **GraphQL 运行时类型更名 `Mappool → Pool`**：会触发前端 match 页/overlay 的文档与生成类型机械更新（codegen 兜底）；若想零 churn 可改为"实体叫 MappoolRecord"，但 API 命名长期看不如前者干净。
5. **casual 房间图池语义**：3.6 表格按"保持现状语义"处理（casual 不校验图池构成）；若 casual 也开正式比赛（引擎消费图池），需在 P2 实现时实测确认。
