/**
 * Minimal `WebSocket` stand-in for unit tests.
 *
 * Mirrors just the surface `MatchWsClient` (in
 * `app/rooms/[code]/match/lib/ws-client.ts`) actually touches: a constructor
 * taking a URL, `send`, `close`, and the four `onopen/onmessage/onclose/onerror`
 * callbacks. Tests can drive it via `open()`, `receive(obj)`, `serverClose()`.
 *
 * Instances are collected on `FakeWebSocket.instances` so tests can assert
 * connection counts (reconnect attempts, etc.) without a registry.
 */
export type FakeWebSocketEvent = { data: unknown };

export class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((ev: FakeWebSocketEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  sent: string[] = [];
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
  }

  /** Drive a successful handshake. */
  open(): void {
    this.onopen?.();
  }

  /** Deliver a parsed JSON payload as the next message. */
  receive(obj: unknown): void {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }

  /** Simulate the server closing the connection. */
  serverClose(): void {
    this.onclose?.();
  }

  /** Simulate a transport-level error (no reconnect logic — the client decides). */
  serverError(): void {
    this.onerror?.();
  }
}

/** Install FakeWebSocket as the global WebSocket; pair with `uninstallFakeWebSocket`. */
export function installFakeWebSocket(): void {
  (globalThis as unknown as { WebSocket: typeof FakeWebSocket }).WebSocket = FakeWebSocket;
}

/** Restore the original (undefined) global WebSocket. */
export function uninstallFakeWebSocket(): void {
  delete (globalThis as unknown as { WebSocket?: unknown }).WebSocket;
}