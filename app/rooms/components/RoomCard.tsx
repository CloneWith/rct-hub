"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Chip,
  Input,
  Label,
  Modal,
  TextField,
  toast,
} from "@heroui/react";
import { Calendar, ChevronRight, ExternalLink, Link2, Play, User } from "lucide-react";
import type { AuthUser } from "@/app/lib/hooks";
import { useSetRoomMPLink, useStartRoomMatch } from "@/app/lib/hooks";
import {
  ROOM_TYPE_LABELS,
  canControlRoom,
  isAdmin,
  roomStatusChip,
  type RoomItem,
} from "@/app/lib/rooms";

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

function TeamSummary({ label, team }: { label: string; team: RoomItem["settings"]["redTeam"] }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">
        {team ? (
          <>
            {team.name} · {team.playerIDs.length} 名玩家
            {team.leaderID && <span className="text-muted-foreground"> · 队长 #{team.leaderID}</span>}
          </>
        ) : (
          <span className="text-muted-foreground">待定</span>
        )}
      </span>
    </div>
  );
}

/**
 * 房间卡片。操作区按角色渲染：
 * - 普通玩家只读；
 * - 被指定裁判 / admin：开赛（含确认）+ MP 链接更新；
 * - admin：额外「编辑」按钮（由父级打开 RoomEditDialog）。
 */
export default function RoomCard({
  room,
  user,
  onEdit,
}: {
  room: RoomItem;
  user: AuthUser | null;
  onEdit: (room: RoomItem) => void;
}) {
  const [startOpen, setStartOpen] = useState(false);
  const [mpOpen, setMpOpen] = useState(false);
  const [mpInput, setMpInput] = useState("");
  const router = useRouter();

  const startMatch = useStartRoomMatch();
  const setMpLink = useSetRoomMPLink();

  const status = roomStatusChip(room);
  const scheduled = formatTime(room.scheduledAt);
  const controllable = canControlRoom(user, room);
  const admin = isAdmin(user);
  const canStart = controllable && room.matchID == null;

  const openMpDialog = () => {
    setMpInput(room.settings.mpLink ?? "");
    setMpOpen(true);
  };

  const submitMpLink = () => {
    if (!mpInput.trim()) return;
    setMpLink.mutate(
      { id: room.id, mpLink: mpInput.trim() },
      {
        onSuccess: () => {
          toast.success("MP 链接已更新");
          setMpOpen(false);
        },
      },
    );
  };

  const confirmStart = () => {
    startMatch.mutate(room.id, {
      onSuccess: () => {
        toast.success("比赛已开始");
        setStartOpen(false);
      },
    });
  };

  // 未开赛 → 赛前配置页；已开赛 → 棋房。
  const openRoomPage = () =>
    router.push(room.matchID == null ? `/rooms/${room.code}` : `/rooms/${room.code}/match`);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      {/* ---- Header: name / code / badges ---- */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={openRoomPage}
          className="group flex items-start justify-between gap-2 text-left"
        >
          <div className="min-w-0">
            <div className="truncate font-semibold group-hover:text-primary">{room.name}</div>
            <div className="font-mono text-xs text-muted-foreground">{room.code}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Chip size="sm" variant="soft" color={TONE_COLOR[status.tone]}>
              {status.label}
            </Chip>
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip size="sm" variant="soft" color="accent">
            {ROOM_TYPE_LABELS[room.type]}
          </Chip>
          {room.round && (
            <Chip size="sm" variant="soft">
              {room.round}
            </Chip>
          )}
          {scheduled && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="size-3" />
              {scheduled}
            </span>
          )}
        </div>
      </div>

      {/* ---- Teams ---- */}
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-secondary p-3">
        <TeamSummary
          label="红方"
          team={room.settings.redTeam}
        />
        <TeamSummary
          label="蓝方"
          team={room.settings.blueTeam}
        />
      </div>

      {/* ---- Footer: owner / mp link / actions ---- */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <Avatar size="sm" className="h-6 w-6">
            <Avatar.Image src={room.owner?.avatarUrl ?? ""} alt="" />
            <Avatar.Fallback>
              <User className="size-3" />
            </Avatar.Fallback>
          </Avatar>
          <span className="truncate">{room.owner?.username ?? `#${room.ownerID}`}</span>
          {room.settings.mpLink && (
            <a
              href={room.settings.mpLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-0.5 text-primary hover:underline"
            >
              <ExternalLink className="size-3" />
              MP
            </a>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {controllable && (
            <>
              <Button size="sm" variant="secondary" onPress={openMpDialog}>
                <Link2 className="size-3.5" />
                MP 链接
              </Button>
              <Button
                size="sm"
                variant="primary"
                isDisabled={!canStart || startMatch.isPending}
                onPress={() => setStartOpen(true)}
              >
                <Play className="size-3.5" />
                {room.matchID == null ? "开赛" : "已开赛"}
              </Button>
            </>
          )}
          {admin && (
            <Button size="sm" variant="ghost" onPress={() => onEdit(room)}>
              编辑
            </Button>
          )}
        </div>
      </div>

      {/* ---- Start-match confirmation ---- */}
      <Modal isOpen={startOpen} onOpenChange={setStartOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>确认开赛</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted-foreground">
                  确定为「{room.name}」（{room.code}）开始比赛？开赛后房间配置将被锁定。
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={() => setStartOpen(false)}>
                  取消
                </Button>
                <Button
                  variant="primary"
                  isDisabled={startMatch.isPending}
                  onPress={confirmStart}
                >
                  {startMatch.isPending ? "开赛中..." : "确认开赛"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ---- MP link editor ---- */}
      <Modal isOpen={mpOpen} onOpenChange={setMpOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>更新 MP 链接</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <TextField variant="secondary">
                  <Label>多人游戏链接</Label>
                  <Input
                    type="url"
                    placeholder="https://osu.ppy.sh/community/matches/..."
                    value={mpInput}
                    onChange={(e) => setMpInput((e.target as HTMLInputElement).value)}
                  />
                </TextField>
                <p className="text-xs text-muted-foreground">
                  正式赛房间的链接需为 osu.ppy.sh 多人比赛链接。
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={() => setMpOpen(false)}>
                  取消
                </Button>
                <Button
                  variant="primary"
                  isDisabled={!mpInput.trim() || setMpLink.isPending}
                  onPress={submitMpLink}
                >
                  {setMpLink.isPending ? "保存中..." : "保存"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
