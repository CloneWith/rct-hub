#!/usr/bin/env node
/**
 * RCT Hub — tourney IPC bridge（独立小工具，M5 / R2 / D8）
 *
 * 读取 osu! tournament client 的 IPC 文件（默认 ./ipc.txt），解析分数状态，
 * 通过 ws://127.0.0.1:<port> 广播给直播员 Overlay 页面。
 *
 * 设计约束：
 * - 零 npm 依赖（手写最小 RFC 6455 服务端：握手 + 文本帧 + ping/pong）
 * - 数据仅在本机回路，绝不转发到 RCT Hub 后端（D8）
 * - 文件变化用轮询 + mtime 检测（跨平台可靠，无需 fs.watch）
 *
 * 用法：
 *   node tools/ipc-bridge/server.mjs
 * 环境变量：
 *   IPC_FILE        IPC 文件路径，默认 ./ipc.txt
 *   IPC_BRIDGE_PORT 监听端口，默认 8455
 *   IPC_POLL_MS     轮询间隔，默认 500
 *
 * 消息契约（Overlay 的 useIpcBridge 消费）：
 *   { "type": "ipc", "score1": number, "score2": number,
 *     "scoreVisible": boolean, "bestOf": number|null,
 *     "source": "ipc.txt", "updatedAt": epochMs }
 */

import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";

const IPC_FILE = process.env.IPC_FILE || "./ipc.txt";
const PORT = Number(process.env.IPC_BRIDGE_PORT || 8455);
const POLL_MS = Number(process.env.IPC_POLL_MS || 500);

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

// ---------------------------------------------------------------------------
// 最小 WebSocket 服务端（仅需：握手、发文本帧、回 pong、关连接）
// ---------------------------------------------------------------------------

/** 发送一个完整的文本帧（server→client 不 mask）。 */
function sendText(socket, text) {
  const payload = Buffer.from(text, "utf8");
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  socket.write(Buffer.concat([header, payload]));
}

/**
 * 从 upgrade 请求中提取单个未分片客户端帧（ping/close 均单帧小负载）。
 * 返回 { opcode, payload }；不完整返回 null；mask 的负载会解掩码。
 */
function readClientFrame(buffer) {
  if (buffer.length < 2) return null;
  const b0 = buffer[0];
  const b1 = buffer[1];
  const opcode = b0 & 0x0f;
  const masked = (b1 & 0x80) !== 0;
  let len = b1 & 0x7f;
  let offset = 2;
  if (len === 126) {
    if (buffer.length < 4) return null;
    len = buffer.readUInt16BE(2);
    offset = 4;
  } else if (len === 127) {
    if (buffer.length < 10) return null;
    const big = buffer.readBigUInt64BE(2);
    if (big > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    len = Number(big);
    offset = 10;
  }
  const maskLen = masked ? 4 : 0;
  if (buffer.length < offset + maskLen + len) return null;
  let payload = buffer.subarray(offset + maskLen, offset + maskLen + len);
  if (masked) {
    const mask = buffer.subarray(offset, offset + 4);
    const out = Buffer.alloc(len);
    for (let i = 0; i < len; i++) out[i] = payload[i] ^ mask[i % 4];
    payload = out;
  }
  return { opcode, payload, consumed: offset + maskLen + len };
}

// ---------------------------------------------------------------------------
// IPC 文件读取（兼容新旧字段命名）
// ---------------------------------------------------------------------------

function pickNum(obj, keys) {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function pickBool(obj, keys) {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
  }
  return null;
}

function normalizeIpc(raw) {
  const score1 = pickNum(raw, ["score1", "team1Score", "redScore"]);
  const score2 = pickNum(raw, ["score2", "team2Score", "blueScore"]);
  const scoreVisible = pickBool(raw, ["scoreVisible", "score_visible", "isScoreVisible"]);
  const bestOf = pickNum(raw, ["bestOf", "best_of", "firstTo"]);
  // 旧版字段可能是字符串（如 "5"），做一次兜底转换
  const toNum = (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v);
  return {
    score1: score1 != null ? score1 : toNum(raw.score1) ?? null,
    score2: score2 != null ? score2 : toNum(raw.score2) ?? null,
    scoreVisible: scoreVisible ?? false,
    bestOf: bestOf != null ? bestOf : toNum(raw.bestOf) ?? null,
  };
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

const clients = new Set();

const server = createServer((req, res) => {
  res.writeHead(426, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("ipc-bridge 仅接受 WebSocket 升级连接（ws://127.0.0.1:" + PORT + "）");
});

server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if (!key || req.headers.upgrade?.toLowerCase() !== "websocket") {
    socket.destroy();
    return;
  }
  const accept = createHash("sha1").update(key + WS_GUID).digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );

  let buf = Buffer.alloc(0);
  const client = { socket, alive: true };

  socket.on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      const frame = readClientFrame(buf);
      if (!frame) break;
      buf = buf.subarray(frame.consumed);
      if (frame.opcode === 0x9) {
        // ping → pong（携带相同 payload）
        const pong = Buffer.concat([Buffer.from([0x8a, frame.payload.length]), frame.payload]);
        socket.write(pong);
      } else if (frame.opcode === 0x8) {
        socket.end();
        break;
      }
      // 其他帧（文本/二进制/分片）忽略——本工具只推送
    }
  });

  socket.on("error", () => {
    /* 连接重置等错误：清理逻辑统一走 close */
  });

  socket.on("close", () => {
    clients.delete(client);
  });

  socket.on("pong", () => {
    client.alive = true;
  });

  clients.add(client);
  console.log(`[ipc-bridge] client connected (${clients.size} total)`);
});

// 心跳：定期 ping 清理僵死连接
setInterval(() => {
  for (const c of clients) {
    if (!c.alive) {
      c.socket.destroy();
      clients.delete(c);
      continue;
    }
    c.alive = false;
    try {
      c.socket.write(Buffer.from([0x89, 0x00]));
    } catch {
      /* ignore */
    }
  }
}, 15_000).unref();

function broadcast(message) {
  const text = JSON.stringify(message);
  for (const c of clients) {
    try {
      sendText(c.socket, text);
    } catch {
      /* 单客户端失败不影响其余 */
    }
  }
}

// 轮询 IPC 文件（mtime 变化才解析广播）
let lastMtimeMs = 0;
let lastPayload = "";

async function poll() {
  let st;
  try {
    st = await stat(IPC_FILE);
  } catch {
    lastMtimeMs = 0;
    lastPayload = "";
    return;
  }
  if (st.mtimeMs === lastMtimeMs) return;
  lastMtimeMs = st.mtimeMs;

  let content;
  try {
    content = await readFile(IPC_FILE, "utf8");
  } catch {
    return;
  }
  if (content === lastPayload) return;
  lastPayload = content;

  let raw;
  try {
    raw = JSON.parse(content);
  } catch {
    console.warn(`[ipc-bridge] 忽略无法解析的 IPC 内容（${IPC_FILE}）`);
    return;
  }
  const norm = normalizeIpc(raw);
  broadcast({
    type: "ipc",
    ...norm,
    source: IPC_FILE,
    updatedAt: Date.now(),
  });
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[ipc-bridge] listening ws://127.0.0.1:${PORT}`);
  console.log(`[ipc-bridge] watching ${IPC_FILE} every ${POLL_MS}ms`);
  setInterval(poll, POLL_MS).unref();
});
