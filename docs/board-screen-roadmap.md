# 棋房（比赛核心）前端开发规划路线

> 生成日期：2026-08-25
> 依据：`C:/Users/clone/Desktop/board-screen-plan.md`（原始规划）、`rctHubBackend` 后端代码实况、`../osu`（osu.Game.Tournament，旧 Fumo 直播客户端）代码考古
> 原则：**后端仓库代码是唯一事实来源**；本文档所有契约均直接取自代码，与原始规划文档冲突处以本文档为准。

---

## 0. 已确认的决策记录（与用户对齐）

| # | 议题 | 决策 |
|---|------|------|
| D1 | 管理员撤销（原规划 §14.8） | **本期不做**。后端无 UndoAction 实现；前端在裁判控制台预留撤销入口与审计日志展示，异常场景先用 `suspendMatch`/`skipCurrentAction`/`abortMatch` 处理，待后端实现后接入 |
| D2 | OBS Overlay 认证 | **放弃 OBS 专用 token 机制**，转向**浏览器直播**路线：直播员在已登录浏览器中打开 Overlay/直播页面（cookie 鉴权天然可用），由浏览器窗口采集推流 |
| D3 | 多裁判 | 按后端现状实现**单裁判**（`refereeUserID` 单值），UI 支持更换裁判；多裁判作为后端后续需求提出 |
| D4 | 开发顺序 | **核心只读层 → 策略师 → 裁判 → 直播员/Overlay** |
| D5 | 前端规则引擎 | **轻量方案**：不移植规则引擎。合法性判断完全由后端 `strategistView/captainView/refereeView.analysis`（`allowedActions`/`legalPlacements`/`shiroCells`/`robberyPlans`）驱动；前端仅做"非本人回合/明显误操作"的本地拦截 |
| D6 | 棋子视觉 | **SVG + CSS 重绘**（沿用旧 ModColours 配色），先以默认图标/文字占位，后期素材到位后可替换图标位 |
| D7 | 聊天 | 棋房主体不做聊天；仅裁判端展示 IRC 观察流（辅助确认结果） |
| D8 | 直播端分数 | 直播员页面尝试**本地 tourney IPC 连接**，数据仅直播员设备本地显示、**不上传**；受浏览器能力限制需本地桥接工具（见 §7 风险） |
| D9 | Win 结果确认权归属（原规划 §14.6） | **仅裁判（或经 IRC）确认，策略师不参与**：① 裁判在 `WAITING_FOR_RESULT` 阶段直接 `confirmBeatmapResult`/`confirmTbResult`；② 后端 IRC 从 MP 频道消息解析出建议结果（`winningTeam + boardPieceID`），裁判一键 `confirmIRCResult`（内部同样执行 ConfirmBeatmapResult，`actorForCommand` 仍校验裁判/admin 权限——IRC 只是建议来源，不是独立确认通道）。策略师在结果阶段只有只读等待态 UI，前端不做任何"策略师确认胜负"交互 |

---

## 1. 后端契约摘要（前端对接的事实来源）

### 1.1 实时通道 — `GET /ws/match`（只读 WebSocket）

来源：`internal/realtime/gateway.go`。

**连接**：cookie 会话鉴权（`rcthub_session`），任何 verified 且未封禁的用户可订阅任意比赛（即观众天然可看）。连接数限制：每用户 8 条、全局 256 条（见 §7 风险 R1）。

**协议**（`schemaVersion: 1`，首条上行消息 10s 内必须送达）：

```jsonc
// 客户端 → 服务器（唯一上行）
{ "type": "subscribe", "schemaVersion": 1, "matchId": "<ObjectID hex>" }

// 服务器 → 客户端（每条消息都带 serverTime，UTC）
{ "type": "snapshot", matchId, version, sequence, snapshot }   // 订阅成功后立即下发全量快照
{ "type": "event", matchId, sequence, version, event, snapshot } // 每个事件附带该版本完整快照
{ "type": "error", code, message }            // INVALID_SUBSCRIPTION / UNSUPPORTED_SCHEMA_VERSION / INVALID_MATCH_ID / FORBIDDEN / MATCH_NOT_FOUND / EVENT_SOURCE_UNAVAILABLE
{ "type": "resync_required", matchId, code, nextSequence }  // EVENT_GAP / EVENT_PAYLOAD_INVALID / EVENT_STATE_UNAVAILABLE → 前端必须重新订阅
```

