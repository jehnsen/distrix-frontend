"use client";

import { AGING_BUCKETS } from "@/lib/aging";
import { fromMajor } from "@/lib/money";
import { STATUS_REGISTRY, StatusPill, type StatusKey } from "@/components/distrix/status-pill";
import { Figure, Money } from "@/components/distrix/money";
import { Card } from "@/components/distrix/primitives";

const SURFACES = [
  ["canvas", "bg-canvas", "App background"],
  ["surface", "bg-surface", "Cards, tables, sheets"],
  ["surface-sunken", "bg-surface-sunken", "Table headers, disabled fields"],
  ["border", "bg-border", "Hairlines, dividers"],
  ["ink", "bg-ink", "Primary text, figures"],
  ["ink-muted", "bg-ink-muted", "Labels, secondary text"],
] as const;

const SEMANTIC = [
  ["accent", "bg-accent", "Primary actions, active nav"],
  ["accent-wash", "bg-accent-wash", "Selected rows, active nav"],
  ["paid", "bg-paid", "Paid, received, posted"],
  ["overdue", "bg-overdue", "Overdue, cancelled, variance"],
  ["partial", "bg-partial", "Partial, low stock, pending"],
  ["info", "bg-info", "In transit, informational"],
] as const;

const TYPE_SCALE = [
  ["24px", "text-3xl font-semibold tracking-heading", "Page title"],
  ["20px", "text-2xl font-semibold tracking-heading", "Section heading"],
  ["16px", "text-xl font-semibold", "Card heading"],
  ["14px", "text-lg", "Emphasised body"],
  ["13px", "text-base", "Body — the default"],
  ["12px", "text-sm text-ink-muted", "Secondary, hints"],
  ["11px", "th-label", "Table header, eyebrow"],
] as const;

function Swatch({ name, className, use }: { name: string; className: string; use: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={`size-9 shrink-0 rounded-md border border-border ${className}`}
      />
      <span className="flex min-w-0 flex-col">
        <span className="font-mono text-sm text-ink">{name}</span>
        <span className="truncate text-xs text-ink-muted">{use}</span>
      </span>
    </div>
  );
}

export function TokensSection() {
  const statuses = Object.keys(STATUS_REGISTRY) as StatusKey[];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h3 className="th-label pb-3">Surfaces &amp; ink</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {SURFACES.map(([name, className, use]) => (
            <Swatch key={name} name={name} className={className} use={use} />
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="th-label pb-3">Semantic</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {SEMANTIC.map(([name, className, use]) => (
            <Swatch key={name} name={name} className={className} use={use} />
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="th-label pb-3">Type scale — Geist Sans</h3>
        <div className="flex flex-col gap-2.5">
          {TYPE_SCALE.map(([size, className, use]) => (
            <div key={size} className="flex items-baseline gap-3">
              <span className="w-12 shrink-0 font-mono text-xs text-ink-muted">{size}</span>
              <span className={className}>{use}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-border pt-3">
          <h3 className="th-label pb-2">Geist Mono — tabular figures align</h3>
          <div className="flex flex-col items-end gap-0.5 pr-2">
            {[1_204_300, 88_450.75, 412_880.5, 9.99, 156_240].map((value) => (
              <Money key={value} amount={fromMajor(value)} />
            ))}
            <Money amount={fromMajor(-45_120.25)} tone="variance" />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="th-label pb-3">Figures</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
          <span className="text-sm text-ink-muted">Money, symbol</span>
          <Money amount={fromMajor(412_880)} symbol className="text-right" />
          <span className="text-sm text-ink-muted">Negative, parenthesised</span>
          <Money amount={fromMajor(-45_120.25)} className="text-right" />
          <span className="text-sm text-ink-muted">Delta, positive</span>
          <Money amount={fromMajor(88_450)} signed tone="delta" className="text-right" />
          <span className="text-sm text-ink-muted">Delta, negative</span>
          <Money amount={fromMajor(-12_300)} tone="delta" className="text-right" />
          <span className="text-sm text-ink-muted">Variance</span>
          <Money amount={fromMajor(-2_400)} tone="variance" className="text-right" />
          <span className="text-sm text-ink-muted">Quantity with UoM</span>
          <Figure value={1840} unit="PCS" className="text-right" />
          <span className="text-sm text-ink-muted">Percentage</span>
          <Figure value={62.4} percent className="text-right" />
          <span className="text-sm text-ink-muted">Cancelled amount</span>
          <Money amount={fromMajor(97_320)} struck tone="muted" className="text-right" />
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <h3 className="th-label pb-3">
          Status pills — every enum in the domain model, one component
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((status) => (
            <StatusPill key={status} status={status} />
          ))}
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <h3 className="th-label pb-3">
          Aging ramp — the one place colour carries weight
        </h3>
        <div className="flex gap-1">
          {AGING_BUCKETS.map((bucket) => (
            <div key={bucket.key} className="flex flex-1 flex-col gap-1.5">
              <span aria-hidden className={`h-8 rounded-sm ${bucket.fill}`} />
              <span className="th-label">{bucket.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
