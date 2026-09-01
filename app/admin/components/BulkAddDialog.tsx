"use client";

import { useMemo, useState } from "react";
import { Button, Modal, toast } from "@heroui/react";
import { Layers, X } from "lucide-react";
import type { BulkReport } from "@/app/lib/api";
import IdLookupInput from "@/app/components/IdLookupInput";

/**
 * Parse a free-form ID input (one per line, or comma/space separated) into a
 * de-duplicated list of numbers. Non-numeric tokens are skipped silently.
 */
function parseIds(raw: string): number[] {
  const tokens = raw.split(/[\s,;]+/).filter(Boolean);
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const token of tokens) {
    const n = Number(token);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    ids.push(n);
  }
  return ids;
}

/** Optional per-entity lookup config that enables search-and-add. */
export interface BulkLookupConfig<T> {
  placeholder?: string;
  useSearch: (query: string, enabled: boolean) => { data?: T[]; isLoading: boolean };
  getItemId: (item: T) => number;
  getItemLabel: (item: T) => string;
  renderItem?: (item: T) => React.ReactNode;
}

export interface BulkAddDialogProps<T = unknown> {
  open: boolean;
  onClose: () => void;
  /** Human label of the entity kind, e.g. "用户" or "谱面". */
  kind: string;
  /** osu! ID label shown above the paste textarea, e.g. "osu! 用户 ID". */
  idLabel: string;
  /** Whether the underlying mutation is in flight. */
  pending: boolean;
  /** Submit a de-duplicated list of ids; resolves to the per-row report. */
  onSubmit: (ids: number[]) => Promise<BulkReport>;
  /** When provided, a search box lets the user add ids one at a time. */
  lookup?: BulkLookupConfig<T>;
}

/**
 * Generic bulk-add dialog shared by the admin Users and Beatmaps tabs. The user
 * can paste a list of osu! IDs (one per line) and/or search-and-pick entries one
 * by one; the backend fetches and stores each id, returning a per-id report.
 */
export default function BulkAddDialog<T = unknown>({
  open,
  onClose,
  kind,
  idLabel,
  pending,
  onSubmit,
  lookup,
}: BulkAddDialogProps<T>) {
  const [raw, setRaw] = useState("");
  const [picked, setPicked] = useState<{ id: number; label: string }[]>([]);
  const [report, setReport] = useState<BulkReport | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = submitting || pending;

  // The id list to submit = search-picked ids + pasted ids (deduplicated).
  const ids = useMemo(() => {
    const seen = new Set<number>();
    const merged: number[] = [];
    for (const p of picked) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      merged.push(p.id);
    }
    for (const id of parseIds(raw)) {
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push(id);
    }
    return merged;
  }, [picked, raw]);

  const reset = () => {
    setRaw("");
    setPicked([]);
    setReport(null);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (ids.length === 0) {
      toast.danger("请至少添加一个有效的 ID");
      return;
    }
    setSubmitting(true);
    setReport(null);
    try {
      const result = await onSubmit(ids);
      setReport(result);
    } catch {
      // mutation hook already surfaces the error via toast
    } finally {
      setSubmitting(false);
    }
  };

  const addPicked = (id: number, label: string) => {
    setPicked((prev) => {
      if (prev.some((p) => p.id === id)) return prev;
      return [...prev, { id, label }];
    });
  };

  const removePicked = (id: number) => {
    setPicked((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <Modal isOpen={open} onOpenChange={(o) => !o && handleClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Icon className="bg-default text-foreground">
                <Layers className="size-5" />
              </Modal.Icon>
              <Modal.Heading>批量添加{kind}</Modal.Heading>
            </Modal.Header>

            <Modal.Body>
              {!report ? (
                <div className="flex flex-col gap-4">
                  {lookup && (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">搜索添加</label>
                      <IdLookupInput<T>
                        placeholder={lookup.placeholder ?? `搜索 ${kind} 名称或 ID`}
                        useSearch={lookup.useSearch}
                        getItemId={lookup.getItemId}
                        getItemLabel={lookup.getItemLabel}
                        renderItem={lookup.renderItem}
                        value={null}
                        onChange={(id, item) => {
                          if (id != null) {
                            addPicked(id, item ? lookup.getItemLabel(item) : String(id));
                          }
                        }}
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">{idLabel}（每行一个，也支持空格或逗号分隔）</label>
                    <textarea
                      value={raw}
                      onChange={(e) => setRaw(e.target.value)}
                      rows={5}
                      placeholder={`每行输入一个 ${idLabel}`}
                      className="w-full resize-y rounded-xl border border-default-200 bg-default-50 px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                    />
                  </div>

                  {picked.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {picked.map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-default-200 bg-default-100 px-2 py-1 text-xs"
                        >
                          <span className="font-mono">#{p.id}</span>
                          <button
                            type="button"
                            onClick={() => removePicked(p.id)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={`移除 ${p.id}`}
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    已添加 <span className="font-medium text-foreground">{ids.length}</span> 个 ID。
                    未入库的{kind}会自动从 osu! API 拉取并保存；已存在的仅刷新资料。
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">导入结果：</span>
                    <span className="text-success">成功 {report.succeeded}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className={report.failed > 0 ? "text-danger" : "text-muted-foreground"}>
                      失败 {report.failed}
                    </span>
                    <span className="text-muted-foreground">（共 {report.total} 个）</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-default-200">
                    <ul className="divide-y divide-default-100">
                      {report.results.map((r) => (
                        <li
                          key={r.osu_id}
                          className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                        >
                          <span className="font-mono text-muted-foreground">#{r.osu_id}</span>
                          {r.ok ? (
                            <span className="truncate text-foreground">{r.detail}</span>
                          ) : (
                            <span className="truncate text-danger">{r.error}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </Modal.Body>

            <Modal.Footer>
              {!report ? (
                <>
                  <Button variant="ghost" onPress={handleClose} isDisabled={busy}>
                    取消
                  </Button>
                  <Button
                    variant="primary"
                    onPress={() => void handleSubmit()}
                    isDisabled={busy || ids.length === 0}
                  >
                    {busy ? "导入中..." : "批量导入"}
                  </Button>
                </>
              ) : (
                <Button variant="primary" onPress={handleClose}>
                  完成
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
