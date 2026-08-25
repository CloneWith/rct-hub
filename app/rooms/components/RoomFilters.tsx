"use client";

import { Label, ListBox, Select, Switch } from "@heroui/react";
import type { MatchLifecycle } from "@/app/graphql/graphql";
import SearchBar from "@/app/admin/components/SearchBar";
import { LIFECYCLE_LABELS, LIFECYCLE_OPTIONS, ROOM_ROUNDS } from "@/app/lib/rooms";

export interface RoomFiltersProps {
  /** 搜索框实时输入值（未提交）。 */
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  /** 按 Enter 提交搜索。 */
  onSearch: (term: string) => void;
  onSearchClear: () => void;
  round: string | null;
  onRoundChange: (v: string | null) => void;
  status: MatchLifecycle | null;
  onStatusChange: (v: MatchLifecycle | null) => void;
  relatedToMe: boolean;
  onRelatedToMeChange: (v: boolean) => void;
  /** 是否渲染"与我相关"开关（admin 与无角色用户不显示）。 */
  showRelated: boolean;
}

/**
 * 房间列表筛选条：搜索（Enter 提交）+ 轮次 + 状态 + "与我相关"。
 *
 * 轮次下拉与创建/编辑弹窗共用 `ROOM_ROUNDS` 枚举，保证后端精确匹配可命中；
 * 状态下拉只含 MatchLifecycle（"未开局"房间不参与服务端状态筛选）。
 */
export default function RoomFilters({
  searchInput,
  onSearchInputChange,
  onSearch,
  onSearchClear,
  round,
  onRoundChange,
  status,
  onStatusChange,
  relatedToMe,
  onRelatedToMeChange,
  showRelated,
}: RoomFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <SearchBar
        placeholder="搜索房间名 / 房间码"
        value={searchInput}
        onValueChange={onSearchInputChange}
        onSearch={onSearch}
        onClear={onSearchClear}
      />

      <Select
        variant="secondary"
        className="w-36"
        value={round ?? "all"}
        onChange={(v) => onRoundChange(v === "all" ? null : (v as string))}
      >
        <Label>轮次</Label>
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item key="all" id="all">
              全部轮次
            </ListBox.Item>
            {ROOM_ROUNDS.map((r) => (
              <ListBox.Item key={r} id={r}>
                {r}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <Select
        variant="secondary"
        className="w-36"
        value={status ?? "all"}
        onChange={(v) =>
          onStatusChange(v === "all" ? null : (v as MatchLifecycle))
        }
      >
        <Label>状态</Label>
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item key="all" id="all">
              全部状态
            </ListBox.Item>
            {LIFECYCLE_OPTIONS.map((s) => (
              <ListBox.Item key={s} id={s}>
                {LIFECYCLE_LABELS[s]}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      {showRelated && (
        <Switch
          aria-label="仅看与我相关的房间"
          isSelected={relatedToMe}
          onChange={onRelatedToMeChange}
          className="mb-1"
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Label className="text-sm text-muted-foreground">与我相关</Label>
          </Switch.Content>
        </Switch>
      )}
    </div>
  );
}
