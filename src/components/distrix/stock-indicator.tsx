"use client";

import { AlertTriangle, PackageX, TrendingDown } from "lucide-react";

import { formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StockHealth } from "@/types/product";
import { Figure } from "@/components/distrix/money";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const HEALTH_ICON = {
  in_stock: null,
  low_stock: TrendingDown,
  out_of_stock: PackageX,
} as const;

const HEALTH_TEXT = {
  in_stock: "text-ink",
  low_stock: "text-partial",
  out_of_stock: "text-overdue",
} as const;

/**
 * Available quantity with its health state attached. A number alone does not
 * say whether 40 cases is comfortable or about to run out — the reorder point
 * is what makes it mean something, so it travels with the figure.
 */
export function StockIndicator({
  available,
  reorderPoint,
  health,
  uom,
  className,
}: {
  available: number;
  reorderPoint: number;
  health: StockHealth;
  uom?: string;
  className?: string;
}) {
  const Icon = HEALTH_ICON[health];

  const body = (
    <span className={cn("inline-flex items-center justify-end gap-1.5", className)}>
      {Icon && (
        <Icon
          aria-hidden
          size={13}
          strokeWidth={2}
          className={health === "out_of_stock" ? "text-overdue" : "text-partial"}
        />
      )}
      <Figure
        value={available}
        {...(uom ? { unit: uom } : {})}
        className={HEALTH_TEXT[health]}
        weight={health === "in_stock" ? "regular" : "medium"}
      />
    </span>
  );

  if (health === "in_stock") return body;

  return (
    <Tooltip>
      <TooltipTrigger render={body} />
      <TooltipContent>
        {health === "out_of_stock"
          ? "Nothing available to sell."
          : `At or below the reorder point of ${formatQty(reorderPoint)}${uom ? ` ${uom}` : ""}.`}
      </TooltipContent>
    </Tooltip>
  );
}

/** Compact severity chip for a health column that carries no figure. */
export function StockHealthChip({ health }: { health: StockHealth }) {
  const LABEL = {
    in_stock: "In stock",
    low_stock: "Low",
    out_of_stock: "Out",
  } as const;

  const TONE = {
    in_stock: "border-paid/20 bg-paid-wash text-paid",
    low_stock: "border-partial/20 bg-partial-wash text-partial",
    out_of_stock: "border-overdue/20 bg-overdue-wash text-overdue",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full border px-2 text-xs font-medium",
        TONE[health],
      )}
    >
      {health !== "in_stock" && <AlertTriangle size={11} strokeWidth={2} />}
      {LABEL[health]}
    </span>
  );
}
