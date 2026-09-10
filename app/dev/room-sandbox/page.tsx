"use client";

/**
 * /dev/room-sandbox — local preview for the board screen (棋房).
 *
 * The full board UI tree normally sits behind a real room + WebSocket
 * channel; this route mounts `SandboxApp`, which builds a fake
 * `BootstrapMatch` from in-memory fixtures and lets the user toggle the
 * phase (PENDING → FINISHED) and viewer role (observer / strategist /
 * captain / referee / admin) without spinning up the backend.
 *
 * This page is reachable in any environment — the sandbox is dev-tooling
 * for frontenders, not a production feature. Hide / remove before shipping
 * a release if you don't want it indexed.
 */

import { Suspense } from "react";
import { useIsClient } from "@/app/lib/hooks";
import SandboxApp from "./SandboxApp";

function SandboxInner() {
  // `useSearchParams` (used inside SandboxApp for URL-backed state) needs
  // the client boundary. Render nothing until we're hydrated so we don't
  // produce an SSR/hydration mismatch.
  const isClient = useIsClient();
  if (!isClient) {
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">
        加载沙盒…
      </div>
    );
  }
  return <SandboxApp />;
}

export default function RoomSandboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">
          加载沙盒…
        </div>
      }
    >
      <SandboxInner />
    </Suspense>
  );
}