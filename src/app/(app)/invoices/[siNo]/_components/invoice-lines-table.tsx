"use client";

import Link from "next/link";

import { formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/types";
import { VAT_TYPE_SHORT } from "@/types/tax";
import { Figure, Money } from "@/components/distrix/money";
import { Card, CardHeader } from "@/components/distrix/primitives";

const TH = "th-label h-8 border-b border-border bg-surface-sunken px-3";
const TD = "h-row border-b border-border px-3";

/** Billed lines are read-only: an issued invoice is a legal document. */
export function InvoiceLinesTable({ invoice }: { invoice: Invoice }) {
  return (
      <Card padded={false}>
        <CardHeader
          title="Lines"
          description={`${invoice.lines.length} line(s) · ${formatQty(invoice.lines.reduce((acc, line) => acc + line.qty, 0))} units billed`}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] border-separate border-spacing-0 text-base">
            <thead>
              <tr>
                {[
                  ["SKU", "left"],
                  ["Product", "left"],
                  ["Qty", "right"],
                  ["Unit price", "right"],
                  ["Disc", "right"],
                  ["VAT", "center"],
                  ["Net", "right"],
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
              {invoice.lines.map((line) => (
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
                    <Money amount={line.unitPrice} />
                  </td>
                  <td className={cn(TD, "text-right font-mono text-ink-muted tabular-nums")}>
                    {line.discountPct === 0 ? "—" : `${line.discountPct}%`}
                  </td>
                  <td className={cn(TD, "text-center font-mono text-sm text-ink-muted")}>
                    {VAT_TYPE_SHORT[line.vatType]}
                  </td>
                  <td className={cn(TD, "text-right")}>
                    <Money amount={line.lineNet} tone="muted" />
                  </td>
                  <td className={cn(TD, "text-right")}>
                    <Money amount={line.lineTotal} weight="medium" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

    </Card>
  );
}