**事件结构**（`realtime.publicEvent`）：

```jsonc
{ "id": "...", "type": "PIECE_PLACED", "resultingVersion": 42, "occurredAt": "...",
  "fact": { "team": "RED", "poolSlotId": "NM5", "boardPieceId": "...", "boardPieceIds": [],
            "cell": "A1", "durationMilliseconds": 60000, "requestId": "...", "tbBasis": "...", "playerIds": [] } }
```

**快照结构**（`realtime.snapshot`，camelCase）：`version / lifecycle / phase / firstBan / firstPick / turn / activeTeam / poolSlots[{id,mod,state}] / board.cells[{cell,row,col,zone,piece}] / wonCounts / timer{startedAt,durationMilliseconds,paused,remainingAtPauseMilliseconds} / robberyUsed / teamPauseUsed / rosters{red,blue} / pendingPieceId / pendingTBRequest / tbEntry / winner / result / stalemate`。

**关键语义**：
- 事件按 `sequence` 严格递增推送，检测到空洞即 `resync_required` 并断开；
- 服务端 500ms 轮询 outbox，事件延迟 ≤ ~0.5s；
- **命令不通过 WS 上行**——所有写操作走 GraphQL mutation；
- 断线重连 = 重新订阅（新 snapshot 起步），无增量重放协议；前端重连策略由自身实现（指数退避）。

### 1.2 命令提交 — GraphQL mutations（权威入口）

来源：`schema.graphql` + `internal/matchcommand/orchestrator.go`。

所有命令携带 `CommandMeta { matchId, expectedVersion, commandId }`：

- `commandId` 必须是**非零 UUID**（前端每次操作 `crypto.randomUUID()` 生成；重试复用同一 ID 实现幂等）；
- `expectedVersion` 与服务器不符 → `MATCH_VERSION_CONFLICT`（错误对象带 `currentVersion`，前端据此对齐后重试或放弃）；
- 重复 commandId 且请求体一致 → `disposition: REPLAYED`，直接采用返回的 snapshot（防双击/网络重发）。

**命令清单**（`MatchCommandResult { commandId, disposition, previousVersion, resultingVersion, currentVersion, snapshot, events, error }`）：

| 分组 | Mutation |
|------|----------|
| 生命周期 | `startMatch`（Referee，READY→RUNNING） |
| 策略师 | `banPoolSlot`、`placePiece`（poolSlotId+position row/col）、`placeShiro`、`robPiece`（targetPieceId + sacrificeSets: `[[pieceId]]`）、`requestTb`（requestId 自生成 UUID）、`respondTbRequest`（accept/reject） |
| 裁判结果 | `confirmBeatmapResult`（boardPieceId + winningTeam，WAITING_FOR_RESULT 阶段）、`confirmTbResult`、`recordSurrender`（surrenderingTeam + confirmingPlayerIds：4 名不同 roster 玩家含队长 + reason） |
| 裁判计时器 | `grantAdditionalTime`（每队每场一次）、`calibrateTimer`（remainingMilliseconds+reason）、`pauseTimer`/`resumeTimer` |
| 裁判流程 | `suspendMatch`/`resumeMatch`、`skipCurrentAction`（过期 Ban/Pick）、`abortMatch`、`startTb`（TB_PREPARATION，过期后需 reason） |
| 裁判代理（安全开关） | `refereeBanPoolSlot` / `refereePlacePiece` / `refereePlaceShiro` / `refereeRobPiece` / `refereeRequestTb` / `refereeRespondTbRequest`（actingTeam + **必填 reason**，不绕过棋盘规则，只覆盖行动方与计时器过期） |
| IRC 自动化 | `confirmIRCResult`（observationId+boardPieceId+winningTeam）、`rejectIRCObservation`、`retryIRCJob`、`retryMatchAutomation`、`retryBeatmapMetadata` |

