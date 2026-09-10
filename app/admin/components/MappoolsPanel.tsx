"use client";

import { useState } from "react";
import {
  AlertDialog,
  Button,
  Chip,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Spinner,
  Surface,
  Table,
  TextField,
} from "@heroui/react";
import { ListMusic, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  useCreateMappool,
  useDeleteMappool,
  useFetchBeatmapByOsuId,
  useMappools,
  useUpdateMappool,
  type MappoolEntryForm,
  type MappoolForm,
  type MappoolItem,
} from "@/app/lib/hooks";
import PaginationBar from "./PaginationBar";
import EmptyTableState from "./EmptyTableState";
import SearchBar from "./SearchBar";

const PER_PAGE = 10;
const MOD_OPTIONS = ["NM", "HD", "HR", "DT", "FM", "SHIRO", "TB"];

/** Entry form state extended with the resolved beatmap title for display. */
type EntryRow = MappoolEntryForm & { beatmapTitle: string | null };

const blankMappool: MappoolForm = {
  name: "",
  description: "",
  entries: [],
};

/** Compute the per-mod index each row would receive on save (1-based). */
function previewIndexes(entries: MappoolEntryForm[]): Map<number, number> {
  const counters = new Map<string, number>();
  const out = new Map<number, number>();
  entries.forEach((e, i) => {
    const next = (counters.get(e.mod) ?? 0) + 1;
    counters.set(e.mod, next);
    out.set(i, next);
  });
  return out;
}

/** Count entries per mod group, preserving canonical mod order. */
function countByMod(entries: MappoolItem["entries"]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.mod, (counts.get(e.mod) ?? 0) + 1);
  return MOD_OPTIONS.filter((m) => counts.has(m)).map((m) => [m, counts.get(m)!]);
}

