"use client";

import { cn } from "@/lib/utils";

/**
 * Layout atoms shared by every screen. Deliberately unopinionated about
 * content — they only guarantee spacing, hairlines and the type scale.
 */

/** A label/value pair. Values are mono when they are figures or identifiers. */
export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <dt className="th-label">{label}</dt>
      <dd className="text-base text-ink">{children}</dd>
      {hint && <dd className="text-xs text-ink-muted">{hint}</dd>}
    </div>
  );
}

export function FieldGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-3",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </dl>
  );
}

/** The standard card. One elevation, 8px radius, hairline border. */
export function Card({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** Off when the card holds a full-bleed table. */
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-surface shadow-raised",
        padded && "p-4",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-2.5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-xl font-semibold tracking-heading text-ink">{title}</h2>
        {description && <p className="text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </header>
  );
}

/**
 * List page header. The breadcrumb already names the page, so this carries the
 * count and the actions — never a duplicate title.
 */
export function PageHeader({
  title,
  count,
  description,
  actions,
  className,
}: {
  title: string;
  count?: number;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-4 pt-4 pb-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-3xl font-semibold tracking-heading text-ink">{title}</h1>
          {count !== undefined && (
            <span className="font-mono text-lg text-ink-muted tabular-nums">{count}</span>
          )}
        </div>
        {description && <p className="text-base text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>}
    </header>
  );
}

/** Persistent, in-flow notice. Credit-limit breaches use this, not a toast. */
export function InlineBanner({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: "info" | "partial" | "overdue" | "paid";
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const TONE = {
    info: "border-info/25 bg-info-wash text-info",
    partial: "border-partial/25 bg-partial-wash text-partial",
    overdue: "border-overdue/25 bg-overdue-wash text-overdue",
    paid: "border-paid/25 bg-paid-wash text-paid",
  } as const;

  return (
    <div
      role={tone === "overdue" ? "alert" : "status"}
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-4 gap-y-2 rounded-md border px-3 py-2.5",
        TONE[tone],
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-base font-semibold">{title}</p>
        {children && <div className="text-base text-ink">{children}</div>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-1.5">{action}</div>}
    </div>
  );
}

/** Read-only, mono, right-aligned — how every document number is displayed. */
export function DocNumber({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm bg-surface-sunken px-1.5 py-0.5 font-mono text-base font-medium text-ink tabular-nums",
        className,
      )}
    >
      {value}
    </span>
  );
}
