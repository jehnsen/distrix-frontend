"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import type { ProductDetail } from "@/lib/api";
import { formatDate, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { STOCK_MOVEMENT_LABEL } from "@/types/inventory";
import { Figure } from "@/components/distrix/money";
import { Card, CardHeader } from "@/components/distrix/primitives";
import { StockHealthChip } from "@/components/distrix/stock-indicator";

const TH = "th-label h-8 border-b border-border bg-surface-sunken px-3";
const TD = "h-row border-b border-border px-3";

/* --- Stock by warehouse ------------------------------------------------- */

export function StockByWarehousePanel({ detail }: { detail: ProductDetail }) {
  const totals = detail.stockByWarehouse.reduce(
    (acc, row) => ({
      onHand: acc.onHand + row.level.onHand,
      reserved: acc.reserved + row.level.reserved,
      available: acc.available + row.level.available,
      incoming: acc.incoming + row.level.incoming,
    }),
    { onHand: 0, reserved: 0, available: 0, incoming: 0 },
  );

  return (
    <Card padded={false}>
      <CardHeader
        title="Stock by warehouse"
        description={`Reorder point ${formatQty(detail.product.reorderPoint)} ${detail.product.uom} per site.`}
      />
      <table className="w-full border-separate border-spacing-0 text-base">
        <thead>
          <tr>
            {["Warehouse", "On hand", "Reserved", "Available", "Incoming", "Health"].map(
              (label, index) => (
                <th
                  key={label}
                  scope="col"
                  className={cn(TH, index >= 1 && index <= 4 && "text-right")}
                >
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {detail.stockByWarehouse.map(({ warehouse, level, health }) => (
            <tr key={warehouse.id} className="transition-colors hover:bg-surface-sunken">
              <td className={TD}>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-sm text-ink-muted">{warehouse.code}</span>
                  <span>{warehouse.name}</span>
                </span>
              </td>
              <td className={cn(TD, "text-right")}>
                <Figure value={level.onHand} />
              </td>
              <td className={cn(TD, "text-right")}>
                <Figure value={level.reserved} tone="muted" />
              </td>
              <td className={cn(TD, "text-right")}>
                <Figure value={level.available} weight="medium" />
              </td>
              <td className={cn(TD, "text-right")}>
                {level.incoming === 0 ? (
                  <span className="font-mono text-ink-muted">—</span>
                ) : (
                  <Figure value={level.incoming} tone="accent" />
                )}
              </td>
              <td className={TD}>
                <StockHealthChip health={health} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-surface-sunken/50">
            <td className="th-label px-3 py-2">All warehouses</td>
            <td className="px-3 py-2 text-right">
              <Figure value={totals.onHand} weight="semibold" />
            </td>
            <td className="px-3 py-2 text-right">
              <Figure value={totals.reserved} weight="semibold" tone="muted" />
            </td>
            <td className="px-3 py-2 text-right">
              <Figure value={totals.available} weight="semibold" />
            </td>
            <td className="px-3 py-2 text-right">
              <Figure value={totals.incoming} weight="semibold" tone="accent" />
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}

/* --- Movement history --------------------------------------------------- */

export function MovementsPanel({ detail }: { detail: ProductDetail }) {
  const warehouseCodes = new Map(
    detail.stockByWarehouse.map(({ warehouse }) => [warehouse.id, warehouse.code]),
  );

  if (detail.movements.length === 0) {
    return (
      <Card padded={false}>
        <CardHeader title="Movement history" />
        <p className="px-4 py-10 text-center text-base text-ink-muted">
          Nothing has moved this SKU yet.
        </p>
      </Card>
    );
  }

  return (
    <Card padded={false}>
      <CardHeader
        title="Movement history"
        description="Newest first. Every change to on-hand traces back to a document."
      />
      <div className="max-h-[36rem] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-base">
          <thead className="sticky top-0 z-10">
            <tr>
              {["Date", "Type", "Warehouse", "Document", "Qty", "Balance"].map(
                (label, index) => (
                  <th
                    key={label}
                    scope="col"
                    className={cn(TH, index >= 4 && "text-right")}
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {detail.movements.map((movement) => (
              <tr key={movement.id} className="transition-colors hover:bg-surface-sunken">
                <td className={cn(TD, "font-mono tabular-nums whitespace-nowrap")}>
                  {formatDate(movement.date)}
                </td>
                <td className={TD}>
                  <span className="flex items-center gap-1.5">
                    {movement.qty >= 0 ? (
                      <ArrowDownLeft
                        aria-hidden
                        size={14}
                        strokeWidth={2}
                        className="text-paid"
                      />
                    ) : (
                      <ArrowUpRight
                        aria-hidden
                        size={14}
                        strokeWidth={2}
                        className="text-ink-muted"
                      />
                    )}
                    <span className="text-sm">{STOCK_MOVEMENT_LABEL[movement.type]}</span>
                  </span>
                </td>
                <td className={cn(TD, "font-mono text-sm text-ink-muted")}>
                  {warehouseCodes.get(movement.warehouseId) ?? "—"}
                </td>
                <td className={cn(TD, "font-mono text-sm")}>{movement.sourceDocNo}</td>
                <td className={cn(TD, "text-right")}>
                  <Figure
                    value={movement.qty}
                    signed
                    tone={movement.qty >= 0 ? "delta" : "plain"}
                  />
                </td>
                <td className={cn(TD, "text-right")}>
                  <Figure value={movement.balanceAfter} tone="muted" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

