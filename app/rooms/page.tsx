"use client";

import { useState } from "react";
import { Button, EmptyState, Spinner } from "@heroui/react";
import { DoorOpen, Hourglass, Lock, Plus } from "lucide-react";
import type { MatchLifecycle } from "@/app/graphql/graphql";
import { useAuth } from "@/app/context/AuthContext";
import { useIsClient, useRooms, type RoomFilters } from "@/app/lib/hooks";
import { getOsuLoginUrl } from "@/app/lib/api";
import { isAdmin, showRelatedFilter, type RoomItem } from "@/app/lib/rooms";
import PaginationBar from "@/app/admin/components/PaginationBar";
import RoomCard from "./components/RoomCard";
import RoomFiltersBar from "./components/RoomFilters";
import RoomCreateDialog from "./components/RoomCreateDialog";
import RoomEditDialog from "./components/RoomEditDialog";

const PER_PAGE = 20;

function CenteredSpinner() {
  return (
    <div className="flex h-75 items-center justify-center">
      <Spinner />
    </div>
  );
}

/** 未登录 / 非认证用户 / 被封禁用户看到的空态。 */
function AuthGateState({
  icon,
  title,
  description,
  showLogin,
}: {
  icon: "lock" | "hourglass";
  title: string;
  description: string;
  showLogin?: boolean;
}) {
  const Icon = icon === "lock" ? Lock : Hourglass;
  return (
    <EmptyState className="flex h-75 w-full flex-col items-center justify-center gap-4 text-center">
      <Icon className="size-8 text-muted" />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </div>
      {showLogin && (
        <a href={getOsuLoginUrl()}>
          <Button variant="primary" size="sm">
            使用 osu! 登录
          </Button>
        </a>
      )}
    </EmptyState>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-52 animate-pulse rounded-xl border border-border bg-surface" />
      ))}
    </div>
  );
}

/**
 * 公共房间列表页。
 *
 * 浏览门槛与后端 `privateViewer` 一致：已认证（verified 且未封禁）用户可浏览，
 * 其余用户与未登录用户看到空态引导。特权操作（开赛/MP 链接/编辑/新建）按角色
 * 在卡片与页头上渲染。
 */
export default function RoomsPage() {
  const { user, loading } = useAuth();
  const isClient = useIsClient();

  // 搜索：输入与已提交值分离，Enter 提交后才进入 queryKey（与 admin 面板一致）
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [round, setRound] = useState<string | null>(null);
  const [status, setStatus] = useState<MatchLifecycle | null>(null);
  const [relatedToMe, setRelatedToMe] = useState(false);
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<RoomItem | null>(null);

  const verified = !!user && user.verifyStatus === "VERIFIED" && !user.isBanned;

  const filters: RoomFilters = {
    search: search || undefined,
    round: round ?? undefined,
    status: status ?? undefined,
    relatedToMe: relatedToMe || undefined,
  };

  const { data: rooms, pagination, isLoading } = useRooms(verified, filters, page, PER_PAGE);

  const resetPage = () => setPage(1);

  const commitSearch = (term: string) => {
    setSearch(term);
    resetPage();
  };

  if (!isClient || loading) return <CenteredSpinner />;

  if (!user) {
    return (
      <AuthGateState
        icon="lock"
        title="登录后查看房间"
        description="房间列表仅对已登录用户开放，请先使用 osu! 账号登录。"
        showLogin
      />
    );
  }

  if (user.isBanned) {
    return (
      <AuthGateState
        icon="hourglass"
        title="账号已被封禁"
        description="封禁期间无法浏览房间信息，如有疑问请联系管理员。"
      />
    );
  }

  if (user.verifyStatus !== "VERIFIED") {
    return (
      <AuthGateState
        icon="hourglass"
        title="等待身份认证"
        description="你的账号尚未通过认证，认证通过后即可浏览房间。"
      />
    );
  }

  const hasFilters = !!search || !!round || !!status || relatedToMe;
  const admin = isAdmin(user);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DoorOpen className="size-6 text-primary" />
          <h1 className="text-xl font-semibold">房间</h1>
          {pagination && (
            <span className="text-sm text-muted-foreground">共 {pagination.total} 个</span>
          )}
        </div>
        {admin && (
          <Button variant="primary" size="sm" onPress={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            新建房间
          </Button>
        )}
      </div>

      {/* ---- Filters ---- */}
      <RoomFiltersBar
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearch={commitSearch}
        onSearchClear={() => commitSearch("")}
        round={round}
        onRoundChange={(v) => {
          setRound(v);
          resetPage();
        }}
        status={status}
        onStatusChange={(v) => {
          setStatus(v);
          resetPage();
        }}
        relatedToMe={relatedToMe}
        onRelatedToMeChange={(v) => {
          setRelatedToMe(v);
          resetPage();
        }}
        showRelated={showRelatedFilter(user)}
      />

      {/* ---- List ---- */}
      {isLoading ? (
        <SkeletonGrid />
      ) : rooms.length === 0 ? (
        <EmptyState className="flex h-75 w-full flex-col items-center justify-center gap-4 text-center">
          <DoorOpen className="size-8 text-muted" />
          <span className="text-sm text-muted">
            {hasFilters ? "没有符合筛选条件的房间" : "暂无房间"}
          </span>
          {hasFilters && (
            <Button
              variant="secondary"
              size="sm"
              onPress={() => {
                setSearchInput("");
                setSearch("");
                setRound(null);
                setStatus(null);
                setRelatedToMe(false);
                resetPage();
              }}
            >
              清除筛选
            </Button>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} user={user} onEdit={setEditRoom} />
            ))}
          </div>
          {pagination && (
            <PaginationBar
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              perPage={pagination.perPage}
              onPageChangeAction={setPage}
            />
          )}
        </>
      )}

      {/* ---- Dialogs（条件挂载，表单初始值在挂载时确定） ---- */}
      {createOpen && <RoomCreateDialog onClose={() => setCreateOpen(false)} />}
      {editRoom && <RoomEditDialog room={editRoom} onClose={() => setEditRoom(null)} />}
    </div>
  );
}
