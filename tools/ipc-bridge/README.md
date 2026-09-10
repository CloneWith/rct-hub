# RCT Hub — tourney IPC bridge

直播员 Overlay 的本地分数桥接小工具（M5 / R2 / D8）。

osu! tournament client 会把比赛分数写到本地 IPC 文件（`ipc.txt`），浏览器
无法直接读文件；本工具负责「读文件 → 本机 WebSocket 广播」，Overlay 页面
（`/overlay/[code]` 直播员面板）连上后即可显示实时分数。

**数据仅在本机回路，绝不进入 RCT Hub 后端（D8）。**

## 运行

```bash
node tools/ipc-bridge/server.mjs
```

环境变量：

| 变量 | 默认 | 说明 |
|------|------|------|
| `IPC_FILE` | `./ipc.txt` | tournament client 的 IPC 文件路径 |
| `IPC_BRIDGE_PORT` | `8455` | 本机 WS 监听端口 |
| `IPC_POLL_MS` | `500` | 文件轮询间隔 |

示例（自定义文件路径）：

```bash
IPC_FILE="C:/Users/me/osu!Tournament/ipc.txt" node tools/ipc-bridge/server.mjs
```

## 消息契约

桥接工具向所有客户端推送：

```json
{
  "type": "ipc",
  "score1": 2,
  "score2": 1,
  "scoreVisible": true,
  "bestOf": 9,
  "source": "ipc.txt",
  "updatedAt": 1785200000000
}
```

前端对应实现：`app/overlay/[code]/lib/useIpcBridge.ts`（自动重连 + 指数退避）。
IPC 未运行时页面显示「IPC 未运行」，直播画面不受影响。

## 已知限制（规划文档 R2）

- 若前端部署为 https，浏览器连接 `ws://127.0.0.1` 会被混合内容策略拦截；
  需本机 wss 证书，或 Overlay 以 http 场景使用。
- 本工具为纯 Node 实现（手写最小 RFC 6455），无 npm 依赖，仅服务本机。

## 兼容性

IPC 文件解析兼容新旧字段命名：`score1/team1Score/redScore`、
`score2/team2Score/blueScore`、`scoreVisible/score_visible/isScoreVisible`、
`bestOf/best_of/firstTo`，字符串数字也会兜底转换。
