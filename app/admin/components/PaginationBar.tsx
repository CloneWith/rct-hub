"use client";

import { Pagination } from "@heroui/react";

/**
 * Shared pagination bar for admin list tables.
 *
 * When `filteredCount` is provided (client-side search active), the bar shows
 * the filtered total and hides the page navigation, since searching collapses
 * the server-side paging onto page 1.
 */
export default function PaginationBar({
                                        page,
                                        totalPages,
                                        total,
                                        perPage,
                                        onPageChangeAction,
                                        filteredCount,
                                      }: {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChangeAction: (page: number) => void;
  filteredCount?: number;
}) {
  const isSearching = filteredCount !== undefined;
  const start = isSearching
    ? filteredCount > 0
      ? 1
      : 0
    : total > 0
      ? (page - 1) * perPage + 1
      : 0;
  const end = isSearching ? filteredCount : Math.min(page * perPage, total);
  const displayTotal = isSearching ? filteredCount : total;

  return (
    <Pagination className="flex items-center justify-between mt-4 px-2">
      <Pagination.Summary className="text-sm text-muted-foreground">
        显示第 {start}-{end} 个，共 {displayTotal} 个
      </Pagination.Summary>
      <Pagination.Content>
        <Pagination.Previous isDisabled={page <= 1} onPress={() => onPageChangeAction(page - 1)}>
          <span>上一页</span>
          <Pagination.PreviousIcon/>
        </Pagination.Previous>
        <span className="text-sm text-muted-foreground px-1">
            {page} / {totalPages}
        </span>
        <Pagination.Next isDisabled={page >= totalPages} onPress={() => onPageChangeAction(page + 1)}>
          <span>下一页</span>
          <Pagination.NextIcon/>
        </Pagination.Next>
      </Pagination.Content>
    </Pagination>
  );
}
