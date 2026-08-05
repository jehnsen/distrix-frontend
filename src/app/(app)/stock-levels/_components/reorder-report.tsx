"use client";

import Link from "next/link";
import { CheckCircle2, ShoppingCart } from "lucide-react";

import type { ApiError, ReorderRow } from "@/lib/api";
import { formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Figure } from "@/components/distrix/money";
import { Card, CardHeader } from "@/components/distrix/primitives";
import { ErrorState, TableSkeleton } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";

const TH = "th-label h-8 border-b border-border bg-surface-sunken px-3";
const TD = "h-row border-b border-border px-3";

/**
 * What to buy and how urgently. Grouped by supplier because that is how the
 * order actually gets placed — one PO per supplier, not one per SKU.
 */
export function ReorderReport({
  rows,
  isLoading,
  error,
  onRetry,
}: {
  rows: ReorderRow[];
  isLoading: boolean;
  error: ApiError | undefined;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <Card padded={false}>
        <ErrorState what="the reorder report" detail={error.message} onRetry={onRetry} />
      </Card>
    );
  }

  if (isLoading && rows.length === 0) {
    return (
      <Card padded={false}>
        <TableSkeleton columns={6} rows={6} />
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card padded={false}>
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-lg border border-paid/20 bg-paid-wash text-paid"
          >
            <CheckCircle2 size={18} strokeWidth={1.75} />
          </span>
          <div className="flex max-w-md flex-col gap-1">
            <h3 className="text-xl font-semibold tracking-heading text-ink">
              Nothing needs reordering
            </h3>
            <p className="text-base text-ink-muted">
              Every active SKU is above its reorder point once incoming purchase orders are
              counted.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const bySupplier = new Map<string, ReorderRow[]>();
  for (const row of rows) {
    const bucket = bySupplier.get(row.supplierName) ?? [];
    bucket.push(row);
    bySupplier.set(row.supplierName, bucket);
  }

  return (
    <div className="flex flex-col gap-4">
      {[...bySupplier.entries()]
        .sort((a, b) => b[1].length - a[1].length)
        .map(([supplier, supplierRows]) => (
          <Card key={supplier} padded={false}>
            <CardHeader
              title={supplier}
              description={`${supplierRows.length} SKU(s) · ${supplierRows[0]?.leadTimeDays ?? 0} day lead time`}
              actions={
                <Button variant="outline" size="sm" render={
                  <Link href="/purchase-orders/new">
                    <ShoppingCart size={16} strokeWidth={1.75} />
                    Draft a PO
                  </Link>
                } />
              }
            />
            <table className="w-full border-separate border-spacing-0 text-base">
              <thead>
                <tr>
                  {["SKU", "Product", "Available", "Incoming", "Reorder pt.", "Shortfall"].map(
                    (label, index) => (
                      <th
                        key={label}
                        scope="col"
                        className={cn(TH, index >= 2 && "text-right")}
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {supplierRows.map((row) => (
                  <tr
                    key={row.product.id}
                    className="transition-colors hover:bg-surface-sunken"
                  >
                    <td className={TD}>
                      <Link
                        href={`/products/${row.product.sku}`}
                        className="font-mono font-medium text-ink underline-offset-2 hover:text-accent hover:underline"
                      >
                        {row.product.sku}
                      </Link>
                    </td>
                    <td className={cn(TD, "max-w-80 truncate")}>{row.product.name}</td>
                    <td className={cn(TD, "text-right")}>
                      <Figure
                        value={row.available}
                        tone={row.available <= 0 ? "variance" : "plain"}
                      />
                    </td>
                    <td className={cn(TD, "text-right")}>
                      {row.incoming === 0 ? (
                        <span className="font-mono text-ink-muted">—</span>
                      ) : (
                        <Figure value={row.incoming} tone="accent" />
                      )}
                    </td>
                    <td className={cn(TD, "text-right")}>
                      <Figure value={row.reorderPoint} tone="muted" />
                    </td>
                    <td className={cn(TD, "text-right")}>
                      <Figure
                        value={row.shortfall}
                        weight="medium"
                        tone={row.shortfall > 0 ? "variance" : "muted"}
                        unit={row.product.uom}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      <p className="text-sm text-ink-muted">
        Shortfall is the reorder point less what is available and already incoming —{" "}
        <span className="font-mono">{formatQty(rows.reduce((a, r) => a + r.shortfall, 0))}</span>{" "}
        units across {rows.length} SKUs.
      </p>
    </div>
  );
}
