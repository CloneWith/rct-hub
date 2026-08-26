"use client";

/**
 * M4 — 图池编辑器。
 *
 * 以 MOD 分组（NM/HD/HR/DT/FM/SHIRO/TB，顺序对齐后端 mapMappool）编辑槽位：
 * - 每个槽位录入 osu! beatmap ID，输入时可用 `beatmapByOsuId` 前端即时解析预览
 *   （标题/难度/星数），解析结果仅作展示，不是持久化元数据状态；
 * - removed 槽位（GraphQL 回读 `beatmapID === "-1"`）在初始化时直接剔除；
 * - 保存走 PATCH /rooms/:id/mappool 全量替换（后端无增量语义），每个 mod 组
 *   都发送完整列表，空组发空数组；
 * - 未解析的 BID 允许保存（"支持未解析保存"）——后端 3-tier fetcher 会在
 *   开赛前兜底抓取元数据，正式开赛校验（engineConfigurationFromRoom）才要求
 *   非 removed 槽位处于 NORMAL 状态；
 * - 后端 `retryBeatmapMetadata` 是 match 级操作（需要 matchID），赛前不可用，
 *   这里用前端重新解析代替。
 */

import { useMemo, useState } from "react";
import { Button, Chip, Input, toast } from "@heroui/react";
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useFetchBeatmapByOsuId, useSetRoomMappool } from "@/app/lib/hooks";
import type { FetchedBeatmap, RoomSetup } from "@/app/lib/hooks";
import { PIECE_MOD_LABELS, PIECE_MOD_ORDER } from "@/app/lib/rooms";
import type { PieceMod } from "@/app/graphql/graphql";

type EditorPiece = {
  key: string;
  /** Input value — osu! beatmap id as a string ("" = not configured). */
  beatmapId: string;
  resolved: FetchedBeatmap | null;
  resolving: boolean;
  error: string | null;
};

type EditorGroup = { mod: PieceMod; pieces: EditorPiece[] };

function newPiece(mod: PieceMod): EditorPiece {
  return {
    key: `${mod}-${crypto.randomUUID()}`,
    beatmapId: "",
    resolved: null,
    resolving: false,
    error: null,
  };
}

/** 从服务端图池初始化编辑态；removed 槽位（beatmapID === "-1"）直接剔除。 */
function initGroups(room: RoomSetup): EditorGroup[] {
  return PIECE_MOD_ORDER.map((mod) => {
    const group = room.settings.mappool.slots.find((g) => g.mod === mod);
    const pieces = (group?.pieces ?? [])
      .filter((p) => p.beatmapID !== "-1")
      .map((p) => ({
        key: `${mod}-${p.index}-${p.beatmapID ?? "shiro"}`,
        beatmapId: p.beatmapID && p.beatmapID !== "-1" ? p.beatmapID : "",
        resolved: null,
        resolving: false,
        error: null,
      }));
    return { mod, pieces };
  });
}

/** 徽标状态：未配置 / 已解析 / 解析中 / 解析失败。 */
function statusChip(piece: EditorPiece): { label: string; tone: "default" | "success" | "warning" | "danger" } {
  if (!piece.beatmapId.trim()) return { label: "未配置", tone: "default" };
  if (piece.resolving) return { label: "解析中", tone: "warning" };
  if (piece.resolved) return { label: "已解析", tone: "success" };
  if (piece.error) return { label: "解析失败", tone: "danger" };
  return { label: "待解析", tone: "warning" };
}