**规则要点**（摘自 `matchengine`，影响前端交互设计）：
- 回合：Ban 阶段 turn 从 -3 到 0（ABBA 顺序由引擎管理），Pick 从 1 起 ABAB；`activeTeam` 为空表示当前阶段无策略师行动；
- TB 协商：turn 11–14 队长可 `requestTb`，对方队长 `respondTbRequest`；turn 15 起引擎在夺棋条件耗尽时自动进入 TB_PREPARATION；
- 夺棋 `robPiece`：一次提交完整方案（牺牲集 + 目标），引擎校验"目标参与结果连成线"；后端已在 `analysis.robberyPlans` 给出**全部合法方案**，前端只需呈现与选择；
- 胜负：四连 / TB / 认输 / 流局 WON 数多者胜；WON 数相等的流局进入 `ADJUDICATION_REQUIRED`（无胜者，需裁判人工处置→abort 或后端裁决）；
- 生命周期：`READY → RUNNING → (SUSPENDED) → FINISHED / ABORTED / ADJUDICATION_REQUIRED`；阶段：`NONE / BAN / PICK / WAITING_FOR_RESULT / TB_PREPARATION / TB_PLAYING`。

### 1.3 角色视图 — GraphQL 查询

`match(id:)` / `matchByCode(code:)` 返回 `Match`，其上已有服务端计算好的视图（均 `forceResolver`）：

| 视图 | 谁可见 | 内容 |
|------|--------|------|
| `spectatorView`（非空） | 所有人 | board / wonCounts / currentPhase / activeTeam / turnNumber / lifecycle |
| `overlayView`（非空） | 所有人 | board / wonCounts / timer / lifecycle / phase / activeTeam |
| `strategistView` | 当前房间的策略师 | isMyTurn / myTeam / analysis（allowedActions、banPoolSlotIDs、legalPlacements、shiroCells、robberyPlans、TB 协商状态） |
| `captainView` | 队长 | myTeam / analysis（TB request/respond 能力） |
| `refereeView` | 裁判/admin | snapshot / analysis / suspensionReason / abortReason / auditLog(limit) / automationIssues(limit) |

> 前端策略：**初始渲染**用 GraphQL 视图（拿角色能力 + 用户资料），**实时更新**用 WS snapshot（含全部快照字段）。注意 WS snapshot 不含 analysis（合法动作列表），命令被拒时以错误码为准；因此策略师界面的合法高亮需要"GraphQL 视图 + 最新 WS snapshot"叠加计算（详见 §3.4）。

### 1.4 赛前配置 — REST（`/api/v1`，cookie 鉴权）

`POST /rooms`（admin）、`PATCH /rooms/:id/{metadata,strategists,streamer,referee,mappool,bp-order,players,mp-link,stream-link}`、`POST /rooms/:id/start-match`（admin 或该 match 房间被指派裁判）。开赛时后端 `BuildFormalMatchSeed` 校验配置完备性（两队各 8 名唯一玩家、队长在队内、恰好 1 Shiro + 1 TB 槽、BP 双方合法）并创建 READY 状态 Match。

图池谱面元数据异步解析（`BeatmapMetadataStatus: NOT_CONFIGURED/READY/PENDING/FAILED`），失败可 `retryBeatmapMetadata` —— 满足"保存未解析 BID、稍后刷新"的需求。

### 1.5 IRC 观察流（裁判端）

`ircObservations(matchId, channel)`（含建议结果 `winningTeam + boardPieceID`）、`ircJobs(matchId)`、`ircConnectionStatus(matchId)`。后端通过 Bancho IRC 观察 MP 频道，产出建议；裁判在裁判台看到"建议：RED 胜（piece-xxx）"后可一键 `confirmIRCResult`。

---

## 2. 与原始规划文档的偏差裁定

