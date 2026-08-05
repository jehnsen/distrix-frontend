"use client";

import Link from "next/link";

import { formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SalesOrder } from "@/types";
import { VAT_TYPE_SHORT } from "@/types/tax";
import { Figure, Money } from "@/components/distrix/money";
import { Card, CardHeader } from "@/components/distrix/primitives";
import { ProgressBar } from "@/components/distrix/utilisation-bar";

const TH = "th-label h-8 border-b border-border bg-surface-sunken px-3";
const TD = "h-row border-b border-border px-3";

/**
 * A posted order's lines are read-only — editing happens in
 * `<LineItemsEditor>` while the order is still a draft. What matters here is
 * how much of each line has actually gone out.
 */
export function OrderLinesTable({ order }: { order: SalesOrder }) {
  const totalQty = order.lines.reduce((acc, line) => acc + line.qty, 0);
  const deliveredQty = order.lines.reduce((acc, line) => acc + line.deliveredQty, 0);

  return (
    <Card padded={false}>
      <CardHeader
        title="Lines"
        description={`${order.lines.length} line(s) · ${formatQty(deliveredQty)} of ${formatQty(totalQty)} units shipped`}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[54rem] border-separate border-spacing-0 text-base">
          <thead>
            <tr>
              {[
                ["SKU", "left"],
                ["Product", "left"],
                ["Ordered", "right"],
                ["Shipped", "right"],
                ["Outstanding", "right"],
                ["Unit price", "right"],
                ["Disc", "right"],
                ["VAT", "center"],
                ["Line total", "right"],
              ].map(([label, align]) => (
                <th
                  key={label}
                  scope="col"
                  className={cn(
                    TH,
                    align === "right" && "text-right",
                    align === "center" && "text-center",
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => {
              const outstanding = Math.max(0, line.qty - line.deliveredQty);
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
                    <Figure value={line.qty} unit={line.uom} />
                  </td>
                  <td className={cn(TD, "text-right")}>
                    <Figure
                      value={line.deliveredQty}
                      tone={line.deliveredQty === 0 ? "muted" : "plain"}
                    />
                  </td>
                  <td className={cn(TD, "text-right")}>
                    {outstanding === 0 ? (
                      <span className="font-mono text-paid">—</span>
                    ) : (
                      <Figure value={outstanding} tone="variance" weight="medium" />
                    )}
                  </td>
                  <td className={cn(TD, "text-right")}>
                    <Money amount={line.unitPrice} />
                  </td>
                  <td className={cn(TD, "text-right font-mono text-ink-muted tabular-nums")}>
                    {line.discountPct === 0 ? "—" : `${line.discountPct}%`}
                  </td>
                  <td className={cn(TD, "text-center font-mono text-sm text-ink-muted")}>
                    {VAT_TYPE_SHORT[line.vatType]}
                  </td>
                  <td className={cn(TD, "text-right")}>
                    <Money amount={line.lineTotal} weight="medium" />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-surface-sunken/50">
              <td colSpan={2} className="th-label px-3 py-2">
                Fulfilment
              </td>
              <td colSpan={3} className="px-3 py-2">
                <ProgressBar
                  value={totalQty === 0 ? 0 : deliveredQty / totalQty}
                  label="Fulfilment progress"
                />
              </td>
              <td colSpan={3} className="th-label px-3 py-2 text-right">
                Subtotal
              </td>
              <td className="px-3 py-2 text-right">
                <Money amount={order.subtotal} weight="semibold" className="text-lg" />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
