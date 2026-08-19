"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Tabs,
  Table,
  Chip,
  Modal,
  TextField,
  Input,
  TextArea,
  Select,
  Label,
  Description,
  ListBox,
  Spinner,
  Avatar,
  CheckboxGroup,
  Checkbox,
  Surface,
  AlertDialog,
  Switch,
} from "@heroui/react";
import {
  Shield,
  Users,
  Music,
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  ExternalLink,
  Search, ShieldQuestion,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import {
  useUsers,
  useBeatmaps,
  useAnnouncements,
  useUpdateUserRoles,
  useSetUserBanned,
  useUpdateVerifyStatus,
  useCreateBeatmap,
  useUpdateBeatmap,
  useDeleteBeatmap,
  useFetchBeatmapByOsuId,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  usePublishAnnouncement,
  type UserItem,
  type BeatmapItem,
  type AnnouncementItem,
} from "@/app/lib/hooks";
import VerifyBadge from "@/app/components/VerifyBadge";
import RoleBadge from "@/app/components/RoleBadge";

// ---- constants ----
const ROLE_OPTIONS = ["PLAYER", "STRATEGIST", "REFEREE", "STREAMER", "ADMIN"];
const VERIFY_OPTIONS = ["VERIFIED", "PENDING", "UNVERIFIED"] as const;
const MOD_OPTIONS = ["NM", "HD", "HR", "DT", "FM", "Shiro", "TB"];
const STATUS_OPTIONS = ["ranked", "loved", "qualified", "graveyard"];

// ---- helpers ----
// ---- empty beatmap form ----
const blankBm = {
  onlineID: 0,
  title: "",
  artist: "",
  version: "",
  difficultyRating: 0,
  status: "ranked",
  modString: "NM",
};

const blankAnn = {title: "", content: "", pinned: false};

export default function AdminPage() {
  const router = useRouter();
  const {user, loading} = useAuth();
  const isAdmin = user?.roles.includes("ADMIN") ?? false;
  const [activeTab, setActiveTab] = useState("users");

  // ---- Data hooks (enabled only for admins) ----
  const {
    data: users = [],
    isLoading: usersLoading,
  } = useUsers(isAdmin);
  const {
    data: beatmaps = [],
    isLoading: beatmapsLoading,
  } = useBeatmaps(isAdmin && activeTab === "beatmaps");
  const {
    data: anns = [],
    isLoading: annsLoading,
  } = useAnnouncements(isAdmin && activeTab === "announcements");

  // ---- Mutation hooks ----
  const updateRoles = useUpdateUserRoles();
  const setBanned = useSetUserBanned();
  const setVerify = useUpdateVerifyStatus();
  const createBm = useCreateBeatmap();
  const updateBm = useUpdateBeatmap();
  const deleteBm = useDeleteBeatmap();
  const fetchBm = useFetchBeatmapByOsuId();
  const createAnn = useCreateAnnouncement();
  const updateAnn = useUpdateAnnouncement();
  const deleteAnn = useDeleteAnnouncement();
  const publishAnn = usePublishAnnouncement();

  // ---- UI state ----
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editVerifyStatus, setEditVerifyStatus] = useState<string>("");
  const [banningUserId, setBanningUserId] = useState<string | null>(null);

  const [bmModal, setBmModal] = useState(false);
  const [bmEditId, setBmEditId] = useState<string | null>(null);
  const [bmF, setBmF] = useState(blankBm);
  // Whether the "调整并确认信息" section is visible. In create mode it only
  // expands after a successful "使用ID获取" fetch; in edit mode it starts open.
  const [bmFetched, setBmFetched] = useState(false);

  const [annModal, setAnnModal] = useState(false);
  const [annEditId, setAnnEditId] = useState<string | null>(null);
  const [annF, setAnnF] = useState(blankAnn);

  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "beatmap"; id: string; title: string }
    | { type: "announcement"; id: string; title: string }
    | null
  >(null);

  // ---- helper ----
  const userById = (id: string) => users.find((u) => u.id === id);

  // ---- User modal ----
  const openUserEdit = (id: string) => {
    const target = userById(id);
    setEditUserId(id);
    setEditRoles([...(target?.roles ?? [])]);
    setEditVerifyStatus(target?.verifyStatus ?? "");
  };

  const saveUser = () => {
    if (!editUserId) return;
    const target = userById(editUserId);
    if (!target) return;

    const rolesChanged =
      editRoles.length !== target.roles.length ||
      !editRoles.every((r) => target.roles.some((tr) => tr === r));
    const verifyChanged = editVerifyStatus !== target.verifyStatus;

    const close = () => setEditUserId(null);

    if (rolesChanged && verifyChanged) {
      updateRoles.mutate(
        {id: editUserId, roles: editRoles},
        {
          onSuccess: () =>
            setVerify.mutate(
              {id: editUserId, verifyStatus: editVerifyStatus},
              {onSuccess: close},
            ),
        },
      );
    } else if (rolesChanged) {
      updateRoles.mutate({id: editUserId, roles: editRoles}, {onSuccess: close});
    } else if (verifyChanged) {
      setVerify.mutate(
        {id: editUserId, verifyStatus: editVerifyStatus},
        {onSuccess: close},
      );
    } else {
      close();
    }
  };

  const toggleBan = (u: UserItem) => {
    setBanningUserId(u.id);
    setBanned.mutate(
      {id: u.id, isBanned: !u.isBanned},
      {onSettled: () => setBanningUserId(null)},
    );
  };

  // ---- Beatmap modal ----
  const openBmCreate = () => {
    setBmEditId(null);
    setBmF(blankBm);
    setBmFetched(false);
    setBmModal(true);
  };

  const openBmEdit = (b: BeatmapItem) => {
    setBmEditId(b.id);
    setBmF({
      onlineID: b.onlineID,
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
          onlineID: b.onlineID,
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
    setDeleteTarget({type: "beatmap", id: b.id, title: `${b.title} — ${b.artist}`});
  };

  // ---- Announcement modal ----
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
    setDeleteTarget({type: "announcement", id: a.id, title: a.title});
  };

  const pubAnn = (id: string) => publishAnn.mutate(id);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "beatmap") {
      deleteBm.mutate(deleteTarget.id, {onSuccess: () => setDeleteTarget(null)});
    } else {
      deleteAnn.mutate(deleteTarget.id, {onSuccess: () => setDeleteTarget(null)});
    }
  };

  // ---- Loading / access denied ----
  // Only show the spinner while the auth query is in-flight. Once it
  // resolves, a null user (not logged in) should fall through to the
  // !isAdmin branch and show the same "access denied" UI as a non-admin.
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg"/>
      </div>
    );

  if (!isAdmin)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <ShieldQuestion className="w-16 h-16 text-muted-foreground/30"/>
        <h1 className="text-2xl font-bold">...不熟</h1>
        <p className="text-muted-foreground">
          需要管理员权限才能访问。
        </p>
        <Button
          variant="secondary"
          onPress={() => router.push("/")}
        >
          <ArrowLeft className="w-4 h-4"/>
          返回主页
        </Button>
      </div>
    );

  // ---- Admin view ----
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Shield className="w-8 h-8 text-primary"/>
        <div>
          <h1 className="text-2xl font-bold">管理后台</h1>
          <p className="text-sm text-muted-foreground">
            管理房间、用户、图池与公告。
          </p>
        </div>
      </div>

      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(k) => setActiveTab(k as string)}
        className="mb-8"
      >
        <Tabs.ListContainer>
          <Tabs.List>
            <Tabs.Tab id="users">
              <Users className="w-4 h-4 inline mr-1.5"/>
              用户
              <Tabs.Indicator/>
            </Tabs.Tab>
            <Tabs.Tab id="beatmaps">
              <Music className="w-4 h-4 inline mr-1.5"/>
              谱面
              <Tabs.Indicator/>
            </Tabs.Tab>
            <Tabs.Tab id="announcements">
              <Megaphone className="w-4 h-4 inline mr-1.5"/>
              公告
              <Tabs.Indicator/>
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* ============ USERS ============ */}
        <Tabs.Panel id="users">
          {usersLoading ? (
            <div className="flex justify-center py-12">
              <Spinner/>
            </div>
          ) : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Users">
                  <Table.Header>
                    <Table.Column isRowHeader={true}>用户</Table.Column>
                    <Table.Column>角色</Table.Column>
                    <Table.Column>认证</Table.Column>
                    <Table.Column>封禁状态</Table.Column>
                    <Table.Column>操作</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {users.map((u) => (
                      <Table.Row key={u.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-3">
                            <Avatar size="sm">
                              <Avatar.Image src={u.avatarUrl} alt=""/>
                              <Avatar.Fallback>
                                {u.username.slice(0, 2).toUpperCase()}
                              </Avatar.Fallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{u.username}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                #{u.onlineID}
                              </div>
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <RoleBadge key={r} role={r}/>
                            ))}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <VerifyBadge status={u.verifyStatus}/>
                        </Table.Cell>
                        <Table.Cell>
                          <Chip
                            size="sm"
                            variant="soft"
                            color={u.isBanned ? "danger" : "success"}
                          >
                            {u.isBanned ? "Yes" : "No"}
                          </Chip>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              isIconOnly
                              onPress={() => openUserEdit(u.id)}
                            >
                              <Pencil className="w-4 h-4"/>
                            </Button>
                            <Button
                              size="sm"
                              variant={u.isBanned ? "secondary" : "danger"}
                              onPress={() => toggleBan(u)}
                              isDisabled={banningUserId === u.id}
                            >
                              {u.isBanned ? "解禁" : "禁用"}
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </Tabs.Panel>

        {/* ============ BEATMAPS ============ */}
        <Tabs.Panel id="beatmaps">
          <div className="flex justify-end mb-4">
            <Button variant="primary" size="sm" onPress={openBmCreate}>
              <Plus className="w-4 h-4"/>
              新谱面
            </Button>
          </div>
          {beatmapsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner/>
            </div>
          ) : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Beatmaps">
                  <Table.Header>
                    <Table.Column isRowHeader={true}>谱面</Table.Column>
                    <Table.Column>难度</Table.Column>
                    <Table.Column>分类</Table.Column>
                    <Table.Column>状态</Table.Column>
                    <Table.Column>操作</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {beatmaps.map((b) => (
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
          )}
        </Tabs.Panel>

        {/* ============ ANNOUNCEMENTS ============ */}
        <Tabs.Panel id="announcements">
          <div className="flex justify-end mb-4">
            <Button variant="primary" size="sm" onPress={openAnnCreate}>
              <Plus className="w-4 h-4"/>
              新公告
            </Button>
          </div>
          {annsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner/>
            </div>
          ) : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Announcements">
                  <Table.Header>
                    <Table.Column isRowHeader={true}>可见</Table.Column>
                    <Table.Column isRowHeader={true}>标题</Table.Column>
                    <Table.Column>已固定</Table.Column>
                    <Table.Column>发布于</Table.Column>
                    <Table.Column>操作</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {anns.map((a) => (
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
                                onPress={() => pubAnn(a.id)}
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
          )}
        </Tabs.Panel>
      </Tabs>

      {/* ============ USER EDIT MODAL ============ */}
      <Modal
        isOpen={editUserId !== null}
        onOpenChange={(o) => {
          if (!o) setEditUserId(null);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Icon className="bg-default text-foreground">
                  <Pencil className="size-5"/>
                </Modal.Icon>
                <Modal.Heading>
                  编辑用户 {userById(editUserId ?? "")?.username}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-4">
                  <Surface className="flex flex-col gap-1 rounded-2xl p-4" variant="secondary">
                    <CheckboxGroup
                      value={editRoles}
                      onChange={(v) => setEditRoles(v as string[])}
                    >
                      <Label>角色</Label>
                      <Description>为用户分配角色。</Description>
                      {ROLE_OPTIONS.map((role) => (
                        <Checkbox key={role} value={role}>
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator/>
                            </Checkbox.Control>
                            {role}
                          </Checkbox.Content>
                        </Checkbox>
                      ))}
                    </CheckboxGroup>
                  </Surface>
                  {editUserId && userById(editUserId) && (
                    <Select
                      selectedKey={editVerifyStatus}
                      onSelectionChange={(v) => setEditVerifyStatus(v as string)}
                    >
                      <Label>验证状态</Label>
                      <Select.Trigger>
                        <Select.Value/>
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {VERIFY_OPTIONS.map((v) => (
                            <ListBox.Item key={v} id={v}>
                              {v}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={() => setEditUserId(null)}>
                  取消
                </Button>
                <Button
                  variant="primary"
                  onPress={saveUser}
                  isDisabled={updateRoles.isPending || setVerify.isPending}
                >
                  保存
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ============ BEATMAP MODAL ============ */}
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
                      <TextField className="flex-1">
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
                        <TextField>
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
                        <TextField>
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
                        <TextField>
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
                        <TextField>
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

      {/* ============ ANNOUNCEMENT MODAL ============ */}
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
                  <TextField>
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
                  <TextField>
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

      {/* ============ DELETE CONFIRMATION ============ */}
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
                <AlertDialog.Heading>
                  删除 {deleteTarget?.type === "beatmap" ? "谱面" : "公告"}
                </AlertDialog.Heading>
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
                  isDisabled={deleteBm.isPending || deleteAnn.isPending}
                >
                  删除
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
