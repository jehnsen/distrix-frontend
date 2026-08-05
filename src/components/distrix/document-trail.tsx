"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { formatDate, formatMoney } from "@/lib/format";
import type { Centavos } from "@/lib/money";
import { cn } from "@/lib/utils";
import { StatusPill, type StatusKey } from "@/components/distrix/status-pill";

export interface TrailNode {
  id: string;
  docNo: string;
  status: StatusKey;
  date: string;
  href: string;
  /** Money on invoices and payments; absent on orders and deliveries. */
  amount?: Centavos;
  /** Units, where the document moves goods. */
  qty?: number;
}

export interface TrailStage {
  key: string;
  label: string;
  nodes: TrailNode[];
  /** Shown in place of the nodes when the stage has not happened yet. */
  pendingLabel: string;
}

/**
 * The fulfilment chain — SO → DRs → Invoices → Payments — as a horizontal trail
 * of clickable nodes (§7). A stage with several documents stacks them, because
 * one order genuinely can produce two deliveries and one invoice.
 *
 * The point is that a clerk asked "where is this order?" can answer it without
 * opening anything.
 */
export function DocumentTrail({
  stages,
  currentStageKey,
  className,
}: {
  stages: TrailStage[];
  /** Highlighted as where the document has got to. */
  currentStageKey?: string;
  className?: string;
}) {
  return (
    <section
      aria-label="Document trail"
      className={cn(
        "overflow-x-auto rounded-lg border border-border bg-surface p-3 shadow-raised",
        className,
      )}
    >
      <ol role="list" className="flex min-w-max items-stretch gap-1">
        {stages.map((stage, index) => {
          const reached = stage.nodes.length > 0;
          const current = stage.key === currentStageKey;

          return (
            <li key={stage.key} className="flex items-stretch gap-1">
              {index > 0 && (
                <div className="flex items-center px-1" aria-hidden>
                  <ChevronRight
                    size={16}
                    strokeWidth={2}
                    className={reached ? "text-border-strong" : "text-border"}
                  />
                </div>
              )}

              <div
                className={cn(
                  "flex min-w-44 flex-col gap-1.5 rounded-md border p-2",
                  current
                    ? "border-accent/40 bg-accent-wash"
                    : reached
                      ? "border-border bg-surface"
                      : "border-dashed border-border bg-surface-sunken/40",
                )}
              >
                <span
                  className={cn("th-label", current && "text-accent")}
                >
                  {stage.label}
                </span>

                {reached ? (
                  <ul role="list" className="flex flex-col gap-1">
                    {stage.nodes.map((node) => (
                      <li key={node.id}>
                        <Link
                          href={node.href}
                          className={cn(
                            "flex flex-col gap-1 rounded-sm px-1 py-0.5",
                            "transition-colors hover:bg-surface-sunken",
                            "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                          )}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-mono text-base font-medium text-ink tabular-nums">
                              {node.docNo}
                            </span>
                            <StatusPill status={node.status} dot={false} />
                          </span>
                          <span className="flex items-center justify-between gap-2 font-mono text-xs text-ink-muted tabular-nums">
                            <span>{formatDate(node.date)}</span>
                            {node.amount !== undefined && (
                              <span>{formatMoney(node.amount)}</span>
                            )}
                            {node.amount === undefined && node.qty !== undefined && (
                              <span>{node.qty.toLocaleString("en-PH")} u</span>
                            )}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-1 py-1.5 text-sm text-ink-muted">{stage.pendingLabel}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