export default function MappoolEditor({
  room,
  canEdit,
}: {
  room: RoomSetup;
  canEdit: boolean;
}) {
  const [groups, setGroups] = useState<EditorGroup[]>(() => initGroups(room));
  const resolveMap = useFetchBeatmapByOsuId();
  const savePool = useSetRoomMappool();

  const hasChanges = useMemo(() => {
    // 只比较 beatmapId 序列：解析结果（resolved/error）不算配置改动。
    const shape = (gs: EditorGroup[]) => gs.map((g) => g.pieces.map((p) => p.beatmapId));
    return JSON.stringify(shape(initGroups(room))) !== JSON.stringify(shape(groups));
  }, [groups, room]);

  const updatePiece = (mod: PieceMod, key: string, patch: Partial<EditorPiece>) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.mod === mod
          ? {
              ...g,
              pieces: g.pieces.map((p) =>
                p.key === key ? { ...p, ...patch } : p,
              ),
            }
          : g,
      ),
    );
  };

  const resolve = async (mod: PieceMod, piece: EditorPiece) => {
    const bid = piece.beatmapId.trim();
    if (!/^\d+$/.test(bid)) {
      updatePiece(mod, piece.key, { error: "请输入有效的 beatmap ID", resolved: null });
      return;
    }
    updatePiece(mod, piece.key, { resolving: true, error: null });
    try {
      const beatmap = await resolveMap.mutateAsync(Number(bid));
      updatePiece(mod, piece.key, { resolved: beatmap, resolving: false });
    } catch {
      updatePiece(mod, piece.key, { resolved: null, resolving: false, error: "未找到该 beatmap" });
    }
  };

  const addPiece = (mod: PieceMod) => {
    setGroups((prev) =>
      prev.map((g) => (g.mod === mod ? { ...g, pieces: [...g.pieces, newPiece(mod)] } : g)),
    );
  };

  const removePiece = (mod: PieceMod, key: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.mod === mod ? { ...g, pieces: g.pieces.filter((p) => p.key !== key) } : g)),
    );
  };

  const save = async () => {
    // 完整替换：每个 mod 组都发送，空组发空数组；Shiro 槽位省略 beatmap_id。
    const slots: Record<string, unknown> = {};
    for (const g of groups) {
      slots[g.mod] = g.pieces.map((p) => {
        const bid = p.beatmapId.trim();
        return {
          ...(bid ? { beatmap_id: Number(bid) } : {}),
          state: "NORMAL",
        };
      });
    }
    try {
      await savePool.mutateAsync({ id: room.id, pool: { slots } });
      toast.success("图池已保存");
    } catch {
      // 错误 toast 已由 useToastedMutation 统一处理
    }
  };

  return (
    <section className="rounded-xl border border-default-200 bg-default-50/40 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">图池</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            保存为完整替换；未解析的 beatmap ID 也可保存（开赛前后端会兜底抓取元数据）
          </p>
        </div>
        {canEdit && (
          <Button variant="primary" size="sm" isDisabled={!hasChanges || savePool.isPending} onPress={() => void save()}>
            <Save className="size-3.5" />
            {savePool.isPending ? "保存中..." : "保存图池"}
          </Button>
        )}
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => {
          const isShiro = group.mod === "SHIRO";
          return (
            <div
              key={group.mod}
              className="flex flex-col gap-2 rounded-lg border border-default-200 bg-surface p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{PIECE_MOD_LABELS[group.mod]}</span>
                <span className="text-xs text-muted-foreground">{group.pieces.length} 槽</span>
              </div>

              <div className="flex flex-col gap-1.5">
                {group.pieces.length === 0 ? (
                  <p className="py-1 text-center text-xs text-muted-foreground">暂无槽位</p>
                ) : (
                  group.pieces.map((piece) => {
                    const st = statusChip(piece);
                    return (
                      <div key={piece.key} className="flex items-center gap-1.5">
                        {isShiro ? (
                          <span className="flex-1 truncate rounded-lg border border-dashed border-default-300 px-2 py-1.5 text-xs text-muted-foreground">
                            Shiro 槽位（无 beatmap）
                          </span>
                        ) : (
                          <Input
                            aria-label={`${PIECE_MOD_LABELS[group.mod]} beatmap ID`}
                            className="w-24 shrink-0"
                            inputMode="numeric"
                            placeholder="BID"
                            value={piece.beatmapId}
                            disabled={!canEdit}
                            onChange={(e) =>
                              updatePiece(group.mod, piece.key, {
                                beatmapId: (e.target as HTMLInputElement).value,
                                resolved: null,
                                error: null,
                              })
                            }
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          {piece.resolved
                            ? `${piece.resolved.artist} — ${piece.resolved.title} [${piece.resolved.version}] ★${piece.resolved.difficultyRating.toFixed(2)}`
                            : piece.error ?? ""}
                        </span>
                        <Chip size="sm" variant="soft" color={st.tone}>
                          {st.label}
                        </Chip>
                        {canEdit && (
                          <>
                            {!isShiro && (
                              <Button
                                size="sm"
                                variant="ghost"
                                isDisabled={piece.resolving}
                                aria-label="解析元数据"
                                onPress={() => void resolve(group.mod, piece)}
                              >
                                {piece.resolving ? (
                                  <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                  <RefreshCw className="size-3" />
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="删除槽位"
                              className="text-danger"
                              onPress={() => removePiece(group.mod, piece.key)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {canEdit && (
                <Button size="sm" variant="secondary" onPress={() => addPiece(group.mod)}>
                  <Plus className="size-3" />
                  添加槽位
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
