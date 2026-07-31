"use client";

import Link from "next/link";

import {
  AGING_BUCKETS,
  agingOverdueTotal,
  agingTotal,
  type AgingBucketKey,
  type AgingSummary,
} from "@/lib/aging";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Money } from "@/components/distrix/money";

interface AgingRailProps {
  summary: AgingSummary;
  asOf: Date | string;
  /** Currently filtered bucket — dims the others. */
  selected?: AgingBucketKey | null;
  /** Click handler mode, for when the rail filters a list on the same page. */
  onSelect?: (key: AgingBucketKey) => void;
  /** Link mode, for when a segment navigates to a filtered list. */
  hrefFor?: (key: AgingBucketKey) => string;
  title?: string;
  /** Pinned at the top of SoA and customer pages: shorter bar, no title row. */
  variant?: "full" | "pinned";
  className?: string;
}

/**
 * The AR Aging Rail. In a distribution business collection *is* the business,
 * so the receivable position is never more than a glance away: it sits on the
 * dashboard and pinned to Statement of Account and every customer page.
 *
 * Segment widths are proportional to amount, with a floor so a small-but-real
 * 90+ balance stays clickable instead of collapsing to a hairline.
 */
export function AgingRail({
  summary,
  asOf,
  selected = null,
  onSelect,
  hrefFor,
  title = "Receivables",
  variant = "full",
  className,
}: AgingRailProps) {
  const total = agingTotal(summary);
  const overdue = agingOverdueTotal(summary);
  const pinned = variant === "pinned";

  const segments = AGING_BUCKETS.map((meta) => {
    const value = summary[meta.key];
    const share = total === 0 ? 0 : value.amount / total;
    return { meta, value, share };
  });

  const nonZero = segments.filter((s) => s.value.amount !== 0).length;
  // 4% floor keeps every non-zero bucket a real target; the rest is prorated.
  const floor = nonZero > 0 ? Math.min(0.04, 1 / (nonZero * 2)) : 0;
  const slack = 1 - floor * nonZero;

  return (
    <section
      aria-label={`Accounts receivable aging as at ${formatDate(asOf)}`}
      className={cn(
        "rounded-lg border border-border bg-surface shadow-raised",
        pinned ? "p-3" : "p-4",
        className,
      )}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-baseline gap-3">
          <h2
            className={cn(
              "font-semibold tracking-heading text-ink",
              pinned ? "text-lg" : "text-xl",
            )}
          >
            {title}
          </h2>
          <Money
            amount={total}
            symbol
            weight="semibold"
            className={pinned ? "text-xl" : "text-3xl"}
          />
        </div>
        <div className="flex items-baseline gap-2 text-sm text-ink-muted">
          {overdue !== 0 && (
            <span className="flex items-baseline gap-1.5">
              <Money amount={overdue} tone="variance" weight="medium" />
              <span>past due</span>
            </span>
          )}
          <span aria-hidden className="text-border-strong">
            ·
          </span>
          <span>as at {formatDate(asOf)}</span>
        </div>
      </header>

      {total === 0 ? (
        <div
          className={cn(
            "mt-3 flex items-center justify-center rounded-md bg-surface-sunken text-base text-ink-muted",
            pinned ? "h-8" : "h-10",
          )}
        >
          Nothing outstanding — every invoice is settled.
        </div>
      ) : (
        <>
          {/* The bar. Widths are proportional; colour is the severity ramp. */}
          <div
            className={cn("mt-3 flex gap-1", pinned ? "h-7" : "h-10")}
            role="group"
            aria-label="Aging buckets"
          >
            {segments.map(({ meta, value, share }) => {
              if (value.amount === 0) return null;
              const width = `${((floor + share * slack) * 100).toFixed(3)}%`;
              const dimmed = selected !== null && selected !== meta.key;
              const label = `${meta.label} days: ${value.count} invoice${
                value.count === 1 ? "" : "s"
              }`;

              const inner = (
                <>
                  <span className="sr-only">{label}</span>
                  {!pinned && share > 0.08 && (
                    <span className="px-2 font-mono text-xs font-medium text-white/85 tabular-nums">
                      {Math.round(share * 100)}%
                    </span>
                  )}
                </>
              );

              const shared = cn(
                "flex h-full items-center justify-start overflow-hidden rounded-sm",
                "transition-[opacity,transform] duration-[160ms] ease-out",
                "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                meta.fill,
                dimmed ? "opacity-35" : "opacity-100",
                (onSelect ?? hrefFor) && "cursor-pointer hover:opacity-80",
                selected === meta.key && "ring-2 ring-ink/20 ring-offset-1 ring-offset-surface",
              );

              if (hrefFor) {
                return (
                  <Link
                    key={meta.key}
                    href={hrefFor(meta.key)}
                    style={{ width }}
                    className={shared}
                    title={label}
                  >
                    {inner}
                  </Link>
                );
              }

              return (
                <button
                  key={meta.key}
                  type="button"
                  onClick={() => onSelect?.(meta.key)}
                  aria-pressed={onSelect ? selected === meta.key : undefined}
                  disabled={!onSelect}
                  style={{ width }}
                  className={cn(shared, !onSelect && "cursor-default")}
                  title={label}
                >
                  {inner}
                </button>
              );
            })}
          </div>

          {/* Mono figures beneath each segment. */}
          <dl
            className={cn(
              "mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-5",
              pinned && "mt-2",
            )}
          >
            {segments.map(({ meta, value, share }) => (
              <div
                key={meta.key}
                className={cn(
                  "flex flex-col gap-0.5 border-l-2 pl-2 transition-opacity duration-[160ms]",
                  meta.border,
                  selected !== null && selected !== meta.key && "opacity-45",
                )}
              >
                <dt className="th-label">
                  {meta.label}
                  {meta.key !== "current" && <span className="ml-1 normal-case">days</span>}
                </dt>
                <dd className="flex items-baseline gap-2">
                  <Money
                    amount={value.amount}
                    weight="medium"
                    tone={value.amount === 0 ? "muted" : "plain"}
                    className={pinned ? "text-base" : "text-lg"}
                  />
                </dd>
                <dd className="font-mono text-xs text-ink-muted tabular-nums">
                  {value.count} inv · {total === 0 ? 0 : Math.round(share * 100)}%
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
