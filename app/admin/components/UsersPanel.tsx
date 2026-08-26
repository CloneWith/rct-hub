"use client";

import { useState } from "react";
import {
  Avatar,
  Button,
  Checkbox,
  CheckboxGroup,
  Chip,
  Description,
  Label,
  ListBox,
  Modal,
  Select,
  Spinner,
  Surface,
  Table,
  TextField,
  Input,
} from "@heroui/react";
import { Pencil, Search, UserPlus } from "lucide-react";
import {
  useFetchUserByOsuId,
  useSetUserBanned,
  useUpdateUserRoles,
  useUpdateVerifyStatus,
  useUsers,
  type FetchedUser,
  type UserItem,
} from "@/app/lib/hooks";
import VerifyBadge from "@/app/components/VerifyBadge";
import RoleBadge from "@/app/components/RoleBadge";
import PaginationBar from "./PaginationBar";
import EmptyTableState from "./EmptyTableState";
import SearchBar from "./SearchBar";
import { AvailableRoles, AvailableVerifyStatuses } from "@/app/lib/model";

const PER_PAGE = 10;
const SEARCH_PER_PAGE = 200;

/** Admin tab: user list with search, pagination, role/verify editing and banning. */
export default function UsersPanel({ enabled }: { enabled: boolean }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editVerifyStatus, setEditVerifyStatus] = useState("UNVERIFIED");
  const [banningUserId, setBanningUserId] = useState<string | null>(null);

  // ---- Add user (two-step modal, mirrors the beatmap fetch flow) ----
  const [addModal, setAddModal] = useState(false);
  const [addOsuId, setAddOsuId] = useState(0);
  const [fetchedUser, setFetchedUser] = useState<FetchedUser | null>(null);

  const perPage = search ? SEARCH_PER_PAGE : PER_PAGE;

  const {
    data: users = [],
    pagination,
    isLoading,
  } = useUsers(enabled, search ? 1 : page, perPage);

  const filteredUsers = search
    ? users.filter(
      (u) =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        String(u.onlineID).includes(search),
    )
    : users;

  const updateRoles = useUpdateUserRoles();
  const setBanned = useSetUserBanned();
  const setVerify = useUpdateVerifyStatus();
  const fetchUser = useFetchUserByOsuId();

  const userById = (id: string) => users.find((u) => u.id === id);

  const openUserEdit = (id: string) => {
    const target = userById(id);
    setEditUserId(id);
    setEditRoles([...(target?.roles ?? [])]);
    setEditVerifyStatus(target?.verifyStatus ?? "");
  };

  const openAddUser = () => {
    setAddOsuId(0);
    setFetchedUser(null);
    setAddModal(true);
  };

  // Pull the profile from the backend by osu! id. The backend fetcher
  // (Redis → Mongo → osu! API) upserts the user document on a cache miss,
  // so a success already means the user is stored and visible in the list.
  const fetchUserInfo = () => {
    if (!addOsuId) return;
    fetchUser.mutate(addOsuId, {
      onSuccess: (u) => setFetchedUser(u),
    });
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

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <SearchBar
          placeholder="搜索用户名或 ID..."
          value={searchInput}
          onValueChange={setSearchInput}
          onSearch={(term) => {
            setSearch(term);
            setPage(1);
          }}
          onClear={() => setSearch("")}
        />
        <Button variant="primary" size="sm" onPress={openAddUser}>
          <UserPlus className="w-4 h-4"/>
          添加用户
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
              <Table.Content aria-label="Users" className="h-full">
                <Table.Header>
                  <Table.Column isRowHeader={true}>用户</Table.Column>
                  <Table.Column>角色</Table.Column>
                  <Table.Column>认证</Table.Column>
                  <Table.Column>封禁状态</Table.Column>
                  <Table.Column>操作</Table.Column>
                </Table.Header>
                <Table.Body renderEmptyState={EmptyTableState}>
                  {filteredUsers.map((u) => (
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
          <PaginationBar
            page={page}
            totalPages={pagination?.totalPages ?? 1}
            total={pagination?.total ?? 0}
            perPage={perPage}
            onPageChangeAction={setPage}
            filteredCount={search ? filteredUsers.length : undefined}
          />
        </>
      )}

      {/* ---- Edit user modal ---- */}
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
                      {AvailableRoles.map(([role, details]) => (
                        <Checkbox key={role} value={role}>
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator/>
                            </Checkbox.Control>
                            {details.name}
                          </Checkbox.Content>
                        </Checkbox>
                      ))}
                    </CheckboxGroup>
                  </Surface>
                  {editUserId && userById(editUserId) && (
                    <Select
                      variant="secondary"
                      value={editVerifyStatus}
                      onChange={(v) => setEditVerifyStatus(v as string)}
                    >
                      <Label>认证状态</Label>
                      <Select.Trigger>
                        <Select.Value/>
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {AvailableVerifyStatuses.map(([v, details]) => (
                            <ListBox.Item key={v} id={v}>
                              {details.name}
                              <ListBox.ItemIndicator />
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

      {/* ---- Add user modal (two-step: osu id → fetch → confirm) ---- */}
      <Modal
        isOpen={addModal}
        onOpenChange={(o) => {
          if (!o) setAddModal(false);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Icon className="bg-default text-foreground">
                  <UserPlus className="size-5"/>
                </Modal.Icon>
                <Modal.Heading>添加用户</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-5">
                  {/* ---- Part 1: 使用ID获取 ---- */}
                  <section className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold">使用ID获取</h3>
                    <div className="flex items-end gap-2">
                      <TextField className="flex-1" variant="secondary">
                        <Label>osu! 用户 ID</Label>
                        <Input
                          type="number"
                          value={String(addOsuId)}
                          onChange={(e) =>
                            setAddOsuId(Number((e.target as HTMLInputElement).value))
                          }
                        />
                      </TextField>
                      <Button
                        variant="secondary"
                        onPress={fetchUserInfo}
                        isDisabled={fetchUser.isPending || !addOsuId}
                      >
                        <Search className="w-4 h-4"/>
                        {fetchUser.isPending ? "获取中..." : "获取"}
                      </Button>
                    </div>
                  </section>

                  {/* ---- Part 2: 确认用户信息 ---- */}
                  <section className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold">确认用户信息</h3>
                    {fetchedUser ? (
                      <Surface
                        variant="secondary"
                        className="flex items-center gap-4 rounded-2xl p-4"
                      >
                        <Avatar size="lg">
                          <Avatar.Image src={fetchedUser.avatarUrl} alt=""/>
                          <Avatar.Fallback>
                            {fetchedUser.username.slice(0, 2).toUpperCase()}
                          </Avatar.Fallback>
                        </Avatar>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {fetchedUser.username}
                            </span>
                            <Chip size="sm" variant="soft">
                              {fetchedUser.countryCode}
                            </Chip>
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            #{fetchedUser.onlineID}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            全球排名 #{fetchedUser.globalRank} · {fetchedUser.pp}pp
                          </div>
                        </div>
                      </Surface>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        输入 osu! 用户 ID 并获取 —
                        未入库的用户会自动从 osu! API 拉取资料并保存。
                      </p>
                    )}
                  </section>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={() => setAddModal(false)}>
                  关闭
                </Button>
                <Button
                  variant="primary"
                  onPress={() => setAddModal(false)}
                  isDisabled={!fetchedUser}
                >
                  完成
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