/** Admin tab: mappool list with search, pagination, create/edit modal and delete confirmation. */
export default function MappoolsPanel({ enabled }: { enabled: boolean }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [poolModal, setPoolModal] = useState(false);
  const [poolEditId, setPoolEditId] = useState<string | null>(null);
  const [poolF, setPoolF] = useState<MappoolForm>(blankMappool);
  const [rowTitles, setRowTitles] = useState<Array<string | null>>([]);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const {
    data: mappools = [],
    pagination,
    isLoading,
  } = useMappools(enabled, page, PER_PAGE, search);

  const createPool = useCreateMappool();
  const updatePool = useUpdateMappool();
  const deletePool = useDeleteMappool();
  const fetchBm = useFetchBeatmapByOsuId();

  const openPoolCreate = () => {
    setPoolEditId(null);
    setPoolF(blankMappool);
    setRowTitles([]);
    setPoolModal(true);
  };

  const openPoolEdit = (m: MappoolItem) => {
    setPoolEditId(m.id);
    setPoolF({
      name: m.name,
      description: m.description ?? "",
      entries: m.entries.map((e) => ({
        mod: e.mod,
        beatmapID: e.beatmapID != null ? Number(e.beatmapID) : null,
        selectorID: e.selectorID != null ? Number(e.selectorID) : null,
        skill: e.skill ?? "",
      })),
    });
    setRowTitles(
      m.entries.map((e) =>
        e.beatmap ? `${e.beatmap.title} — ${e.beatmap.artist}` : null,
      ),
    );
    setPoolModal(true);
  };

  const updateRow = (i: number, patch: Partial<EntryRow>) => {
    setPoolF((p) => {
      const entries = p.entries.map((e, j) => (j === i ? {...e, ...patch} : e));
      return {...p, entries};
    });
  };

  // Pull beatmap metadata for one entry row through the fetch-through upsert
  // resolver; the resolved title is cached locally for display only.
  const fetchRowBeatmap = (i: number) => {
    const id = poolF.entries[i]?.beatmapID;
    if (id == null || id <= 0) return;
    fetchBm.mutate(id, {
      onSuccess: (b) => {
        setRowTitles((titles) =>
          titles.map((t, j) => (j === i ? `${b.title} — ${b.artist}` : t)),
        );
      },
    });
  };

  const addEntry = () => {
    setPoolF((p) => ({
      ...p,
      entries: [
        ...p.entries,
        {mod: "NM", beatmapID: null, selectorID: null, skill: ""},
      ],
    }));
    setRowTitles((titles) => [...titles, null]);
  };

  const removeEntry = (i: number) => {
    setPoolF((p) => ({
      ...p,
      entries: p.entries.filter((_, j) => j !== i),
    }));
    setRowTitles((titles) => titles.filter((_, j) => j !== i));
  };

  // Non-SHIRO entries must reference a beatmap before the form can be saved.
  const hasInvalidEntry = poolF.entries.some(
    (e) => e.mod !== "SHIRO" && (e.beatmapID == null || e.beatmapID <= 0),
  );

  const savePool = () => {
    const payload: MappoolForm = {
      name: poolF.name,
      description: poolF.description,
      entries: poolF.entries.map((e) => ({
        mod: e.mod,
        beatmapID:
          e.mod === "SHIRO"
            ? null
            : e.beatmapID != null && e.beatmapID > 0
              ? e.beatmapID
              : null,
        selectorID:
          e.selectorID != null && e.selectorID > 0 ? e.selectorID : null,
        skill: e.skill,
      })),
    };
    if (poolEditId) {
      updatePool.mutate(
        {id: poolEditId, ...payload},
        {onSuccess: () => setPoolModal(false)},
      );
    } else {
      createPool.mutate(payload, {onSuccess: () => setPoolModal(false)});
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deletePool.mutate(deleteTarget.id, {onSuccess: () => setDeleteTarget(null)});
  };

  const indexes = previewIndexes(poolF.entries);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <SearchBar
          placeholder="搜索图池名称..."
          value={searchInput}
          onValueChange={setSearchInput}
          onSearch={(term) => {
            setSearch(term);
            setPage(1);
          }}
          onClear={() => setSearch("")}
        />
        <Button variant="primary" size="sm" onPress={openPoolCreate}>
          <Plus className="w-4 h-4"/>
          新图池
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner/>
        </div>
      ) : (
        <>
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Mappools" className="h-full">
                <Table.Header>
                  <Table.Column isRowHeader={true}>图池</Table.Column>
                  <Table.Column>条目统计</Table.Column>
                  <Table.Column>操作</Table.Column>
                </Table.Header>
                <Table.Body renderEmptyState={EmptyTableState}>
                  {mappools.map((m) => (
                    <Table.Row key={m.id}>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <ListMusic className="w-4 h-4 text-muted-foreground"/>
                          <div>
                            <div className="font-medium">{m.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {m.description || `${m.entries.length} 个条目`}
                            </div>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-wrap gap-1">
                          {countByMod(m.entries).map(([mod, count]) => (
                            <Chip key={mod} size="sm" variant="soft" color="accent">
                              {mod === "SHIRO" ? "Shiro" : mod}×{count}
                            </Chip>
                          ))}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            isIconOnly
                            onPress={() => openPoolEdit(m)}
                          >
                            <Pencil className="w-4 h-4"/>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            isIconOnly
                            onPress={() => setDeleteTarget({id: m.id, name: m.name})}
                          >
                            <Trash2 className="w-4 h-4"/>
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
          <PaginationBar
            page={page}
            totalPages={pagination?.totalPages ?? 1}
            total={pagination?.total ?? 0}
            perPage={PER_PAGE}
            onPageChangeAction={setPage}
          />
        </>
      )}

      {/* ---- Create / edit mappool modal ---- */}
      <Modal
        isOpen={poolModal}
        onOpenChange={(o) => {
          if (!o) setPoolModal(false);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>
                  {poolEditId ? "编辑图池" : "新图池"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-5">
                  <section className="flex flex-col gap-4">
                    <TextField variant="secondary">
                      <Label>名称 *</Label>
                      <Input
                        value={poolF.name}
                        onChange={(e) =>
                          setPoolF((p) => ({
                            ...p,
                            name: (e.target as HTMLInputElement).value,
                          }))
                        }
                      />
                    </TextField>
                    <TextField variant="secondary">
                      <Label>描述</Label>
                      <Input
                        value={poolF.description}
                        onChange={(e) =>
                          setPoolF((p) => ({
                            ...p,
                            description: (e.target as HTMLInputElement).value,
                          }))
                        }
                      />
                    </TextField>
                  </section>

                  <section className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold">条目</h3>
                    <div className="flex flex-col gap-3">
                      {poolF.entries.map((entry, i) => (
                        <Surface
                          key={i}
                          variant="secondary"
                          className="flex flex-col gap-3 rounded-2xl p-4"
                        >
                          <div className="flex items-center gap-2">
                            <Select
                              variant="secondary"
                              value={entry.mod}
                              onChange={(v) => updateRow(i, {mod: v as string})}
                              className="w-32"
                            >
                              <Select.Trigger>
                                <Select.Value/>
                              </Select.Trigger>
                              <Select.Popover>
                                <ListBox>
                                  {MOD_OPTIONS.map((m) => (
                                    <ListBox.Item key={m} id={m}>
                                      {m === "SHIRO" ? "Shiro" : m}
                                    </ListBox.Item>
                                  ))}
                                </ListBox>
                              </Select.Popover>
                            </Select>
                            <Chip size="sm" variant="soft">
                              {entry.mod === "SHIRO" ? "Shiro" : entry.mod} #
                              {indexes.get(i)}
                            </Chip>
                            <div className="flex-1"/>
                            <Button
                              size="sm"
                              variant="ghost"
                              isIconOnly
                              aria-label="移除条目"
                              onPress={() => removeEntry(i)}
                            >
                              <Trash2 className="w-4 h-4"/>
                            </Button>
                          </div>

                          {entry.mod === "SHIRO" ? (
                            <p className="text-xs text-muted-foreground">
                              Shiro 槽位 — 白子，无谱面。
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-end gap-2">
                                <TextField className="flex-1" variant="secondary">
                                  <Label>谱面 osu! ID *</Label>
                                  <Input
                                    type="number"
                                    value={
                                      entry.beatmapID != null
                                        ? String(entry.beatmapID)
                                        : ""
                                    }
                                    onChange={(e) =>
                                      updateRow(i, {
                                        beatmapID:
                                          Number(
                                            (e.target as HTMLInputElement).value,
                                          ) || null,
                                      })
                                    }
                                  />
                                </TextField>
                                <Button
                                  variant="secondary"
                                  onPress={() => fetchRowBeatmap(i)}
                                  isDisabled={
                                    fetchBm.isPending ||
                                    entry.beatmapID == null ||
                                    entry.beatmapID <= 0
                                  }
                                >
                                  <Search className="w-4 h-4"/>
                                  获取
                                </Button>
                              </div>
                              {rowTitles[i] && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {rowTitles[i]}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <TextField className="flex-1" variant="secondary">
                              <Label>选图者 osu! ID</Label>
                              <Input
                                type="number"
                                value={
                                  entry.selectorID != null
                                    ? String(entry.selectorID)
                                    : ""
                                }
                                onChange={(e) =>
                                  updateRow(i, {
                                    selectorID:
                                      Number((e.target as HTMLInputElement).value) ||
                                      null,
                                  })
                                }
                              />
                            </TextField>
                            <TextField className="flex-1" variant="secondary">
                              <Label>能力点</Label>
                              <Input
                                value={entry.skill}
                                onChange={(e) =>
                                  updateRow(i, {
                                    skill: (e.target as HTMLInputElement).value,
                                  })
                                }
                              />
                            </TextField>
                          </div>
                        </Surface>
                      ))}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="self-start"
                        onPress={addEntry}
                      >
                        <Plus className="w-4 h-4"/>
                        添加条目
                      </Button>
                    </div>
                  </section>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={() => setPoolModal(false)}>
                  取消
                </Button>
                <Button
                  variant="primary"
                  onPress={savePool}
                  isDisabled={
                    !poolF.name.trim() ||
                    hasInvalidEntry ||
                    createPool.isPending ||
                    updatePool.isPending
                  }
                >
                  保存
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ---- Delete confirmation ---- */}
      <AlertDialog
        isOpen={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger"/>
                <AlertDialog.Heading>删除图池</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  确定要删除{" "}
                  <span className="font-medium">{deleteTarget?.name}</span>？
                  已被房间引用的图池无法删除。该操作无法撤销。
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button
                  variant="ghost"
                  onPress={() => setDeleteTarget(null)}
                >
                  取消
                </Button>
                <Button
                  variant="danger"
                  onPress={confirmDelete}
                  isDisabled={deletePool.isPending}
                >
                  删除
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </>
  );
}
