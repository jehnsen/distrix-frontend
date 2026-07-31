"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Bottom-anchored, appears only when rows are selected. Anchored rather than
 * floating so it never covers the row the user is reading.
 */
export function BulkActionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  if (count === 0) return null;

  return (
    <div
      data-print="hide"
      role="region"
      aria-label={`${count} rows selected`}
      className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-border bg-surface-sunken px-3 py-2 shadow-[0_-1px_2px_rgba(21,24,28,.04)]"
    >
      <span
        aria-live="polite"
        className="flex items-center gap-1.5 text-base font-medium text-ink"
      >
        <span className="font-mono tabular-nums">{count}</span>
        <span>selected</span>
      </span>

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onClear}
        aria-label="Clear selection"
        className="mr-1"
      >
        <X size={14} strokeWidth={1.75} />
      </Button>

      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}
