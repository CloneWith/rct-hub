"use client";

/**
 * SandboxApp — the dev-only "rooms without a backend" preview.
 *
 * Goals:
 * - Render the exact `MatchStageContent` tree that production uses.
 * - Drive everything from local `useState` + URL query so the page can be
 *   shared / bookmarked without server state.
 * - Show all six canonical phases (PENDING → finished) and every actor
 *   role (observer / red strategist / blue strategist / red captain / blue
 *   captain / referee / admin) so each control surface can be inspected.
 * - Wrap the live tree in a `MatchLiveProvider` whose `commandDispatcher`
 *   is the no-network `sandboxDispatcher`. Every ban/pick/place/rob/etc.
 *   click is captured by that stub and surfaced through a HeroUI toast
 *   that names the underlying GraphQL/REST op, so devs can sanity-check
 *   the args they're sending without spinning up a backend.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Boxes, Eye, Flag, Sword, UserCog, X } from "lucide-react";
import { Button, Chip } from "@heroui/react";
import { MatchStageContent, toLiveSnapshot } from "@/app/rooms/[code]/match/MatchStageContent";
import { MatchLiveProvider } from "@/app/rooms/[code]/match/MatchLiveProvider";
import { sandboxDispatcher } from "./sandboxDispatcher";
import {
  buildSandboxMatch,
  FIXTURE_KEYS,
  FIXTURE_LABELS,
  VIEWER_ROLES,
  type FixtureKey,
  type ViewerRole,
} from "./fixtures";

const FIXTURE_QUERY_KEY = "phase";
const ROLE_QUERY_KEY = "as";

/** Read a query param with a fallback (avoids `null` confusion). */
function readParam(searchParams: URLSearchParams | null, key: string, fallback: string): string {
  if (!searchParams) return fallback;
  const v = searchParams.get(key);
  return v && v.length > 0 ? v : fallback;
}

function isFixtureKey(s: string): s is FixtureKey {
  return (FIXTURE_KEYS as readonly string[]).includes(s);
}

function isViewerRole(s: string): s is ViewerRole {
  return VIEWER_ROLES.some((r) => r.key === s);
}

function roleIcon(key: ViewerRole): React.ReactNode {
  switch (key) {
    case "observer":
      return <Eye className="size-3.5" />;
    case "redStrategist":
    case "blueStrategist":
      return <Sword className="size-3.5" />;
    case "redCaptain":
    case "blueCaptain":
      return <Flag className="size-3.5" />;
    case "referee":
      return <UserCog className="size-3.5" />;
    case "admin":
      return <Boxes className="size-3.5" />;
  }
}

function roleTone(key: ViewerRole): "default" | "accent" | "success" | "warning" | "danger" {
  switch (key) {
    case "observer":
      return "default";
    case "redStrategist":
    case "redCaptain":
      return "danger";
    case "blueStrategist":
    case "blueCaptain":
      return "accent";
    case "referee":
      return "warning";
    case "admin":
      return "success";
  }
}

/**
 * Thin wrapper around `useState` that also persists to a URL query param.
 * Falls back gracefully when `useSearchParams` is not available (e.g.
 * during the brief SSR/hydration window — the state is initialized from
 * the URL, so the first paint already reflects the query).
 */
function useUrlBackedState<T extends string>(
  key: string,
  fallback: T,
  validate: (s: string) => s is T,
): [T, (next: T) => void] {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = useMemo(() => {
    const raw = readParam(searchParams, key, fallback);
    return validate(raw) ? raw : fallback;
  }, [searchParams, key, fallback, validate]);

  const [value, setValue] = useState<T>(initial);

  // Re-sync if the URL changes externally (e.g. browser back/forward).
  useEffect(() => {
    const raw = readParam(searchParams, key, fallback);
    const next = validate(raw) ? raw : fallback;
    if (next !== value) setValue(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
      params.set(key, next);
      // `scroll: false` so a fixture switch doesn't yank the page back to top.
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [key, router, searchParams],
  );

  return [value, update];
}

export default function SandboxApp() {
  const [fixtureKey, setFixtureKey] = useUrlBackedState<FixtureKey>(
    FIXTURE_QUERY_KEY,
    "banning",
    isFixtureKey,
  );
  const [viewerRole, setViewerRole] = useUrlBackedState<ViewerRole>(
    ROLE_QUERY_KEY,
    "observer",
    isViewerRole,
  );

  const match = useMemo(() => buildSandboxMatch(fixtureKey, viewerRole), [fixtureKey, viewerRole]);
  const liveSnapshot = useMemo(() => toLiveSnapshot(match.snapshot), [match.snapshot]);

  const currentFixture = FIXTURE_LABELS[fixtureKey];
  const currentRole = VIEWER_ROLES.find((r) => r.key === viewerRole)!;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* ---- Toolbar (sticky, dev-only) --------------------------------- */}
      <div
        data-testid="sandbox-toolbar"
        className="sticky top-0 z-50 flex flex-col gap-3 border-b border-warning/40 bg-warning/5 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-warning/10"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Chip size="sm" variant="soft" color="warning">
            DEV · 棋房沙盒
          </Chip>
          <span className="text-xs text-muted-foreground">
            不打后端，只预览棋房 UI 控件在不同 phase / 角色下的外观。点击控制按钮会发出 toast，说明实际情况下会触发的后端操作。
          </span>
          <div className="ml-auto">
            <Button
              size="sm"
              variant="ghost"
              aria-label="回到房间列表"
              onPress={() => window.history.back()}
            >
              <X className="size-3.5" />
              退出沙盒
            </Button>
          </div>
        </div>

        {/* Fixture selector — current snapshot phase */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            阶段
          </span>
          {FIXTURE_KEYS.map((key) => {
            const meta = FIXTURE_LABELS[key];
            const active = key === fixtureKey;
            return (
              <span key={key} title={meta.description} className="inline-flex">
                <Button
                  size="sm"
                  variant={active ? "primary" : "secondary"}
                  onPress={() => setFixtureKey(key)}
                  aria-pressed={active}
                  aria-label={`${meta.label}：${meta.description}`}
                >
                  {meta.label}
                </Button>
              </span>
            );
          })}
          <span className="ml-2 text-xs text-muted-foreground">{currentFixture.description}</span>
        </div>

        {/* Role selector — current viewer identity */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            视角
          </span>
          {VIEWER_ROLES.map((role) => {
            const active = role.key === viewerRole;
            return (
              <Chip
                key={role.key}
                size="sm"
                variant="soft"
                color={active ? roleTone(role.key) : "default"}
                className={active ? "cursor-pointer" : "cursor-pointer opacity-60"}
                onClick={() => setViewerRole(role.key)}
                title={role.description}
              >
                <span className="inline-flex items-center gap-1">
                  {roleIcon(role.key)}
                  {role.label}
                </span>
              </Chip>
            );
          })}
          <span className="ml-2 text-xs text-muted-foreground">{currentRole.description}</span>
        </div>
      </div>

      {/* ---- Live board (driven by fixture snapshot + role views) ------ */}
      <div className="flex-1">
        <MatchLiveProvider
          matchId={match.id}
          initialSnapshot={liveSnapshot}
          staticValue={{
            status: "live",
            snapshot: liveSnapshot,
            lastEvent: null,
            clockOffsetMs: 0,
            commandDispatcher: sandboxDispatcher,
          }}
          commandDispatcher={sandboxDispatcher}
        >
          <MatchStageContent match={match} liveSnapshot={liveSnapshot} />
        </MatchLiveProvider>
      </div>
    </div>
  );
}