"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { fuzzyScore } from "@/lib/command-registry";
import { formatQty } from "@/lib/format";
import type { LineProduct } from "@/lib/line-items";
import { cn } from "@/lib/utils";
import { Money } from "@/components/distrix/money";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * The picker shows SKU, on-hand and price in the option row, so the clerk never
 * has to leave the line to check whether there is stock to sell.
 */
export function ProductCombobox({
  products,
  value,
  onSelect,
  disabled = false,
}: {
  products: LineProduct[];
  value: LineProduct | undefined;
  onSelect: (product: LineProduct) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const matches = products
    .map((product) => ({
      product,
      score: Math.max(
        fuzzyScore(query, product.sku) ?? -Infinity,
        fuzzyScore(query, product.name) ?? -Infinity,
      ),
    }))
    .filter((row) => row.score > -Infinity)
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            aria-label={value ? `Product: ${value.name}` : "Choose a product"}
            className={cn(
              "flex h-7 w-full items-center gap-2 rounded-sm px-1.5 text-left text-base",
              "outline-none transition-colors",
              "hover:bg-surface-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
              "disabled:pointer-events-none disabled:opacity-60",
            )}
          >
            {value ? (
              <>
                <span className="w-20 shrink-0 truncate font-mono text-sm text-ink-muted">
                  {value.sku}
                </span>
                <span className="min-w-0 flex-1 truncate text-ink">{value.name}</span>
              </>
            ) : (
              <span className="flex-1 text-ink-muted">Search SKU or name…</span>
            )}
            <ChevronDown
              aria-hidden
              size={14}
              strokeWidth={1.75}
              className="shrink-0 text-ink-muted"
            />
          </button>
        }
      />
      <PopoverContent align="start" className="w-[36rem] max-w-[calc(100vw-2rem)] p-0">
        <Command shouldFilter={false} loop>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="SKU or product name…"
          />
          <CommandList>
            <CommandEmpty>No product matches that.</CommandEmpty>
            {matches.map(({ product }) => (
              <CommandItem
                key={product.id}
                value={product.id}
                onSelect={() => {
                  onSelect(product);
                  setOpen(false);
                  setQuery("");
                }}
                className="h-9"
              >
                <span className="w-24 shrink-0 truncate font-mono text-sm text-ink-muted">
                  {product.sku}
                </span>
                <span className="min-w-0 flex-1 truncate">{product.name}</span>
                <span
                  className={cn(
                    "w-24 shrink-0 text-right font-mono text-sm tabular-nums",
                    product.available <= 0 ? "text-overdue" : "text-ink-muted",
                  )}
                >
                  {formatQty(product.available)} {product.uom}
                </span>
                <Money amount={product.unitPrice} className="w-24 shrink-0 text-right text-sm" />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