| 原规划内容 | 后端实况 | 裁定 |
|-----------|---------|------|
| §14.6 谱面结果：GrantWinPermission → 策略师确认 WIN | 不存在。实际为 `WAITING_FOR_RESULT` 阶段**裁判直接** `confirmBeatmapResult`；或 IRC 从 MP 频道消息解析出建议结果后由裁判一键 `confirmIRCResult`（仍走裁判权限） | D9：确认权仅在裁判（含经 IRC 建议），**策略师不参与**结果确认 |
| §14.8 管理员撤销 | 未实现 | D1：本期不做，留接口 |
| §14.2 创建棋房：RoomMembership、裁判获 ADMIN 角色 | 无 Membership 实体；能力 = 全局角色 + RoomSettings 字段（referee/red|blueStrategistUserID/streamerUserID） | 以代码为准；裁判控制台的"成员/角色"= 展示 room settings |
| 棋盘布局（AGENTS.md：HD/DT 上排、HR/NM 下排） | `board.go`：上排 `DT DT HD HD`、下排 `HR HR DT DT`（左上与右下均为 DT 区，无 NM 区；FM 落 DT 区得 NM ForceMod） | **以 board.go 为准**渲染区域配色 |
| 比赛状态 pending/active/finished/canceled（旧文档） | `READY/RUNNING/SUSPENDED/ADJUDICATION_REQUIRED/FINISHED/ABORTED` | 以代码为准 |
| Timer"启动/取消" | Timer 生命周期由阶段驱动；裁判操作为 pause/resume/calibrate/grantAdditionalTime/skip | 以代码为准 |
| 策略师确认暂停/认输请求 | 无策略师发起的暂停/认输通道；认输=裁判 `recordSurrender`（4 名玩家证据） | 以代码为准；前端 UI 按裁判录入认输证据设计 |
| Overlay token 认证（§OBS Overlay） | 无 token 机制 | D2：浏览器直播路线 |
| 命令携带 expectedVersion/commandId | 已实现且 commandId 强制 UUID | 完全对齐 |

---

## 3. 前端架构设计

### 3.1 路由与页面

```
app/rooms/[code]/
├── page.tsx            # 房间详情（赛前配置 + 房间信息 + "进入棋房"入口）
├── components/         # 配置面板（图池编辑、BP 顺序、选手/策略师/裁判指派、MP 链接、开赛）
└── match/
    ├── page.tsx        # 棋房（按角色渲染，详见 3.3）
    ├── MatchLiveProvider.tsx
    ├── components/
    │   ├── board/      # BoardGrid / BoardCell / ChessPiece(SVG) / ZoneBadge
    │   ├── pool/       # MapPoolPanel / PoolSlotCard
    │   ├── info/       # MatchHeader / TeamScore / PhaseIndicator / TurnIndicator / Countdown / HistoryTimeline
    │   ├── strategist/ # StrategistActionBar / RobberyFlowDialog / TBRequestDialog
    │   ├── referee/    # RefereeConsole / TimerControls / IRCObservationList / AuditLogPanel / ProxyReasonDialog
    │   └── streamer/   # StreamerPanel / OverlayLink / IPCStatusBadge
    └── lib/
        ├── ws-client.ts    # WS 订阅客户端（重连/退避、resync、sequence 校验、serverTime 偏移）
        ├── commands.ts     # 命令提交层（expectedVersion 管理、commandId UUID、冲突恢复、两种模式）
        ├── errors.ts       # MatchErrorCode → 中文提示映射表
        ├── timer.ts        # 计时器渲染：serverTime 偏移 + startedAt/duration/remainingAtPause 计算
        └── role.ts         # 角色/能力推导（canControl / isStrategistOf / myTeam）
app/overlay/[code]/page.tsx  # 直播 Overlay：无导航、透明背景、自动连接 WS、自动重连、角标显示直播员身份
```

- 入口：`/rooms` 卡片对已开局（有 match）房间链接到 `/rooms/[code]/match`，未开局链接到 `/rooms/[code]`；
- 棋房页对窄屏（< ~900px 宽）显示全屏提示（旋转设备/调整窗口），与全局布局解耦。

### 3.2 实时状态层 — `MatchLiveProvider`

单一 Provider 承载一场比赛（一个客户端组件树）：

- **状态**：`{ status: connecting|live|reconnecting|desynced|failed, snapshot, lastEvent, serverTimeOffset }`；
- **实现**：`useReducer` + `useSyncExternalStore` 风格的轻量 store（不引入 zustand；与项目 `useIsClient` 惯例一致），WS 消息直接 dispatch；命令结果 snapshot 也 dispatch（WS 事件与 mutation 响应竞态时以 `version` 高者为准、相同 version 幂等跳过）；
- **重连**：`onclose`/`onerror` 后指数退避（1s→2s→…→30s 封顶），重连即重新订阅拿新 snapshot；`resync_required` 同样处理；页面 `visibilitychange` 恢复时若静默超过阈值主动重连；
- **刷新恢复**：页面刷新 → GraphQL `matchByCode` 拿初始视图 + WS 重新订阅，状态零丢失（满足"刷新后恢复"需求）。

### 3.3 角色视图矩阵（同一棋房页面的渲染分支）

