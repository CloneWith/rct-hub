"use client";

import { useState } from "react";
import {
  AlertDialog,
  Avatar,
  Button,
  Chip,
  Input,
  Label,
  Modal,
  Spinner,
  Table,
  TextField,
} from "@heroui/react";
import { Pencil, Plus, Search, Trash2, Trophy, UserPlus } from "lucide-react";
import {
  useCreateTeam,
  useDeleteTeam,
  useFetchUserByOsuId,
  useTeams,
  useUpdateTeam,
  type FetchedUser,
  type TeamForm,
  type TeamItem,
} from "@/app/lib/hooks";
import PaginationBar from "./PaginationBar";
import EmptyTableState from "./EmptyTableState";
import SearchBar from "./SearchBar";

const PER_PAGE = 10;

const blankTeam: TeamForm = {
  name: "",
  description: "",
  seed: "",
  leaderID: null,
  strategistID: null,
  playerIDs: [],
};

/** Admin tab: team list with search, pagination, create/edit modal and delete confirmation. */
export default function TeamsPanel({ enabled }: { enabled: boolean }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [teamModal, setTeamModal] = useState(false);
  const [teamEditId, setTeamEditId] = useState<string | null>(null);
  const [teamF, setTeamF] = useState<TeamForm>(blankTeam);
  // Resolved usernames for the leader/strategist id inputs. When editing an
  // existing team these are seeded from the GraphQL players list; the "获取"
  // button re-verifies the id through the fetch-through upsert resolver.
  const [leaderName, setLeaderName] = useState<string | null>(null);
  const [strategistName, setStrategistName] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const {
    data: teams = [],
    pagination,
    isLoading,
  } = useTeams(enabled, page, PER_PAGE, search);

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const fetchUser = useFetchUserByOsuId();

  const openTeamCreate = () => {
    setTeamEditId(null);
    setTeamF(blankTeam);
    setLeaderName(null);
    setStrategistName(null);
    setTeamModal(true);
  };

  const openTeamEdit = (t: TeamItem) => {
    const nameById = new Map<number, string>(
      t.players.map((p) => [Number(p.onlineID), p.username]),
    );
    setTeamEditId(t.id);
    setTeamF({
      name: t.name,
      description: t.description ?? "",
      seed: t.seed ?? "",
      leaderID: t.leaderID != null ? Number(t.leaderID) : null,
      strategistID: t.strategistID != null ? Number(t.strategistID) : null,
      playerIDs: t.playerIDs.map(Number),
    });
    setLeaderName(t.leaderID != null ? (nameById.get(Number(t.leaderID)) ?? null) : null);
    setStrategistName(
      t.strategistID != null ? (nameById.get(Number(t.strategistID)) ?? null) : null,
    );
    setTeamModal(true);
  };

  // Verify a member osu! id through the fetch-through upsert resolver and
  // surface the username under the input.
  const resolveMember = (osuId: number, which: "leader" | "strategist") => {
    fetchUser.mutate(osuId, {
      onSuccess: (u: FetchedUser) => {
        if (which === "leader") setLeaderName(u.username);
        else setStrategistName(u.username);
      },
    });
  };

  const saveTeam = () => {
    const payload: TeamForm = {
      ...teamF,
      playerIDs: teamF.playerIDs.filter((id) => id > 0),
    };
    if (teamEditId) {
      updateTeam.mutate(
        {id: teamEditId, ...payload},
        {onSuccess: () => setTeamModal(false)},
      );
    } else {
      createTeam.mutate(payload, {onSuccess: () => setTeamModal(false)});
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteTeam.mutate(deleteTarget.id, {onSuccess: () => setDeleteTarget(null)});
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <SearchBar
          placeholder="搜索队伍名称或 seed..."
          value={searchInput}
          onValueChange={setSearchInput}
          onSearch={(term) => {
            setSearch(term);
            setPage(1);
          }}
          onClear={() => setSearch("")}
        />
        <Button variant="primary" size="sm" onPress={openTeamCreate}>
          <Plus className="w-4 h-4"/>
          新队伍
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
              <Table.Content aria-label="Teams" className="h-full">
                <Table.Header>
                  <Table.Column isRowHeader={true}>队伍</Table.Column>
                  <Table.Column>队长</Table.Column>
                  <Table.Column>策略师</Table.Column>
                  <Table.Column>队员</Table.Column>
                  <Table.Column>就绪状态</Table.Column>
                  <Table.Column>操作</Table.Column>
                </Table.Header>
                <Table.Body renderEmptyState={EmptyTableState}>
                  {teams.map((t) => {
                    const nameById = new Map<number, string>(
                      t.players.map((p) => [Number(p.onlineID), p.username]),
                    );
                    return (
                      <Table.Row key={t.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-muted-foreground"/>
                            <div>
                              <div className="font-medium">{t.name}</div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {t.seed && <span>seed: {t.seed}</span>}
                                {t.description && <span>{t.description}</span>}
                              </div>
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          {t.leaderID != null ? (
                            <span className="text-sm">
                              {nameById.get(Number(t.leaderID)) ?? `#${t.leaderID}`}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">未指定</span>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          {t.strategistID != null ? (
                            <span className="text-sm">
                              {nameById.get(Number(t.strategistID)) ?? `#${t.strategistID}`}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">未指定</span>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-1.5">
                            <Avatar size="sm">
                              <Avatar.Image
                                src={t.players[0]?.avatarUrl}
                                alt=""
                              />
                              <Avatar.Fallback>
                                {String(t.playerIDs.length).padStart(2, "0")}
                              </Avatar.Fallback>
                            </Avatar>
                            <span className="text-sm">
                              {t.playerIDs.length} 人
                            </span>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <Chip
                            size="sm"
                            variant="soft"
                            color={t.isReady ? "success" : "warning"}
                          >
                            {t.isReady ? "就绪" : "未就绪"}
                          </Chip>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              isIconOnly
                              onPress={() => openTeamEdit(t)}
                            >
                              <Pencil className="w-4 h-4"/>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              isIconOnly
                              onPress={() => setDeleteTarget({id: t.id, name: t.name})}
                            >
                              <Trash2 className="w-4 h-4"/>
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
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

      {/* ---- Create / edit team modal ---- */}
      <Modal
        isOpen={teamModal}
        onOpenChange={(o) => {
          if (!o) setTeamModal(false);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>
                  {teamEditId ? "编辑队伍" : "新队伍"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-5">
                  <section className="flex flex-col gap-4">
                    <TextField variant="secondary">
                      <Label>名称 *</Label>
                      <Input
                        value={teamF.name}
                        onChange={(e) =>
                          setTeamF((p) => ({
                            ...p,
                            name: (e.target as HTMLInputElement).value,
                          }))
                        }
                      />
                    </TextField>
                    <TextField variant="secondary">
                      <Label>描述</Label>
                      <Input
                        value={teamF.description}
                        onChange={(e) =>
                          setTeamF((p) => ({
                            ...p,
                            description: (e.target as HTMLInputElement).value,
                          }))
                        }
                      />
                    </TextField>
                    <TextField variant="secondary">
                      <Label>Seed（种子编号）</Label>
                      <Input
                        value={teamF.seed}
                        onChange={(e) =>
                          setTeamF((p) => ({
                            ...p,
                            seed: (e.target as HTMLInputElement).value,
                          }))
                        }
                      />
                    </TextField>
                  </section>

                  <section className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold">队长与策略师</h3>
                    <div className="flex items-end gap-2">
                      <TextField className="flex-1" variant="secondary">
                        <Label>队长 osu! ID</Label>
                        <Input
                          type="number"
                          value={teamF.leaderID != null ? String(teamF.leaderID) : ""}
                          onChange={(e) =>
                            setTeamF((p) => ({
                              ...p,
                              leaderID: Number((e.target as HTMLInputElement).value) || null,
                            }))
                          }
                        />
                      </TextField>
                      <Button
                        variant="secondary"
                        onPress={() =>
                          teamF.leaderID != null && resolveMember(teamF.leaderID, "leader")
                        }
                        isDisabled={fetchUser.isPending || teamF.leaderID == null}
                      >
                        <Search className="w-4 h-4"/>
                        获取
                      </Button>
                      {leaderName && (
                        <span className="text-sm text-muted-foreground pb-2">
                          {leaderName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-end gap-2">
                      <TextField className="flex-1" variant="secondary">
                        <Label>策略师 osu! ID</Label>
                        <Input
                          type="number"
                          value={
                            teamF.strategistID != null ? String(teamF.strategistID) : ""
                          }
                          onChange={(e) =>
                            setTeamF((p) => ({
                              ...p,
                              strategistID:
                                Number((e.target as HTMLInputElement).value) || null,
                            }))
                          }
                        />
                      </TextField>
                      <Button
                        variant="secondary"
                        onPress={() =>
                          teamF.strategistID != null &&
                          resolveMember(teamF.strategistID, "strategist")
                        }
                        isDisabled={fetchUser.isPending || teamF.strategistID == null}
                      >
                        <Search className="w-4 h-4"/>
                        获取
                      </Button>
                      {strategistName && (
                        <span className="text-sm text-muted-foreground pb-2">
                          {strategistName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      队长与策略师需在队员名单中，且齐备后队伍才算「就绪」（可被比赛房间引用）。
                    </p>
                  </section>

                  <section className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold">队员名单</h3>
                    <div className="flex flex-col gap-2">
                      {teamF.playerIDs.map((id, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <TextField className="flex-1" variant="secondary">
                            <Input
                              type="number"
                              value={String(id)}
                              onChange={(e) =>
                                setTeamF((p) => {
                                  const next = [...p.playerIDs];
                                  next[i] = Number(
                                    (e.target as HTMLInputElement).value,
                                  );
                                  return {...p, playerIDs: next};
                                })
                              }
                            />
                          </TextField>
                          <Button
                            size="sm"
                            variant="ghost"
                            isIconOnly
                            aria-label="移除队员"
                            onPress={() =>
                              setTeamF((p) => ({
                                ...p,
                                playerIDs: p.playerIDs.filter((_, j) => j !== i),
                              }))
                            }
                          >
                            <Trash2 className="w-4 h-4"/>
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="self-start"
                        onPress={() =>
                          setTeamF((p) => ({...p, playerIDs: [...p.playerIDs, 0]}))
                        }
                      >
                        <UserPlus className="w-4 h-4"/>
                        添加队员
                      </Button>
                    </div>
                  </section>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={() => setTeamModal(false)}>
                  取消
                </Button>
                <Button
                  variant="primary"
                  onPress={saveTeam}
                  isDisabled={
                    !teamF.name.trim() ||
                    createTeam.isPending ||
                    updateTeam.isPending
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
                <AlertDialog.Heading>删除队伍</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  确定要删除{" "}
                  <span className="font-medium">{deleteTarget?.name}</span>？
                  已被房间引用的队伍无法删除。该操作无法撤销。
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
                  isDisabled={deleteTeam.isPending}
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
