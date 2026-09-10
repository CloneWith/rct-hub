"use client";

import { useEffect, useMemo, useState } from "react";
import { ComboBox, Input, Label, ListBox, Spinner } from "@heroui/react";

/**
 * A searchable ID lookup input used wherever an osu! user or beatmap id must be
 * entered. On focus it shows a hint ("输入以显示相关"); typing (debounced) hits
 * the backend search and lists matching entries; clicking one fills it in.
 *
 * Built on HeroUI `ComboBox` (react-aria ComboBox) with a fully controlled
 * `value` + `inputValue`. The backend already returns the filtered list, so the
 * client-side re-filter is left off (controlled `items` are shown as-is).
 */
export interface IdLookupInputProps<T> {
  /** Field label (rendered above the input). */
  label?: string;
  placeholder?: string;
  /** Search hook bound to the entity kind (e.g. `useUserSearch`). */
  useSearch: (query: string, enabled: boolean) => {
    data?: T[];
    isLoading: boolean;
  };
  /** Extract the osu! id (number) from an item — the selected value. */
  getItemId: (item: T) => number;
  /** Extract the display text for an item (shown in the input after selection). */
  getItemLabel: (item: T) => string;
  /** Optional custom row renderer (defaults to `getItemLabel`). */
  renderItem?: (item: T) => React.ReactNode;
  /** Controlled selected osu! id. */
  value: number | null;
  /** Called on selection with the picked id and, when available, the item. */
  onChange: (value: number | null, item?: T) => void;
  disabled?: boolean;
}

export default function IdLookupInput<T>({
  label,
  placeholder = "输入以显示相关",
  useSearch,
  getItemId,
  getItemLabel,
  renderItem,
  value,
  onChange,
  disabled,
}: IdLookupInputProps<T>) {
  // Controlled filter text. Initialized from `value` so an inline edit of an
  // already-assigned field shows the current id instead of a blank box.
  const [query, setQuery] = useState(() => (value != null ? String(value) : ""));
  const [debounced, setDebounced] = useState("");

  // Debounce the search input (250ms) so we don't hit the backend per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data = [], isLoading } = useSearch(debounced, debounced.length >= 1);

  // Map backend results to collection items keyed by osu! id, so the selected
  // value is the osu! id (not the Mongo ObjectID carried on the entity).
  const items = useMemo(
    () => data.map((item) => ({ id: String(getItemId(item)), value: item })),
    [data, getItemId],
  );

  const handleChange = (key: string | number | null) => {
    if (key == null) {
      onChange(null);
      return;
    }
    const id = Number(key);
    const entry = items.find((e) => Number(e.id) === id);
    onChange(id, entry?.value);
    setQuery(entry ? getItemLabel(entry.value) : String(id));
  };

  const handleInputChange = (q: string) => {
    setQuery(q);
    // A manual edit resets the selected value until a suggestion is picked.
    onChange(null);
  };

  return (
    <ComboBox.Root
      value={value != null ? String(value) : null}
      onChange={handleChange}
      inputValue={query}
      onInputChange={handleInputChange}
      items={items}
      isDisabled={disabled}
      allowsEmptyCollection
      variant="secondary"
      fullWidth
      className="w-full"
    >
      {label && <Label>{label}</Label>}
      <ComboBox.InputGroup>
        <Input placeholder={placeholder} />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox
          renderEmptyState={() =>
            isLoading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Spinner size="sm" />
                搜索中…
              </div>
            ) : (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                {debounced.length < 1 ? "输入以显示相关" : "无结果"}
              </div>
            )
          }
        >
          {(entry) => {
            const item = (entry as { id: string; value: T }).value;
            return (
              <ListBox.Item textValue={getItemLabel(item)}>
                {renderItem ? renderItem(item) : getItemLabel(item)}
              </ListBox.Item>
            );
          }}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox.Root>
  );
}
