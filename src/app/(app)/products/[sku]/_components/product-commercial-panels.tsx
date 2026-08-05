"use client";

import Link from "next/link";

import type { ProductDetail } from "@/lib/api";
import { formatDate, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { grossMarginPct } from "@/types/product";
import { Figure, Money } from "@/components/distrix/money";
import { Card, CardHeader, Field, FieldGrid } from "@/components/distrix/primitives";

const TH = "th-label h-8 border-b border-border bg-surface-sunken px-3";
const TD = "h-row border-b border-border px-3";

/**
 * The commercial side of a product: what it sells for on each price list, who
 * supplies it, and what each shipment actually landed at.
 */

/* --- Pricing and sourcing ----------------------------------------------- */

export function PricingPanel({
  detail,
  priceListNames,
}: {
  detail: ProductDetail;
  priceListNames: Map<string, string>;
}) {
  const { product } = detail;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card padded={false}>
        <CardHeader
          title="Price list entries"
          description="Volume breaks apply from the stated quantity upward."
        />
        <table className="w-full border-separate border-spacing-0 text-base">
          <thead>
            <tr>
              {["Price list", "From qty", "Unit price", "Margin"].map((label, index) => (
                <th key={label} scope="col" className={cn(TH, index >= 1 && "text-right")}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {detail.priceListEntries.map((entry, index) => (
              <tr
                key={`${entry.priceListId}-${entry.minQty}-${index}`}
                className="transition-colors hover:bg-surface-sunken"
              >
                <td className={TD}>{priceListNames.get(entry.priceListId) ?? entry.priceListId}</td>
                <td className={cn(TD, "text-right")}>
                  <Figure value={entry.minQty} tone="muted" />
                </td>
                <td className={cn(TD, "text-right")}>
                  <Money amount={entry.unitPrice} />
                </td>
                <td className={cn(TD, "text-right font-mono tabular-nums")}>
                  <span
                    className={
                      grossMarginPct(entry.unitPrice, product.standardCost) < 10
                        ? "text-overdue"
                        : "text-ink-muted"
                    }
                  >
                    {grossMarginPct(entry.unitPrice, product.standardCost).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h3 className="th-label pb-3">Sourcing</h3>
        <FieldGrid columns={2}>
          <Field label="Primary supplier">{detail.supplier?.name ?? "—"}</Field>
          <Field label="Supplier type">
            {detail.supplier?.type === "international" ? "International" : "Local"}
          </Field>
          <Field label="Origin">{detail.supplier?.origin ?? "—"}</Field>
          <Field label="Lead time">
            {detail.supplier ? `${detail.supplier.leadTimeDays} days` : "—"}
          </Field>
          <Field label="Standard cost">
            <Money amount={product.standardCost} symbol weight="medium" />
          </Field>
          <Field label="List price">
            <Money amount={product.listPrice} symbol weight="medium" />
          </Field>
        </FieldGrid>
        {detail.supplier && (
          <p className="mt-3 border-t border-border pt-3 text-sm text-ink-muted">
            Reordering takes about {detail.supplier.leadTimeDays} days from{" "}
            {detail.supplier.origin}, so the reorder point of{" "}
            <span className="font-mono">{formatQty(product.reorderPoint)}</span>{" "}
            {product.uom} needs to cover that window.
          </p>
        )}
      </Card>
    </div>
  );
}

/* --- Landed cost history ------------------------------------------------ */

export function LandedCostPanel({ detail }: { detail: ProductDetail }) {
  if (detail.landedCostHistory.length === 0) {
    return (
      <Card padded={false}>
        <CardHeader title="Landed cost history" />
        <p className="px-4 py-10 text-center text-base text-ink-muted">
          {detail.product.isImported
            ? "No shipment of this SKU has been received and costed yet."
            : "Landed cost applies to imported items. This one is bought locally."}
        </p>
      </Card>
    );
  }

  const latest = detail.landedCostHistory[0];

  return (
    <Card padded={false}>
      <CardHeader
        title="Landed cost history"
        description="What each shipment actually cost once freight, duty and brokerage were spread over it."
        actions={
          latest && (
            <span className="flex items-baseline gap-2 text-sm text-ink-muted">
              Latest
              <Money amount={latest.unitLandedCost} symbol weight="medium" className="text-base" />
            </span>
          )
        }
      />
      <table className="w-full border-separate border-spacing-0 text-base">
        <thead>
          <tr>
            {["Received", "PO", "Qty", "Unit landed cost", "vs standard"].map(
              (label, index) => (
                <th key={label} scope="col" className={cn(TH, index >= 2 && "text-right")}>
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {detail.landedCostHistory.map((entry, index) => {
            const variance =
              detail.product.standardCost === 0
                ? 0
                : ((entry.unitLandedCost - detail.product.standardCost) /
                    detail.product.standardCost) *
                  100;
            return (
              <tr
                key={`${entry.poNo}-${index}`}
                className="transition-colors hover:bg-surface-sunken"
              >
                <td className={cn(TD, "font-mono tabular-nums")}>
                  {formatDate(entry.receivedDate)}
                </td>
                <td className={TD}>
                  <Link
                    href={`/purchase-orders/${entry.poNo}`}
                    className="font-mono font-medium text-ink underline-offset-2 hover:text-accent hover:underline"
                  >
                    {entry.poNo}
                  </Link>
                </td>
                <td className={cn(TD, "text-right")}>
                  <Figure value={entry.qty} />
                </td>
                <td className={cn(TD, "text-right")}>
                  <Money amount={entry.unitLandedCost} weight="medium" />
                </td>
                <td className={cn(TD, "text-right font-mono tabular-nums")}>
                  <span className={variance > 5 ? "text-overdue" : "text-ink-muted"}>
                    {variance >= 0 ? "+" : ""}
                    {variance.toFixed(1)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
