"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { formatQty } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PAGE_SIZES = [25, 50, 100, 200] as const;

/**
 * Server-shaped: the caller owns page index and size, so swapping the mock
 * layer for a real paginated endpoint changes nothing here.
 */
export function DataTablePagination({
  pageIndex,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  pageIndex: number;
  pageSize: number;
  total: number;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : pageIndex * pageSize + 1;
  const last = Math.min(total, (pageIndex + 1) * pageSize);

  return (
    <div
      data-print="hide"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2"
    >
      <p className="text-base text-ink-muted" aria-live="polite">
        <span className="font-mono text-ink tabular-nums">
          {formatQty(first)}–{formatQty(last)}
        </span>{" "}
        of <span className="font-mono text-ink tabular-nums">{formatQty(total)}</span>
      </p>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-base text-ink-muted">
          <span className="hidden sm:inline">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              if (typeof value !== "string") return;
              onPageSizeChange(Number(value));
            }}
          >
            <SelectTrigger size="sm" className="w-18 font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)} className="font-mono">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={pageIndex === 0}
            onClick={() => onPageChange(pageIndex - 1)}
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
          </Button>
          <span className="px-1 font-mono text-sm text-ink-muted tabular-nums">
            {pageIndex + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={pageIndex + 1 >= pageCount}
            onClick={() => onPageChange(pageIndex + 1)}
          >
            <ChevronRight size={16} strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
  );
}