| 角色 | 数据源 | 交互 |
|------|--------|------|
| 观众（默认） | `spectatorView` + WS snapshot | 只读棋盘/图池/比分/阶段/计时器/连接状态 |
| 策略师（本房间） | `strategistView`（isMyTurn/analysis） + WS snapshot | Ban 点击、Pick 两步（选槽位→服务器合法格高亮→落子）、Shiro、夺棋事务式流程；**不参与结果确认（D9）**，`WAITING_FOR_RESULT` 阶段仅展示等待态；**乐观模式**（D5 轻量：乐观只做 UI 过渡态如"提交中/选择中"，不预渲染未来棋盘，失败按错误码回滚提示） |
| 队长 | `captainView` | TB 协商请求/接受/拒绝 |
| 裁判（本房间）/ admin | `refereeView` + WS snapshot | **消极模式**（全部操作带等待态，确认后更新）；命令面板（按 phase 过滤可用命令）、裁判代理（带 reason 弹窗=安全开关）、计时器控制、IRC 观察确认、审计日志、自动化问题、MP 链接更新（REST） |
| 直播员（本房间） | `overlayView` + WS snapshot | 只读 + Overlay 链接复制 + 本地 IPC 状态（M5） |

### 3.4 合法性驱动交互（D5 的落地方式）

- Ban 阶段（我方回合）：仅 `analysis.banPoolSlotIDs` 中的图池槽位可点击，其余置灰；
- Pick 阶段：选中槽位后，以 `analysis.legalPlacements` 过滤出该槽位的合法格并高亮（含 FM 的 forceMod 提示）；
- 夺棋：`analysis.robberyPlans` 直接给出合法方案列表，前端做"选目标棋子 → 展示可选牺牲集 → 预览 → 确认"的引导式选择（选择过程纯本地，确认才提交，满足 §14.7 事务式要求）；
- 兜底：任何命令被拒 → `errors.ts` 将 `MatchErrorCode` 映射为中文提示（如 `NOT_ACTIVE_TEAM` → "当前不是己方行动回合"），并显示 `error.currentVersion` 引导的重新同步（自动用最新 snapshot 对齐）。

### 3.5 命令提交层 — `commands.ts`

- 维护"当前 expectedVersion"（来自最新 snapshot.version）；
- 每次操作生成 `crypto.randomUUID()`，重试（仅网络失败）复用同一 ID；
- `MATCH_VERSION_CONFLICT` → 静默刷新 snapshot 后提示用户重试一次；
- `TIMER_EXPIRED` → 提示并刷新（可能裁判已 grantAdditionalTime）；
- 提交期间按钮进入等待态（消极模式）或显示本地过渡动画（乐观模式）。

### 3.6 计时器

以 WS 消息的 `serverTime` 估算本地时钟偏移；剩余时间 = `paused ? remainingAtPauseMilliseconds : durationMilliseconds - (now - startedAt)`，本地 `requestAnimationFrame/setInterval` 渲染倒计时，每次 WS 消息校准；过期不做本地裁决，只显示 0:00 + "等待裁判处理"状态（引擎语义：过期不自动推进回合）。

### 3.7 视觉规格（从旧客户端迁移，D6）

- 布局参考 BoardScreen（1920×1080 三栏：左信息 350px + 中央棋盘 + 右图池 350px + 底部指令条），改为响应式：`flex/grid`，中央棋盘 `aspect-square` 自适应，左右栏可折叠；裁判/策略师操作面板在宽屏为侧栏、窄一些时改为底部抽屉（窄屏门槛之上）；
- MOD 配色（`ModColours`，背景/文字四色组）：NM `#FFEB3B/#534D1E`、HR `#FF5733/#3B180F`、HD `#FF8D1A/#472C10`、DT `#9D73FF/#31264F`、FM `#43CF7C/#203D27`、TB `#FFA500/#714800`、RedWin `#FF5733/#4D2114`、BlueWin `#57C1FF/#263E52`、亡棋灰 `#545454`；区域底色用对应 MOD 色的 30% 透明度；
- 棋子：SVG 圆形棋子（边框 + MOD 图标/文字 + 三角纹理可选），`outcome` 决定叠加态：WON=所有权着色描边、DEAD=灰化+斜线遮罩、WAITING_RESULT=呼吸光圈、WHITE=白色；后期素材（chess-border/chess-win 等 PNG）到位后通过 ChessPiece 的渲染模式替换；
- 动画（Domain Event 驱动，Overlay 与棋房共用）：落子缩放弹入、夺棋所有权翻转过渡、四连高亮连线、胜负全屏动画（参考旧 `setWin`/TeamWin）；动画结束后一律回归服务器快照状态渲染（以 snapshot 为准，动画失败不影响状态）；
- 音效：旧 Samples/Board 下有 update/unavailable 等音效，可迁入 `public/sounds/`（非阻塞项）。

