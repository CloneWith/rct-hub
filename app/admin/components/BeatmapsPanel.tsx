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
  Table,
  TextField,
} from "@heroui/react";
import { ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  useBeatmaps,
  useCreateBeatmap,
  useDeleteBeatmap,
  useFetchBeatmapByOsuId,
  useUpdateBeatmap,
  type BeatmapItem,
} from "@/app/lib/hooks";
import PaginationBar from "./PaginationBar";
import EmptyTableState from "./EmptyTableState";
import SearchBar from "./SearchBar";

const MOD_OPTIONS = ["NM", "HD", "HR", "DT", "FM", "Shiro", "TB"];
const STATUS_OPTIONS = ["ranked", "loved", "qualified", "graveyard"];
const PER_PAGE = 10;
const SEARCH_PER_PAGE = 200;

const blankBm = {
  onlineID: 0,
  title: "",
  artist: "",
  version: "",
  difficultyRating: 0,
  status: "ranked",
  modString: "NM",
};

type BmForm = typeof blankBm;

/** Admin tab: beatmap list with search, pagination, create/edit modal and delete confirmation. */
export default function BeatmapsPanel({ enabled }: { enabled: boolean }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [bmModal, setBmModal] = useState(false);
  const [bmEditId, setBmEditId] = useState<string | null>(null);
  const [bmF, setBmF] = useState<BmForm>(blankBm);
  // Whether the "调整并确认信息" section is visible. In create mode it only
  // expands after a successful "使用ID获取" fetch; in edit mode it starts open.
  const [bmFetched, setBmFetched] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const perPage = search ? SEARCH_PER_PAGE : PER_PAGE;

  const {
    data: beatmaps = [],
    pagination,
    isLoading,
  } = useBeatmaps(enabled, search ? 1 : page, perPage);

  const filteredBeatmaps = search
    ? beatmaps.filter(
      (b) =>
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.artist.toLowerCase().includes(search.toLowerCase()) ||
        b.version.toLowerCase().includes(search.toLowerCase()),
    )
    : beatmaps;

  const createBm = useCreateBeatmap();
  const updateBm = useUpdateBeatmap();
  const deleteBm = useDeleteBeatmap();
  const fetchBm = useFetchBeatmapByOsuId();

  const openBmCreate = () => {
    setBmEditId(null);
    setBmF(blankBm);
    setBmFetched(false);
    setBmModal(true);
  };

  const openBmEdit = (b: BeatmapItem) => {
    setBmEditId(b.id);
    setBmF({
      onlineID: Number(b.onlineID),
      title: b.title,
      artist: b.artist,
      version: b.version,
      difficultyRating: b.difficultyRating,
      status: b.status,
      modString: b.modString,
    });
    setBmFetched(true);
    setBmModal(true);
  };

  // Pull beatmap metadata from the backend by osu! id. The backend fetcher
  // (Redis → Mongo → osu! API) upserts the document on a cache miss, so the
  // returned beatmap always has a database id — switch to patch mode to avoid
  // a 409 on the subsequent POST create.
  const fetchBmInfo = () => {
    if (!bmF.onlineID) return;
    fetchBm.mutate(bmF.onlineID, {
      onSuccess: (b) => {
        setBmF((p) => ({
          onlineID: Number(b.onlineID),
          title: b.title ?? "",
          artist: b.artist ?? "",
          version: b.version ?? "",
          difficultyRating: b.difficultyRating ?? 0,
          status: STATUS_OPTIONS.includes(b.status) ? b.status : p.status,
          modString: MOD_OPTIONS.includes(b.modString)
            ? b.modString
            : p.modString || "NM",
        }));
        setBmEditId(b.id);
        setBmFetched(true);
      },
    });
  };

  const saveBm = () => {
    if (bmEditId) {
      updateBm.mutate(
        {id: bmEditId, ...bmF},
        {onSuccess: () => setBmModal(false)},
      );
    } else {
      createBm.mutate(bmF, {onSuccess: () => setBmModal(false)});
    }
  };

  const removeBm = (b: BeatmapItem) => {
    setDeleteTarget({id: b.id, title: `${b.title} — ${b.artist}`});
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteBm.mutate(deleteTarget.id, {onSuccess: () => setDeleteTarget(null)});
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <SearchBar
          placeholder="搜索标题、艺术家或难度名..."
          value={searchInput}
          onValueChange={setSearchInput}
          onSearch={(term) => {
            setSearch(term);
            setPage(1);
          }}
          onClear={() => setSearch("")}
        />
        <Button variant="primary" size="sm" onPress={openBmCreate}>
          <Plus className="w-4 h-4"/>
          新谱面
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
              <Table.Content aria-label="Beatmaps" className="h-full">
                <Table.Header>
                  <Table.Column isRowHeader={true}>谱面</Table.Column>
                  <Table.Column>难度</Table.Column>
                  <Table.Column>分类</Table.Column>
                  <Table.Column>状态</Table.Column>
                  <Table.Column>操作</Table.Column>
                </Table.Header>
                <Table.Body renderEmptyState={EmptyTableState}>
                  {filteredBeatmaps.map((b) => (
                    <Table.Row key={b.id}>
                      <Table.Cell>
                        <div>
                          <div className="font-medium">{b.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {b.artist} — {b.version}
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <Chip size="sm" variant="soft">
                          {(b.difficultyRating ?? 0).toFixed(1)}★
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <Chip size="sm" variant="soft" color="accent">
                          {b.modString}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <Chip
                          size="sm"
                          variant="soft"
                          color={b.status === "ranked" ? "success" : "default"}
                        >
                          {b.status}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            isIconOnly
                            aria-label="在官网显示"
                            onPress={() =>
                              window.open(
                                `https://osu.ppy.sh/beatmaps/${b.onlineID}`,
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                          >
                            <ExternalLink className="w-4 h-4"/>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            isIconOnly
                            onPress={() => openBmEdit(b)}
                          >
                            <Pencil className="w-4 h-4"/>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            isIconOnly
                            onPress={() => removeBm(b)}
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
            perPage={perPage}
            onPageChangeAction={setPage}
            filteredCount={search ? filteredBeatmaps.length : undefined}
          />
        </>
      )}

      {/* ---- Create / edit beatmap modal ---- */}
      <Modal
        isOpen={bmModal}
        onOpenChange={(o) => {
          if (!o) setBmModal(false);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>
                  {bmEditId ? "编辑谱面" : "新谱面"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-5">
                  {/* ---- Part 1: 使用ID获取 ---- */}
                  <section className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold">使用ID获取</h3>
                    <div className="flex items-end gap-2">
                      <TextField className="flex-1" variant="secondary">
                        <Label>谱面 ID</Label>
                        <Input
                          type="number"
                          value={String(bmF.onlineID)}
                          disabled={bmEditId !== null}
                          onChange={(e) =>
                            setBmF((p) => ({
                              ...p,
                              onlineID: Number(
                                (e.target as HTMLInputElement).value,
                              ),
                            }))
                          }
                        />
                      </TextField>
                      {!bmEditId && (
                        <Button
                          variant="secondary"
                          onPress={fetchBmInfo}
                          isDisabled={fetchBm.isPending || !bmF.onlineID}
                        >
                          <Search className="w-4 h-4"/>
                          {fetchBm.isPending ? "获取中..." : "获取"}
                        </Button>
                      )}
                    </div>
                  </section>

                  {/* ---- Part 2: 调整并确认信息 ---- */}
                  <section className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold">调整并确认信息</h3>
                    {bmFetched ? (
                      <div className="flex flex-col gap-4">
                        <TextField variant="secondary">
                          <Label>标题</Label>
                          <Input
                            value={bmF.title}
                            onChange={(e) =>
                              setBmF((p) => ({
                                ...p,
                                title: (e.target as HTMLInputElement).value,
                              }))
                            }
                          />
                        </TextField>
                        <TextField variant="secondary">
                          <Label>艺术家</Label>
                          <Input
                            value={bmF.artist}
                            onChange={(e) =>
                              setBmF((p) => ({
                                ...p,
                                artist: (e.target as HTMLInputElement).value,
                              }))
                            }
                          />
                        </TextField>
                        <TextField variant="secondary">
                          <Label>难度名</Label>
                          <Input
                            value={bmF.version}
                            onChange={(e) =>
                              setBmF((p) => ({
                                ...p,
                                version: (e.target as HTMLInputElement).value,
                              }))
                            }
                          />
                        </TextField>
                        <TextField variant="secondary">
                          <Label>星数评价</Label>
                          <Input
                            type="number"
                            value={String(bmF.difficultyRating)}
                            onChange={(e) =>
                              setBmF((p) => ({
                                ...p,
                                difficultyRating: Number(
                                  (e.target as HTMLInputElement).value,
                                ),
                              }))
                            }
                          />
                        </TextField>
                        <Select
                          variant="secondary"
                          selectedKey={bmF.modString}
                          onSelectionChange={(v) =>
                            setBmF((p) => ({...p, modString: v as string}))
                          }
                        >
                          <Label>图池分类</Label>
                          <Select.Trigger>
                            <Select.Value/>
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {MOD_OPTIONS.map((m) => (
                                <ListBox.Item key={m} id={m}>
                                  {m}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                        <Select
                          variant="secondary"
                          selectedKey={bmF.status}
                          onSelectionChange={(v) =>
                            setBmF((p) => ({...p, status: v as string}))
                          }
                        >
                          <Label>状态</Label>
                          <Select.Trigger>
                            <Select.Value/>
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {STATUS_OPTIONS.map((s) => (
                                <ListBox.Item key={s} id={s}>
                                  {s}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        请先输入 osu! 谱面 ID（注意不是谱面集 ID），以获取基本信息。
                      </p>
                    )}
                  </section>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={() => setBmModal(false)}>
                  取消
                </Button>
                <Button
                  variant="primary"
                  onPress={saveBm}
                  isDisabled={
                    !bmFetched ||
                    createBm.isPending ||
                    updateBm.isPending
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
                <AlertDialog.Heading>删除谱面</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  确定要删除{" "}
                  <span className="font-medium">{deleteTarget?.title}</span>？
                  该操作无法撤销。
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
                  isDisabled={deleteBm.isPending}
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
