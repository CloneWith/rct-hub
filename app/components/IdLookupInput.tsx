"use client";

import { useEffect, useRef, useState } from "react";
import { Spinner } from "@heroui/react";
import { Search } from "lucide-react";

/**
 * A searchable ID lookup input used wherever an osu! user or beatmap id must be
 * entered. On focus it shows a hint ("输入以显示相关"); typing (debounced) hits
 * the backend search and lists matching entries; clicking one fills it in.
 *
 * Hand-rolled (rather than HeroUI's `ComboBox`) to avoid the `ListBox.Item`
 * `textValue` pitfall and keep the "free ID + pick from suggestions" flow fully
 * controlled.
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
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce the search input (250ms) so we don't hit the backend per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const { data = [], isLoading } = useSearch(debounced, open && debounced.length >= 1);

  // Sync the input text with the controlled `value`:
  //  - cleared (null) → clear the text so a stale label doesn't linger;
  //  - set from outside (e.g. starting an inline edit of an existing
  //    assignment) → show the current id so the user can edit/confirm it.
  // A manual keystroke resets `value` to null (see the input handler), which
  // then clears the text — so we don't fight the user's own typing.
  useEffect(() => {
    if (value == null) setQuery("");
    else setQuery(String(value));
  }, [value]);

  const pick = (item: T) => {
    onChange(getItemId(item), item);
    setQuery(getItemLabel(item));
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {label && <label className="mb-1 block text-sm font-medium">{label}</label>}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            // A manual edit resets the selected value until a suggestion is picked.
            onChange(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-default-200 bg-default-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary disabled:opacity-50"
        />
      </div>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-default-200 bg-default-50 shadow-lg">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <Spinner size="sm" />
              搜索中…
            </div>
          ) : debounced.length < 1 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">输入以显示相关</div>
          ) : data.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">无结果</div>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {data.map((item) => (
                <li key={getItemId(item)}>
                  <button
                    type="button"
                    onClick={() => pick(item)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-default-100"
                  >
                    {renderItem ? renderItem(item) : getItemLabel(item)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
