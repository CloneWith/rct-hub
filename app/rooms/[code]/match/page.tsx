"use client";

/**
 * Board screen (棋房) — M1 spectator layer + M2 strategist/captain layer.
 *
 * Bootstrap: `matchByCode(roomCode)` provides identity, pool metadata and an
 * initial snapshot; the WS channel (`MatchLiveProvider`) takes over all live
 * state. Role-specific interaction panels (strategist/captain now; referee in
 * M3; streamer/overlay in M5) are layered on top of this same layout.
 *
 * The full UI tree (header / grid / pool / actor rails) lives in
 * `MatchStageContent` so it can be reused by `/dev/room-sandbox` with a
 * fixture-driven snapshot.
 */

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { useIsClient, useMatchByCode } from "@/app/lib/hooks";
import { MatchLiveProvider, useMatchLive } from "./MatchLiveProvider";
import NarrowScreenGuard from "./components/NarrowScreenGuard";
import { MatchStageContent, toLiveSnapshot, type BootstrapMatch } from "./MatchStageContent";

/**
 * WS-driven wrapper: subscribes to the live snapshot and threads it through
 * to `MatchStageContent`. The content component itself is WS-agnostic — see
 * `MatchStageContent.tsx` for the rationale.
 */
function MatchStage({ match }: { match: BootstrapMatch }) {
  return (
    <MatchLiveProvider matchId={match.id} initialSnapshot={toLiveSnapshot(match.snapshot)}>
      <MatchStageWithLiveSnapshot match={match} />
    </MatchLiveProvider>
  );
}

function MatchStageWithLiveSnapshot({ match }: { match: BootstrapMatch }) {
  const { snapshot: live } = useMatchLive();
  return (
    <MatchStageContent match={match} liveSnapshot={live} withNarrowScreenGuard />
  );
}

function MatchPageInner() {
  const params = useParams<{ code: string }>();
  const code = params?.code ?? "";
  const isClient = useIsClient();
  const { data: match, isLoading, isError } = useMatchByCode(code, isClient);

  return (
    <NarrowScreenGuard>
      {!isClient || isLoading ? (
        <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">
          正在进入棋房…
        </div>
      ) : isError ? (
        <div className="flex h-dvh flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-danger">加载比赛信息失败，请刷新重试</p>
        </div>
      ) : !match ? (
        <div className="flex h-dvh flex-col items-center justify-center gap-3 text-center">
          <p className="text-lg font-bold">比赛不存在</p>
          <p className="text-sm text-muted-foreground">房间 {code} 尚未开始比赛或已失效</p>
        </div>
      ) : (
        <MatchStage match={match} />
      )}
    </NarrowScreenGuard>
  );
}

export default function MatchPage() {
  // `useParams` is dynamic data under `cacheComponents` — it must sit inside
  // <Suspense> so the route shell can prerender and stream the content.
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">
          正在进入棋房…
        </div>
      }
    >
      <MatchPageInner />
    </Suspense>
  );
}