### 3.8 容错与安全

- `error.tsx` + 棋房内局部 ErrorBoundary：棋盘/图池/面板分区隔离，崩溃不影响整页；
- 所有错误展示走 `errors.ts` 映射，绝不显示 callstack/内部错误串；
- WS 断开 → 顶部全局"重连中"横幅（所有角色可见，满足"网络连接状态"可见需求）；
- 前端不自行判定权限做安全控制——不可见按钮仅是 UX，服务端是权威（原规划"隐藏按钮≠安全"原则落地）。

---

## 4. 实施里程碑

> 每阶段以本地 `go run ./tools/matchlab`（http://127.0.0.1:8091）+ 真实后端双浏览器窗口同步验证；matchlab 场景（ready/first-pick/robbery-ready/turn-13/stalemate-final）作为各阶段验收脚本。

### M1 — 核心只读层（一切的地基）
1. 同步 `schema.graphql`（后端覆盖）+ `pnpm codegen`；WS/命令相关类型进 codegen 产物；
2. `ws-client.ts`（订阅/重连/resync/serverTime 偏移）+ `MatchLiveProvider` + `timer.ts`；
3. 观众视图全量组件：BoardGrid（区域配色按 board.go 布局）、ChessPiece(SVG 占位)、MapPoolPanel、MatchHeader/比分/阶段/回合指示、Countdown、连接状态横幅、窄屏提示；
4. `errors.ts` 错误映射骨架 + 局部 ErrorBoundary。
**验收**：双窗口订阅同一 match，matchlab 推命令两侧同步刷新；杀后端进程→恢复→前端自动重连并恢复状态；刷新页面状态恢复。

### M2 — 策略师交互
1. `commands.ts`（UUID/expectedVersion/冲突恢复）；
2. Ban/Pick/Shiro 交互（analysis 驱动高亮 + 乐观过渡态）；
3. 夺棋事务式流程（robberyPlans 引导选择 + 本地预览 + 确认提交）；
4. TB 请求/响应（队长）、策略师行动条（"当前可执行/不可执行"直白展示）；
5. `WAITING_FOR_RESULT` 下的结果等待态 UI（策略师/观众均只读，无任何确认按钮——确认动作属 M3 裁判台，D9）。
**验收**：matchlab `robbery-ready`/`turn-13` 场景走通夺棋与 TB 协商；双击/重复提交不产生重复操作（REPLAYED 幂等）。

### M3 — 裁判控制台
1. 裁判命令面板（按 phase/lifecycle 过滤可用命令，消极模式等待态）；
2. 裁判代理"安全开关"（actingTeam + reason 必填弹窗）；
3. 计时器控制（pause/resume/calibrate/grantAdditionalTime）、skip/suspend/abort（后两者 reason+二次确认）；
4. 结果确认（confirmBeatmapResult/confirmTbResult）+ IRC 观察建议一键确认（confirmIRCResult）+ ircConnectionStatus 状态徽标；
5. 审计日志面板（auditLog）+ 自动化问题列表（automationIssues + retry 动作）；
6. 认输录入（选 4 名确认玩家含队长 + reason）；
7. 撤销入口占位（禁用态 + "待后端支持"提示）。
**验收**：从 READY 开局到 FINISHED/ABORTED 全生命周期可在裁判台驱动完成；审计日志正确显示版本区间。

### M4 — 赛前配置页（`/rooms/[code]`）
1. 房间信息 + 成员/角色展示（策略师/裁判/直播员/双方选手）；
2. 图池编辑（MOD 分组槽位 + BID 录入 + 元数据状态徽标 + retryBeatmapMetadata，支持未解析保存）；
3. BP 顺序、选手/队长、策略师、裁判（单值，D3）、MP/直播链接编辑（复用现有 REST 封装）；
4. 开赛流程（`start-match` → 跳转棋房），配置完备性校验的前端预检（对齐 `BuildFormalMatchSeed` 规则：8v8 唯一、1 Shiro+1 TB、BP 合法）。
**验收**：新房间从零配置到开赛一条龙；配置缺失时开赛错误能映射为具体字段提示。

