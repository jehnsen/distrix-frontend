"use client";

import Link from "next/link";

import { getAdjustment } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ADJUSTMENT_REASON_LABEL } from "@/types/inventory";
import { useApiQuery } from "@/hooks/use-api-query";
import { Figure, Money } from "@/components/distrix/money";
import { Field, FieldGrid } from "@/components/distrix/primitives";
import { StatusPill } from "@/components/distrix/status-pill";
import { ErrorState, PanelSkeleton } from "@/components/distrix/states";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const TH = "th-label h-8 border-b border-border bg-surface-sunken px-3";
const TD = "h-row border-b border-border px-3";

/**
 * Adjustments are short documents read far more often than they are edited, so
 * they open in a sheet from the list rather than costing a full page load and a
 * lost scroll position.
 */
export function AdjustmentSheet({
  adjNo,
  onClose,
}: {
  adjNo: string | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={adjNo !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[min(52rem,100vw)] gap-0 p-0">
        {adjNo && <AdjustmentBody adjNo={adjNo} />}
      </SheetContent>
    </Sheet>
  );
}

function AdjustmentBody({ adjNo }: { adjNo: string }) {
  const { data, error, isInitialLoading, refetch } = useApiQuery(`adjustment:${adjNo}`, () =>
    getAdjustment(adjNo),
  );

  if (error) {
    return (
      <>
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="font-mono">{adjNo}</SheetTitle>
        </SheetHeader>
        <ErrorState what={`adjustment ${adjNo}`} detail={error.message} onRetry={refetch} />
      </>
    );
  }

  if (isInitialLoading || !data) {
    return (
      <>
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="font-mono">{adjNo}</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <PanelSkeleton lines={8} />
        </div>
      </>
    );
  }

  const { adjustment, warehouse } = data;
  const products = new Map(data.products);

  return (
    <>
      <SheetHeader className="border-b border-border px-4 py-3">
        <SheetTitle className="flex items-center gap-2.5">
          <span className="font-mono">{adjustment.adjNo}</span>
          <StatusPill status={adjustment.status} size="md" />
        </SheetTitle>
        <SheetDescription>
          {warehouse.name} · counted {formatDate(adjustment.date)} by{" "}
          {adjustment.createdByName}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <FieldGrid columns={3}>
            <Field label="Warehouse" hint={warehouse.address.city}>
              {warehouse.name}
            </Field>
            <Field label="Lines counted">
              <Figure value={adjustment.lines.length} />
            </Field>
            <Field label="Net variance value">
              <Money
                amount={adjustment.totalVarianceValue}
                symbol
                weight="medium"
                tone={adjustment.totalVarianceValue === 0 ? "muted" : "variance"}
              />
            </Field>
            {adjustment.approvedByName && (
              <Field label="Approved by">{adjustment.approvedByName}</Field>
            )}
          </FieldGrid>
        </div>

        <table className="w-full border-separate border-spacing-0 text-base">
          <thead>
            <tr>
              {["SKU", "Product", "System", "Counted", "Variance", "Reason", "Value"].map(
                (label, index) => (
                  <th
                    key={label}
                    scope="col"
                    className={cn(TH, (index >= 2 && index <= 4) || index === 6 ? "text-right" : "")}
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {adjustment.lines.map((line) => {
              const product = products.get(line.productId);
              return (
                <tr key={line.id} className="transition-colors hover:bg-surface-sunken">
                  <td className={TD}>
                    {product ? (
                      <Link
                        href={`/products/${product.sku}`}
                        className="font-mono font-medium text-ink underline-offset-2 hover:text-accent hover:underline"
                      >
                        {product.sku}
                      </Link>
                    ) : (
                      <span className="font-mono text-ink-muted">—</span>
                    )}
                  </td>
                  <td className={cn(TD, "max-w-56 truncate")}>{product?.name ?? "—"}</td>
                  <td className={cn(TD, "text-right")}>
                    <Figure value={line.systemQty} tone="muted" />
                  </td>
                  <td className={cn(TD, "text-right")}>
                    <Figure value={line.countedQty} />
                  </td>
                  <td className={cn(TD, "text-right")}>
                    <Figure
                      value={line.varianceQty}
                      signed
                      weight="medium"
                      tone={line.varianceQty === 0 ? "muted" : "variance"}
                    />
                  </td>
                  <td className={cn(TD, "text-sm text-ink-muted")}>
                    {ADJUSTMENT_REASON_LABEL[line.reason]}
                  </td>
                  <td className={cn(TD, "text-right")}>
                    <Money
                      amount={line.varianceValue}
                      tone={line.varianceValue === 0 ? "muted" : "variance"}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-surface-sunken/50">
              <td colSpan={6} className="th-label px-3 py-2 text-right">
                Net variance
              </td>
              <td className="px-3 py-2 text-right">
                <Money
                  amount={adjustment.totalVarianceValue}
                  weight="semibold"
                  className="text-lg"
                  tone={adjustment.totalVarianceValue === 0 ? "muted" : "variance"}
                />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
