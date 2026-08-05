"use client";

import { useState } from "react";
import { ChevronDown, ShoppingCart } from "lucide-react";

import type { DeliverableOrder } from "@/lib/api";
import { fuzzyScore } from "@/lib/command-registry";
import { formatDate, formatQty } from "@/lib/format";
import { isoToday } from "@/lib/dates";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Orders overdue against their required date come first and read red. */
function urgency(requiredDate: string): { label: string; className: string } {
  const days = differenceInCalendarDays(parseISO(requiredDate), isoToday());
  if (days < 0) return { label: `${Math.abs(days)}d late`, className: "text-overdue" };
  if (days === 0) return { label: "Due today", className: "text-partial" };
  if (days <= 2) return { label: `${days}d left`, className: "text-partial" };
  return { label: `${days}d left`, className: "text-ink-muted" };
}

export function OrderPicker({
  orders,
  value,
  onSelect,
}: {
  orders: DeliverableOrder[];
  value: DeliverableOrder | undefined;
  onSelect: (order: DeliverableOrder) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const matches = orders
    .map((row) => ({
      row,
      score: Math.max(
        fuzzyScore(query, row.order.soNo) ?? -Infinity,
        fuzzyScore(query, row.customerName) ?? -Infinity,
      ),
    }))
    .filter((entry) => entry.score > -Infinity)
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-9 w-full items-center gap-2.5 rounded-md border border-border bg-surface px-3 text-left",
              "transition-colors outline-none hover:border-border-strong",
              "focus-visible:border-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
            )}
          >
            <ShoppingCart size={16} strokeWidth={1.75} className="shrink-0 text-ink-muted" />
            {value ? (
              <>
                <span className="font-mono text-sm font-medium text-ink">
                  {value.order.soNo}
                </span>
                <span className="min-w-0 flex-1 truncate text-ink">{value.customerName}</span>
                <span className="shrink-0 font-mono text-xs text-ink-muted">
                  {formatQty(value.outstandingQty)} units
                </span>
              </>
            ) : (
              <span className="flex-1 text-ink-muted">
                {orders.length === 0
                  ? "No orders are waiting to ship in this warehouse"
                  : "Choose an order…"}
              </span>
            )}
            <ChevronDown size={14} strokeWidth={1.75} className="shrink-0 text-ink-muted" />
          </button>
        }
      />
      <PopoverContent align="start" className="w-[42rem] max-w-[calc(100vw-2rem)] p-0">
        <Command shouldFilter={false} loop>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Order number or customer…"
          />
          <CommandList>
            <CommandEmpty>No open order matches that.</CommandEmpty>
            {matches.map(({ row }) => {
              const state = urgency(row.order.requiredDate);
              return (
                <CommandItem
                  key={row.order.id}
                  value={row.order.id}
                  onSelect={() => {
                    onSelect(row);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="h-11"
                >
                  <span className="w-28 shrink-0 font-mono text-sm text-ink">
                    {row.order.soNo}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{row.customerName}</span>
                    <span className="text-xs text-ink-muted">
                      Required {formatDate(row.order.requiredDate)} · {row.warehouseCode}
                    </span>
                  </span>
                  <span className="w-24 shrink-0 text-right font-mono text-sm text-ink-muted">
                    {formatQty(row.outstandingQty)} u
                  </span>
                  <span className={cn("w-20 shrink-0 text-right text-sm", state.className)}>
                    {state.label}
                  </span>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