### M5 — 直播员界面 + Overlay（浏览器直播路线）
1. `/overlay/[code]`：无导航、透明背景、自动连 WS/自动重连/晚加入全量恢复、事件动画、角标显示直播员身份（头像+用户名，满足原规划防冒用要求）；
2. 直播员面板：Overlay 链接复制、预设布局切换（布局状态存 localStorage，纯本地）；
3. 本地 IPC 桥接（**独立小工具**，见 R2）：读 tourney IPC 文件 → `ws://127.0.0.1` 桥 → 直播员页面连接显示实时分数；数据不进后端（D8）；
4. 视觉精修：迁入/重绘棋子素材、胜负动画、音效。
**验收**：浏览器直播窗口 + OBS 采集浏览器画面（或窗口捕获）跑通一场完整比赛。

---

## 5. 依赖与前置任务

1. **schema 同步**（M1 第一步）：后端 `schema.graphql` → 前端根目录覆盖 + codegen（`UInt64/ObjectID/Time → string` 已有配置）；
2. 后端本地运行（`make` / docker-compose Mongo+Redis）+ matchlab 作为规则演练环境；
3. 无新增 npm 依赖（WS 用浏览器原生 `WebSocket`；动画 CSS/WAAPI；不引入 zustand/framer-motion——如动画复杂度超出 CSS 能力再评估）。

## 6. 测试策略

- `ws-client`/`timer`/`commands` 纯逻辑单测（Vitest 或直接 Node test，随项目现状）；
- 交互链路靠 matchlab 场景 + 双浏览器手工验证（记录为 `docs/` 验收清单）；
- 后续可选 Playwright：观众同步、策略师 BP 流、裁判确认流三条 e2e。

## 7. 风险与后端需求清单（需反馈给后端仓库）

| # | 风险/需求 | 说明 | 时机 |
|---|----------|------|------|
| R1 | **WS 全局 256 连接上限** | 观众规模超限将 429 拒连；需配置化上限或观众走其他广播通道（如只读轮询/Redis pubsub 扇出） | 观众开放前必须解决 |
| R2 | **本地 IPC 桥接工具** | 旧 IPC 为文件读取（`ipc.txt` 等），浏览器不可达；需一个本机小工具（读文件→localhost WS）。若前端部署为 https，浏览器连 `ws://127.0.0.1` 可能被混合内容策略拦截，需本机 wss 证书或以 http 场景使用 | M5 前评估 |
| R3 | 管理员撤销 | 后端未实现（引擎明示为编排层职责）；前端已留接口 | 后端排期后接入 |
| R4 | 多裁判 | refereeUserID 单值；如运营需要多裁判需后端改数组 | 后续 |
| R5 | analysis 时效性 | WS snapshot 不含 analysis，策略师界面高亮基于订阅时的 GraphQL 视图 + 本地 snapshot 叠加；极端情况下（他人操作瞬间）高亮可能滞后一个事件，命令被拒由错误码兜底 | 可接受，观察期 |
| R6 | 事件→动画映射 | realtime publicEvent 的 fact 字段为全集，动画层需对未知 eventType 容错（跳过动画、直接渲染 snapshot） | 实现时注意 |

---

## 8. 与现有代码的衔接

- 复用：`app/lib/api.ts`（GraphQL/REST 底层 + `credentials: "include"`）、`app/lib/hooks.ts`（react-query 约定）、`useIsClient`、`AuthContext`（`useMe` 判定登录与角色）、`app/lib/rooms.ts`（`canControlRoom` 等权限工具、ROOM_ROUNDS）；
- 新页面均为客户端组件（`"use client"`），棋房页不走 SSR 数据（WS 驱动）；
- `BoardShowcase`/`PieceGlyph`（首页展示组件）可提取部分棋盘渲染逻辑复用，但正式棋盘组件按本规划新建于 `app/rooms/[code]/match/components/board/`；
- HeroUI v3 组件按既有陷阱清单使用（Chip 用 `variant="soft"` 区分颜色、Button 无 isLoading 用 isDisabled 等）。
