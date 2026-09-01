"use client";

import type { ReactNode } from "react";
import { Button } from "@heroui/react";
import { Check, Pencil, X } from "lucide-react";

/**
 * A minimal inline editor used on the room detail page: a field renders its
 * read-only value plus a pencil icon; clicking the icon swaps in an edit
 * control and shows ✓ (save) / ✗ (cancel) beside it. Editing state and the
 * draft value are owned by the parent, so the edit control can be anything
 * (an `IdLookupInput`, a `Select`, a plain input, …).
 */
export interface InlineEditProps {
  /** Read-only display of the current value. */
  display: ReactNode;
  /** Whether the current user may edit this field. */
  canEdit: boolean;
  /** Controlled editing state. */
  editing: boolean;
  /** Whether the save mutation is in flight. */
  pending?: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  /** Edit control rendered while editing (replaces `display`). */
  children: ReactNode;
}

export default function InlineEdit({
  display,
  canEdit,
  editing,
  pending,
  onStartEdit,
  onCancel,
  onSave,
  children,
}: InlineEditProps) {
  if (!editing) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate">{display}</span>
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
            aria-label="编辑"
            onPress={onStartEdit}
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0 flex-1">{children}</div>
      <Button
        size="sm"
        variant="primary"
        isIconOnly
        aria-label="保存"
        isDisabled={pending}
        onPress={onSave}
      >
        <Check className="size-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        isIconOnly
        aria-label="放弃"
        isDisabled={pending}
        onPress={onCancel}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
