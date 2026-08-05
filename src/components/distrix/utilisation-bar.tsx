"use client";

import { cn } from "@/lib/utils";

/**
 * Credit utilisation. Reads at a glance in a 40px table row, and turns
 * unmistakably red past 100% — an account over its limit is the single thing a
 * sales admin must not miss when picking a customer for a new order.
 */
export function UtilisationBar({
  /** 0–1+, where anything above 1 is over limit. */
  value,
  showLabel = true,
  className,
}: {
  value: number;
  showLabel?: boolean;
  className?: string;
}) {
  const pct = Math.round(value * 100);
  const clamped = Math.min(1, Math.max(0, value));
  const tone =
    value > 1 ? "over" : value >= 0.85 ? "near" : value >= 0.6 ? "moderate" : "low";

  const FILL = {
    low: "bg-paid",
    moderate: "bg-accent",
    near: "bg-partial",
    over: "bg-overdue",
  } as const;

  const TEXT = {
    low: "text-ink-muted",
    moderate: "text-ink-muted",
    near: "text-partial",
    over: "text-overdue",
  } as const;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Credit utilisation"
        className="relative h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-[160ms]", FILL[tone])}
          style={{ width: `${clamped * 100}%` }}
        />
        {/* Over-limit accounts get a hard marker at the limit itself. */}
        {value > 1 && (
          <span aria-hidden className="absolute inset-y-0 right-0 w-px bg-surface" />
        )}
      </div>
      {showLabel && (
        <span
          className={cn(
            "w-11 shrink-0 text-right font-mono text-xs tabular-nums",
            TEXT[tone],
          )}
        >
          {pct}%
        </span>
      )}
    </div>
  );
}

/**
 * Fulfilment progress on an order, and receipt progress on a purchase order.
 * Deliberately quieter than the credit bar — this is information, not a risk.
 */
export function ProgressBar({
  value,
  label,
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-[160ms]",
            pct === 100 ? "bg-paid" : "bg-accent",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right font-mono text-xs text-ink-muted tabular-nums">
        {pct}%
      </span>
    </div>
  );
}
