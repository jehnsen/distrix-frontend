"use client";

import Link from "next/link";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { AlertTriangle, Truck } from "lucide-react";

import type { ApiError, DispatchDay } from "@/lib/api";
import { formatDate, formatQty } from "@/lib/format";
import { isoToday } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Card, CardHeader } from "@/components/distrix/primitives";
import { ErrorState, PanelSkeleton } from "@/components/distrix/states";
import { StatusPill } from "@/components/distrix/status-pill";

/** "Today", "Tomorrow", then the date — a driver thinks in days, not dates. */
function dayLabel(date: string): { label: string; tone: "today" | "past" | "future" } {
  const days = differenceInCalendarDays(parseISO(date), isoToday());
  if (days === 0) return { label: "Today", tone: "today" };
  if (days === 1) return { label: "Tomorrow", tone: "future" };
  if (days < 0) return { label: `${Math.abs(days)} day(s) ago`, tone: "past" };
  return { label: `In ${days} days`, tone: "future" };
}

/**
 * The dispatch board: everything still to go out, grouped by delivery date with
 * its driver and plate (§7). Drops are ordered by their sequence, which is the
 * order the truck actually runs them.
 */
export function DispatchBoard({
  days,
  isLoading,
  error,
  onRetry,
}: {
  days: DispatchDay[];
  isLoading: boolean;
  error: ApiError | undefined;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <Card padded={false}>
        <ErrorState what="the dispatch board" detail={error.message} onRetry={onRetry} />
      </Card>
    );
  }

  if (isLoading && days.length === 0) {
    return (
      <Card>
        <PanelSkeleton lines={8} />
      </Card>
    );
  }

  if (days.length === 0) {
    return (
      <Card padded={false}>
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-lg border border-border bg-surface-sunken text-ink-muted"
          >
            <Truck size={18} strokeWidth={1.75} />
          </span>
          <div className="flex max-w-md flex-col gap-1">
            <h3 className="text-xl font-semibold tracking-heading text-ink">
              Nothing on the board
            </h3>
            <p className="text-base text-ink-muted">
              Every delivery receipt in this warehouse has been acknowledged. Cut a new one
              from a confirmed order.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => {
        const { label, tone } = dayLabel(day.date);
        const units = day.drops.reduce(
          (acc, drop) => acc + drop.lines.reduce((n, line) => n + line.qtyShipped, 0),
          0,
        );

        return (
          <Card key={day.date} padded={false}>
            <CardHeader
              title={formatDate(day.date)}
              description={`${day.drops.length} drop(s) · ${formatQty(units)} units`}
              actions={
                <span
                  className={cn(
                    "inline-flex h-6 items-center rounded-full border px-2.5 text-sm font-medium",
                    tone === "today"
                      ? "border-accent/20 bg-accent-wash text-accent"
                      : tone === "past"
                        ? "border-overdue/20 bg-overdue-wash text-overdue"
                        : "border-border bg-surface-sunken text-ink-muted",
                  )}
                >
                  {label}
                </span>
              }
            />
            <ul role="list" className="divide-y divide-border">
              {day.drops.map((drop) => {
                const units = drop.lines.reduce((acc, line) => acc + line.qtyShipped, 0);
                return (
                  <li key={drop.id}>
                    <Link
                      href={`/deliveries/${drop.drNo}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                    >
                      <span
                        aria-hidden
                        className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-sunken font-mono text-sm font-medium text-ink-muted"
                      >
                        {drop.dropSequence}
                      </span>

                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center gap-2">
                          <span className="font-mono font-medium text-ink">{drop.drNo}</span>
                          <span className="truncate text-ink">{drop.customerName}</span>
                          {drop.hasShortShip && (
                            <AlertTriangle
                              aria-label="Short shipment"
                              size={13}
                              strokeWidth={2}
                              className="shrink-0 text-partial"
                            />
                          )}
                        </span>
                        <span className="text-xs text-ink-muted">
                          Against {drop.soNo} · {drop.lineCount} line(s) ·{" "}
                          {formatQty(units)} units
                        </span>
                      </span>

                      <span className="hidden w-44 shrink-0 flex-col text-right sm:flex">
                        <span className="truncate text-base text-ink">{drop.driver}</span>
                        <span className="font-mono text-xs text-ink-muted">
                          {drop.plateNo}
                        </span>
                      </span>

                      <StatusPill status={drop.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
