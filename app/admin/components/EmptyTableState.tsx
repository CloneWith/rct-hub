"use client";

import { EmptyState } from "@heroui/react";
import { CircleQuestionMark } from "lucide-react";

/** Empty-state renderer shared by all admin tables. */
export default function EmptyTableState() {
  return (
    <EmptyState className="flex h-75 w-full flex-col items-center justify-center gap-4 text-center">
      <CircleQuestionMark className="size-8 text-muted"/>
      <span className="text-sm text-muted">未找到结果</span>
    </EmptyState>
  );
}
