"use client";

/**
 * M4 — 赛前配置页（/rooms/[code]）。
 *
 * 新房间从零配置到开赛的一条龙入口：
 * - 房间信息 + 成员/角色展示（MembersSection，编辑走 RoomEditDialog）
 * - 图池编辑（MappoolEditor：MOD 分组 + BID 录入 + 前端解析预览 + 未解析保存）
 * - 开赛流程：前端预检（validateRoomForStart，对齐 BuildFormalMatchSeed /
 *   MissingStartRequirements）→ start-match → 跳转棋房。
 *
 * 权限（对齐后端）：
 * - 配置编辑（图池/BP/选手/策略师）：admin；或非 match 房间的 owner
 *   （后端 authorizedRoomConfiguration 对 match 房间仅 admin）。
 * - MP/直播链接（authorizedRoom）：admin / match 指定裁判 / owner。
 * - 开赛（authorizedRoom）：admin / match 指定裁判 / owner。
 */

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, ChevronRight, DoorOpen, Flag, Play, ShieldCheck } from "lucide-react";
import { Button, Chip } from "@heroui/react";
import { useMe, useRoomByCode, useStartRoomMatch } from "@/app/lib/hooks";
import { canControlRoom, isAdmin, roomStatusChip, validateRoomForStart } from "@/app/lib/rooms";
import MembersSection from "./components/MembersSection";

const TONE_COLOR: Record<string, "default" | "accent" | "success" | "warning" | "danger"> = {
  neutral: "default",
  primary: "accent",
  success: "success",
  warning: "warning",
  danger: "danger",
};

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RoomStage({ code }: { code: string }) {
  const router = useRouter();
  const { data: user } = useMe();
  const { data: room, isLoading, isError } = useRoomByCode(code, true);
  const startMatch = useStartRoomMatch();

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">
        正在加载房间配置…
      </div>
    );
  }
  if (isError || !room) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-bold">房间不存在或无权查看</p>
        <p className="text-sm text-muted-foreground">房间 {code} 可能已删除，或你没有访问权限</p>
        <Button variant="secondary" size="sm" onPress={() => router.push("/rooms")}>
          返回房间列表
        </Button>
      </div>
    );
  }

  const admin = isAdmin(user ?? null);
  const status = roomStatusChip(room);
  const scheduled = formatTime(room.scheduledAt);
  const owner = user?.onlineID === room.ownerID;
  const started = room.matchID != null;

  // 配置编辑：admin，或非 match 房间的 owner（对齐 authorizedRoomConfiguration）。
  const canEditConfig = admin || (room.type !== "MATCH" && owner);
  // 开赛 / MP 链接（对齐 authorizedRoom）。
  const canStart = canControlRoom(user ?? null, room) || owner;

  const validation = validateRoomForStart(room);

  const confirmStart = () => {
    // 按钮在预检未通过时禁用，此处必然已通过；后端仍可能返回校验错误
    // （错误 toast 由 useToastedMutation 统一处理）。
    startMatch.mutate(room.id, {
      onSuccess: () => router.push(`/rooms/${code}/match`),
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6">
      {/* ---- Header ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="sm" aria-label="返回房间列表" onPress={() => router.push("/rooms")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold">{room.name}</h1>
              <span className="font-mono text-xs text-muted-foreground">{room.code}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {scheduled && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3" />
                  {scheduled}
                </span>
              )}
              {room.round && <span>· {room.round}</span>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Chip size="sm" variant="soft" color={TONE_COLOR[status.tone]}>
            {status.label}
          </Chip>
          {started && (
            <Button
              size="sm"
              variant="primary"
              onPress={() => router.push(`/rooms/${code}/match`)}
            >
              进入棋房
              <ChevronRight className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ---- Members & roles ---- */}
      <MembersSection room={room} canEdit={canEditConfig} />

       {/* 图池由管理后台维护，房间页只选择已存在的图池实体。 */}

      {/* ---- Start card ---- */}
      {canStart && (
        <section className="rounded-xl border border-default-200 bg-default-50/40 p-4">
          <header className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Flag className="size-4" />
              开赛
            </h2>
            {started && (
              <Button
                size="sm"
                variant="primary"
                onPress={() => router.push(`/rooms/${code}/match`)}
              >
                <Play className="size-3.5" />
                进入棋房
              </Button>
            )}
          </header>

          {!started && (
            <div className="flex flex-col gap-3">
              <div
                className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                  validation.ok
                    ? "border-success/30 bg-success/5 text-success"
                    : "border-danger/30 bg-danger/5 text-danger"
                }`}
              >
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                <div className="flex flex-col gap-1">
                  <span className="font-medium">
                    {validation.ok ? "配置完备，可以开赛" : "配置尚不完整，无法开赛"}
                  </span>
                  {!validation.ok && (
                    <ul className="list-inside list-disc text-xs leading-relaxed">
                      {validation.issues.map((issue) => (
                        <li key={issue.field}>
                          {issue.label}
                          <span className="ml-1 opacity-60">{issue.field}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="primary"
                  isDisabled={!validation.ok || startMatch.isPending}
                  onPress={() => void confirmStart()}
                >
                  <Play className="size-3.5" />
                  {startMatch.isPending ? "开赛中..." : "开始比赛"}
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---- Links (read-only) ---- */}
      {(room.settings.mpLink || room.settings.streamLink) && (
        <section className="flex flex-wrap gap-2 text-sm">
          {room.settings.mpLink && (
            <a
              href={room.settings.mpLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-default-200 px-3 py-1.5 text-primary hover:bg-default-100"
            >
              <DoorOpen className="size-3.5" />
              MP 链接
            </a>
          )}
          {room.settings.streamLink && (
            <a
              href={room.settings.streamLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-default-200 px-3 py-1.5 text-primary hover:bg-default-100"
            >
              <DoorOpen className="size-3.5" />
              直播链接
            </a>
          )}
        </section>
      )}
    </div>
  );
}

function RoomPageInner() {
  const params = useParams<{ code: string }>();
  const code = params?.code ?? "";
  return <RoomStage code={code} />;
}

export default function RoomPage() {
  // `useParams` is dynamic data under `cacheComponents` — it must sit inside
  // <Suspense> so the route shell can prerender and stream the content.
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">
          正在加载房间配置…
        </div>
      }
    >
      <RoomPageInner />
    </Suspense>
  );
}
