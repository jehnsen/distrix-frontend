"use client";

import { formatMoney, formatPercent, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Centavos } from "@/lib/money";

/**
 * Semantic colour on a figure means one of three things and nothing else.
 * `plain` is the default: figures are ink, not decoration.
 */
export type FigureTone = "plain" | "muted" | "delta" | "variance" | "accent";

export type FigureWeight = "regular" | "medium" | "semibold";

const WEIGHT: Record<FigureWeight, string> = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
};

function toneClass(tone: FigureTone, value: number): string {
  switch (tone) {
    case "muted":
      return "text-ink-muted";
    case "accent":
      return "text-accent";
    // Up is good: collections, margin, on-hand.
    case "delta":
      if (value > 0) return "text-paid";
      if (value < 0) return "text-overdue";
      return "text-ink-muted";
    // Any non-zero variance is a problem worth looking at.
    case "variance":
      return value === 0 ? "text-ink-muted" : "text-overdue";
    case "plain":
    default:
      return "text-ink";
  }
}

interface MoneyProps {
  amount: Centavos;
  /** Prefix ₱. Off by default — the column header carries the unit. */
  symbol?: boolean;
  /** Negatives as (1,234.56). On by default. */
  parens?: boolean;
  /** Force a leading + on positives. Use for month-on-month deltas. */
  signed?: boolean;
  tone?: FigureTone;
  weight?: FigureWeight;
  /** Renders as `<del>`-styled text for voided/cancelled amounts. */
  struck?: boolean;
  className?: string;
}

/**
 * The only way currency renders. Mono, tabular, negatives in parentheses.
 * Alignment is the container's business — table cells and totals panels apply
 * `text-right`; prose leaves it alone.
 */
export function Money({
  amount,
  symbol = false,
  parens = true,
  signed = false,
  tone = "plain",
  weight = "regular",
  struck = false,
  className,
}: MoneyProps) {
  const text = formatMoney(amount, { symbol, parens, signed });

  return (
    <span
      className={cn(
        "font-mono tabular-nums whitespace-nowrap",
        WEIGHT[weight],
        toneClass(tone, amount),
        struck && "line-through decoration-1 opacity-60",
        className,
      )}
    >
      {text}
    </span>
  );
}

interface FigureProps {
  value: number;
  /** Appended after a hair space: "PCS", "CS", "kg". */
  unit?: string;
  decimals?: number;
  signed?: boolean;
  tone?: FigureTone;
  weight?: FigureWeight;
  /** Renders `value` as a percentage instead of a count. */
  percent?: boolean;
  className?: string;
}

/** Quantities, counts, rates and percentages. Same alignment contract as Money. */
export function Figure({
  value,
  unit,
  decimals = 0,
  signed = false,
  tone = "plain",
  weight = "regular",
  percent = false,
  className,
}: FigureProps) {
  const text = percent
    ? formatPercent(value, decimals)
    : formatQty(value, { decimals, signed });

  return (
    <span
      className={cn(
        "font-mono tabular-nums whitespace-nowrap",
        WEIGHT[weight],
        toneClass(tone, value),
        className,
      )}
    >
      {text}
      {unit && <span className="ml-1 text-ink-muted">{unit}</span>}
    </span>
  );
}

/** A dash for genuinely absent values — never a zero, never an empty cell. */
export function Absent({ className }: { className?: string }) {
  return (
    <span aria-label="none" className={cn("font-mono text-ink-muted", className)}>
      —
    </span>
  );
}
