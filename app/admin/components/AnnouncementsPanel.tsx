"use client";

import { useState } from "react";
import {
  AlertDialog,
  Button,
  Chip,
  Input,
  Label,
  Modal,
  Spinner,
  Switch,
  Table,
  TextArea,
  TextField,
} from "@heroui/react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  useAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  usePublishAnnouncement,
  useUpdateAnnouncement,
  type AnnouncementItem,
} from "@/app/lib/hooks";
import PaginationBar from "./PaginationBar";
import EmptyTableState from "./EmptyTableState";
import SearchBar from "./SearchBar";

const PER_PAGE = 10;
const SEARCH_PER_PAGE = 200;

const blankAnn = {title: "", content: "", pinned: false};

type AnnForm = typeof blankAnn;

/** Admin tab: announcement list with search, pagination, create/edit modal, publish and delete. */
export default function AnnouncementsPanel({ enabled }: { enabled: boolean }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [annModal, setAnnModal] = useState(false);
  const [annEditId, setAnnEditId] = useState<string | null>(null);
  const [annF, setAnnF] = useState<AnnForm>(blankAnn);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const perPage = search ? SEARCH_PER_PAGE : PER_PAGE;

  const {
    data: anns = [],
    pagination,
    isLoading,
  } = useAnnouncements(enabled, search ? 1 : page, perPage);

  const filteredAnns = search
    ? anns.filter(
      (a) =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.content.toLowerCase().includes(search.toLowerCase()),
    )
    : anns;

  const createAnn = useCreateAnnouncement();
  const updateAnn = useUpdateAnnouncement();
  const deleteAnn = useDeleteAnnouncement();
  const publishAnn = usePublishAnnouncement();

  const openAnnCreate = () => {
    setAnnEditId(null);
    setAnnF(blankAnn);
    setAnnModal(true);
  };

  const openAnnEdit = (a: AnnouncementItem) => {
    setAnnEditId(a.id);
    setAnnF({title: a.title, content: a.content, pinned: a.pinned});
    setAnnModal(true);
  };

  const setAnnVisibility = (a: AnnouncementItem, isVisible: boolean) => {
    updateAnn.mutate({id: a.id, visible: isVisible});
  };

  const saveAnn = () => {
    if (annEditId) {
      updateAnn.mutate(
        {id: annEditId, ...annF},
        {onSuccess: () => setAnnModal(false)},
      );
    } else {
      createAnn.mutate(annF, {onSuccess: () => setAnnModal(false)});
    }
  };

  const removeAnn = (a: AnnouncementItem) => {
    setDeleteTarget({id: a.id, title: a.title});
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteAnn.mutate(deleteTarget.id, {onSuccess: () => setDeleteTarget(null)});
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <SearchBar
          placeholder="搜索标题或内容..."
          value={searchInput}
          onValueChange={setSearchInput}
          onSearch={(term) => {
            setSearch(term);
            setPage(1);
          }}
          onClear={() => setSearch("")}
        />
        <Button variant="primary" size="sm" onPress={openAnnCreate}>
          <Plus className="w-4 h-4"/>
          新公告
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
              <Table.Content aria-label="Announcements" className="h-full">
                <Table.Header>
                  <Table.Column isRowHeader={true}>可见</Table.Column>
                  <Table.Column isRowHeader={true}>标题</Table.Column>
                  <Table.Column>已固定</Table.Column>
                  <Table.Column>发布于</Table.Column>
                  <Table.Column>操作</Table.Column>
                </Table.Header>
                <Table.Body renderEmptyState={EmptyTableState}>
                  {filteredAnns.map((a) => (
                    <Table.Row key={a.id}>
                      <Table.Cell>
                        <Switch
                          aria-label="使公告对外可见"
                          isSelected={a.visible}
                          onChange={v => setAnnVisibility(a, v)}
                        >
                          <Switch.Content>
                            <Switch.Control>
                              <Switch.Thumb/>
                            </Switch.Control>
                          </Switch.Content>
                        </Switch>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="font-medium">{a.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {a.content?.slice(0, 80)}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <Chip
                          size="sm"
                          variant="soft"
                          color={a.pinned ? "warning" : "default"}
                        >
                          {a.pinned ? "Yes" : "No"}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <Chip
                          size="sm"
                          variant="soft"
                          color={a.publishedAt ? "success" : "default"}
                        >
                          {a.publishedAt ? "Yes" : "Draft"}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            isIconOnly
                            onPress={() => openAnnEdit(a)}
                          >
                            <Pencil className="w-4 h-4"/>
                          </Button>
                          {!a.publishedAt && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onPress={() => publishAnn.mutate(a.id)}
                            >
                              发布
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            isIconOnly
                            onPress={() => removeAnn(a)}
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
            filteredCount={search ? filteredAnns.length : undefined}
          />
        </>
      )}

      {/* ---- Create / edit announcement modal ---- */}
      <Modal
        isOpen={annModal}
        onOpenChange={(o) => {
          if (!o) setAnnModal(false);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>
                  {annEditId ? "编辑公告" : "新公告"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-4">
                  <TextField variant="secondary">
                    <Label>标题</Label>
                    <Input
                      value={annF.title}
                      onChange={(e) =>
                        setAnnF((p) => ({
                          ...p,
                          title: (e.target as HTMLInputElement).value,
                        }))
                      }
                    />
                  </TextField>
                  <TextField variant="secondary">
                    <Label>内容</Label>
                    <TextArea
                      rows={5}
                      value={annF.content}
                      onChange={(e) =>
                        setAnnF((p) => ({
                          ...p,
                          content: (e.target as HTMLTextAreaElement).value,
                        }))
                      }
                    />
                  </TextField>
                  <Switch
                    isSelected={annF.pinned}
                    onChange={(v) => setAnnF((p) => ({...p, pinned: v}))}
                  >
                    <Switch.Content>
                      置顶
                      <Switch.Control>
                        <Switch.Thumb/>
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={() => setAnnModal(false)}>
                  取消
                </Button>
                <Button
                  variant="primary"
                  onPress={saveAnn}
                  isDisabled={createAnn.isPending || updateAnn.isPending}
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
                <AlertDialog.Heading>删除公告</AlertDialog.Heading>
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
                  isDisabled={deleteAnn.isPending}
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
