"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, FilterX, Inbox, RotateCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Four distinct states, never a spinner. "No results for these filters" is
 * deliberately not the same screen as "nothing here yet" — one is the user's
 * doing and the other is the business's.
 */

function StateShell({
  icon: Icon,
  tone = "neutral",
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  tone?: "neutral" | "overdue";
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-9 place-items-center rounded-lg border",
          tone === "overdue"
            ? "border-overdue/20 bg-overdue-wash text-overdue"
            : "border-border bg-surface-sunken text-ink-muted",
        )}
      >
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <div className="flex max-w-md flex-col gap-1">
        <h3 className="text-xl font-semibold tracking-heading text-ink">{title}</h3>
        <p className="text-base text-ink-muted">{description}</p>
      </div>
      {children && <div className="flex flex-wrap justify-center gap-2 pt-1">{children}</div>}
    </div>
  );
}

/** Nothing here yet. The action must be the specific next step, never "Add". */
export function EmptyState({
  icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <StateShell icon={icon} title={title} description={description} className={className}>
      {action}
    </StateShell>
  );
}

/** The filters excluded everything. Offer to relax them, not to create data. */
export function NoResultsState({
  query,
  onClearFilters,
  className,
}: {
  query?: string;
  onClearFilters?: () => void;
  className?: string;
}) {
  return (
    <StateShell
      icon={FilterX}
      title="No rows match these filters"
      description={
        query
          ? `Nothing matched “${query}” with the current filters. Widen the date range or clear a filter.`
          : "Every row was excluded by the current filters. Widen the date range or clear a filter."
      }
      className={className}
    >
      {onClearFilters && (
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          Clear all filters
        </Button>
      )}
    </StateShell>
  );
}

/** Names what failed. A bare "Something went wrong" helps nobody. */
export function ErrorState({
  what,
  detail,
  onRetry,
  className,
}: {
  /** What could not be loaded, e.g. "open invoices". */
  what: string;
  detail?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <StateShell
      icon={AlertTriangle}
      tone="overdue"
      title={`Could not load ${what}`}
      description={
        detail ?? "The request failed before it reached the server. Nothing was changed."
      }
      className={className}
    >
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw size={16} strokeWidth={1.75} />
          Try again
        </Button>
      )}
    </StateShell>
  );
}

/**
 * Matches the real table's geometry — same row height, same column count — so
 * the layout does not jump when data lands.
 */
export function TableSkeleton({
  columns,
  rows = 8,
  /** Widths as fractions of the cell, to imitate real content. */
  widths,
}: {
  columns: number;
  rows?: number;
  widths?: number[];
}) {
  return (
    <div aria-hidden className="divide-y divide-border">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex h-row items-center gap-4 px-3">
          {Array.from({ length: columns }, (_, colIndex) => (
            <div
              key={colIndex}
              className="h-3 animate-pulse rounded-xs bg-surface-sunken"
              style={{ width: `${(widths?.[colIndex] ?? 0.7) * 100}%`, flex: "1 1 0" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("flex flex-col gap-2.5", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className="flex items-center justify-between gap-6">
          <div
            className="h-3 animate-pulse rounded-xs bg-surface-sunken"
            style={{ width: `${30 + ((index * 13) % 25)}%` }}
          />
          <div className="h-3 w-20 animate-pulse rounded-xs bg-surface-sunken" />
        </div>
      ))}
    </div>
  );
}

/** Screen-reader announcement for async loads, paired with the skeletons. */
export function LoadingAnnouncer({ what }: { what: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      Loading {what}
    </span>
  );
}
