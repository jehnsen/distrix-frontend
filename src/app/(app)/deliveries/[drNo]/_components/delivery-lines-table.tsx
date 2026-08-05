"use client";

import Link from "next/link";

import { formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DeliveryReceipt } from "@/types";
import { Figure } from "@/components/distrix/money";
import { Card, CardHeader } from "@/components/distrix/primitives";

const TH = "th-label h-8 border-b border-border bg-surface-sunken px-3";
const TD = "h-row border-b border-border px-3";

/** Ordered, shipped and accepted side by side: the three numbers that differ. */
export function DeliveryLinesTable({ delivery, shipped }: { delivery: DeliveryReceipt; shipped: number }) {
  return (
        <Card padded={false}>
          <CardHeader
            title="Lines"
            description={`${delivery.lines.length} line(s) · ${formatQty(shipped)} units on the truck`}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-separate border-spacing-0 text-base">
              <thead>
                <tr>
                  {["SKU", "Product", "Ordered", "Shipped", "Accepted", "Reason"].map(
                    (label, index) => (
                      <th
                        key={label}
                        scope="col"
                        className={cn(TH, index >= 2 && index <= 4 && "text-right")}
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {delivery.lines.map((line) => {
                  const acceptedQty = line.qtyAccepted ?? line.qtyShipped;
                  return (
                    <tr key={line.id} className="transition-colors hover:bg-surface-sunken">
                      <td className={TD}>
                        <Link
                          href={`/products/${line.sku}`}
                          className="font-mono font-medium text-ink underline-offset-2 hover:text-accent hover:underline"
                        >
                          {line.sku}
                        </Link>
                      </td>
                      <td className={cn(TD, "max-w-72 truncate")}>{line.description}</td>
                      <td className={cn(TD, "text-right")}>
                        <Figure value={line.qtyOrdered} tone="muted" />
                      </td>
                      <td className={cn(TD, "text-right")}>
                        <Figure
                          value={line.qtyShipped}
                          weight="medium"
                          tone={line.qtyShipped < line.qtyOrdered ? "variance" : "plain"}
                        />
                      </td>
                      <td className={cn(TD, "text-right")}>
                        {line.qtyAccepted === undefined ? (
                          <span className="font-mono text-ink-muted">—</span>
                        ) : (
                          <Figure
                            value={acceptedQty}
                            weight="medium"
                            tone={acceptedQty < line.qtyShipped ? "variance" : "plain"}
                          />
                        )}
                      </td>
                      <td className={cn(TD, "text-sm text-ink-muted")}>
                        {line.shortReason ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

    </Card>
  );
}
