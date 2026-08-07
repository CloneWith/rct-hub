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
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  usePublishAnnouncement,
  type UserItem,
  type BeatmapItem,
  type AnnouncementItem,
} from "@/app/lib/hooks";

// ---- constants ----
const ROLE_OPTIONS = ["PLAYER", "STRATEGIST", "REFEREE", "STREAMER", "ADMIN"];
const VERIFY_OPTIONS = ["VERIFIED", "PENDING", "UNVERIFIED"] as const;
const MOD_OPTIONS = ["NM", "HD", "HR", "DT", "FM", "Shiro", "TB"];
const STATUS_OPTIONS = ["ranked", "loved", "qualified", "graveyard"];

// ---- helpers ----
function chipColor(role: string) {
  return role === "ADMIN"
    ? ("danger" as const)
    : role === "REFEREE"
      ? ("warning" as const)
      : ("accent" as const);
}

function verifyColor(s: string) {
  return s === "VERIFIED"
    ? ("success" as const)
    : s === "PENDING"
      ? ("warning" as const)
      : ("default" as const);
}

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
  const {user} = useAuth();
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
  const createAnn = useCreateAnnouncement();
  const updateAnn = useUpdateAnnouncement();
  const deleteAnn = useDeleteAnnouncement();
  const publishAnn = usePublishAnnouncement();

  // ---- UI state ----
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);

  const [bmModal, setBmModal] = useState(false);
  const [bmEditId, setBmEditId] = useState<string | null>(null);
  const [bmF, setBmF] = useState(blankBm);

  const [annModal, setAnnModal] = useState(false);
  const [annEditId, setAnnEditId] = useState<string | null>(null);
  const [annF, setAnnF] = useState(blankAnn);

  // ---- helper ----
  const userById = (id: string) => users.find((u) => u.id === id);

  // ---- User modal ----
  const openUserEdit = (id: string) => {
    setEditUserId(id);
    setEditRoles([...(userById(id)?.roles ?? [])]);
  };

  const saveUser = () => {
    if (!editUserId) return;
    updateRoles.mutate(
      {id: editUserId, roles: editRoles},
      {onSuccess: () => setEditUserId(null)},
    );
  };

  const toggleBan = (u: UserItem) => {
    setBanned.mutate({id: u.id, isBanned: !u.isBanned});
  };

  const changeVerify = (u: UserItem, status: string) => {
    setVerify.mutate({id: u.id, verifyStatus: status});
  };

  // ---- Beatmap modal ----
  const openBmCreate = () => {
    setBmEditId(null);
    setBmF(blankBm);
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
    setBmModal(true);
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

  const removeBm = (id: string) => {
    if (!confirm("Delete this beatmap?")) return;
    deleteBm.mutate(id);
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

  const removeAnn = (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    deleteAnn.mutate(id);
  };

  const pubAnn = (id: string) => publishAnn.mutate(id);

  // ---- Loading / access denied ----
  if (!user)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg"/>
      </div>
    );

  if (!isAdmin)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <Shield className="w-16 h-16 text-muted-foreground/30"/>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You need admin privileges to access this page.
        </p>
        <Button
          variant="secondary"
          onPress={() => router.push("/")}
        >
          <ArrowLeft className="w-4 h-4"/>
          Back to Home
        </Button>
      </div>
    );

  // ---- Admin view ----
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Shield className="w-8 h-8 text-primary"/>
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage users, beatmaps, and announcements.
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
              Users
              <Tabs.Indicator/>
            </Tabs.Tab>
            <Tabs.Tab id="beatmaps">
              <Music className="w-4 h-4 inline mr-1.5"/>
              Beatmaps
              <Tabs.Indicator/>
            </Tabs.Tab>
            <Tabs.Tab id="announcements">
              <Megaphone className="w-4 h-4 inline mr-1.5"/>
              Announcements
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
                    <Table.Column isRowHeader={true}>User</Table.Column>
                    <Table.Column>Roles</Table.Column>
                    <Table.Column>Verify</Table.Column>
                    <Table.Column>Banned</Table.Column>
                    <Table.Column>Actions</Table.Column>
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
                              <div className="text-xs text-muted-foreground">
                                #{u.onlineID}
                              </div>
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <Chip
                                key={r}
                                size="sm"
                                variant="soft"
                                color={chipColor(r)}
                              >
                                {r}
                              </Chip>
                            ))}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <Chip
                            size="sm"
                            variant="soft"
                            color={verifyColor(u.verifyStatus)}
                          >
                            {u.verifyStatus}
                          </Chip>
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
                              isDisabled={setBanned.isPending}
                            >
                              {u.isBanned ? "Unban" : "Ban"}
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
              Add Beatmap
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
                    <Table.Column isRowHeader={true}>Beatmap</Table.Column>
                    <Table.Column>Difficulty</Table.Column>
                    <Table.Column>Mod</Table.Column>
                    <Table.Column>Status</Table.Column>
                    <Table.Column>Actions</Table.Column>
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
                              onPress={() => openBmEdit(b)}
                            >
                              <Pencil className="w-4 h-4"/>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              isIconOnly
                              onPress={() => removeBm(b.id)}
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
              New Announcement
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
                    <Table.Column isRowHeader={true}>Title</Table.Column>
                    <Table.Column>Pinned</Table.Column>
                    <Table.Column>Published</Table.Column>
                    <Table.Column>Actions</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {anns.map((a) => (
                      <Table.Row key={a.id}>
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
                                Publish
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              isIconOnly
                              onPress={() => removeAnn(a.id)}
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
                <Modal.Heading>
                  Edit User: {userById(editUserId ?? "")?.username}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-4">
                  <div>
                    <Label>Roles</Label>
                    <Description>Select roles for this user.</Description>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {ROLE_OPTIONS.map((role) => (
                        <Chip
                          key={role}
                          variant={
                            editRoles.includes(role) ? "primary" : "secondary"
                          }
                          color={
                            editRoles.includes(role)
                              ? chipColor(role)
                              : "default"
                          }
                          className="cursor-pointer"
                          onClick={() =>
                            setEditRoles((p) =>
                              p.includes(role)
                                ? p.filter((r) => r !== role)
                                : [...p, role],
                            )
                          }
                        >
                          {role}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  {editUserId && userById(editUserId) && (
                    <Select
                      value={userById(editUserId)!.verifyStatus}
                      onChange={(v) =>
                        changeVerify(userById(editUserId)!, v as string)
                      }
                    >
                      <Label>Verify Status</Label>
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
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={saveUser}
                  isDisabled={updateRoles.isPending}
                >
                  Save
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
                  {bmEditId ? "Edit Beatmap" : "Add Beatmap"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-4">
                  <TextField>
                    <Label>osu! Beatmap ID</Label>
                    <Input
                      type="number"
                      value={String(bmF.onlineID)}
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
                  <TextField>
                    <Label>Title</Label>
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
                    <Label>Artist</Label>
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
                    <Label>Version (diff name)</Label>
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
                    <Label>Star Rating</Label>
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
                    value={bmF.modString}
                    onChange={(v) =>
                      setBmF((p) => ({...p, modString: v as string}))
                    }
                  >
                    <Label>Mod</Label>
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
                    value={bmF.status}
                    onChange={(v) =>
                      setBmF((p) => ({...p, status: v as string}))
                    }
                  >
                    <Label>Status</Label>
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
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={() => setBmModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={saveBm}
                  isDisabled={createBm.isPending || updateBm.isPending}
                >
                  Save
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
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>
                  {annEditId ? "Edit Announcement" : "New Announcement"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-4">
                  <TextField>
                    <Label>Title</Label>
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
                    <Label>Content</Label>
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
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={annF.pinned}
                      onChange={(e) =>
                        setAnnF((p) => ({...p, pinned: e.target.checked}))
                      }
                    />
                    <Label>Pinned to top</Label>
                  </label>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={() => setAnnModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={saveAnn}
                  isDisabled={createAnn.isPending || updateAnn.isPending}
                >
                  Save
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
