"use client";

import { Truck } from "lucide-react";

import type { DeliverableOrder } from "@/lib/api";
import { formatDate, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Figure } from "@/components/distrix/money";
import { Card, CardHeader } from "@/components/distrix/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DraftLine {
  salesOrderLineId: string;
  productId: string;
  sku: string;
  description: string;
  uom: string;
  qtyOrdered: number;
  outstanding: number;
  qtyShipped: number;
  shortReason: string;
}

export const SHORT_REASONS = [
  "Insufficient stock at picking",
  "Damaged cases pulled at loading",
  "Customer accepted partial",
  "Truck capacity reached",
];

/** Ship-all is the default (§7); short-shipping is the deliberate exception. */
export function shipAll(order: DeliverableOrder): DraftLine[] {
  return order.order.lines
    .map((line) => ({
      salesOrderLineId: line.id,
      productId: line.productId,
      sku: line.sku,
      description: line.description,
      uom: line.uom,
      qtyOrdered: line.qty,
      outstanding: Math.max(0, line.qty - line.deliveredQty),
      qtyShipped: Math.max(0, line.qty - line.deliveredQty),
      shortReason: "",
    }))
    .filter((line) => line.outstanding > 0);
}

export function ShipLinesTable({
  order,
  lines,
  shippingQty,
  missingReason,
  busy,
  onUpdate,
  onShipAll,
}: {
  order: DeliverableOrder;
  lines: DraftLine[];
  shippingQty: number;
  missingReason: boolean;
  busy: boolean;
  onUpdate: (id: string, patch: Partial<DraftLine>) => void;
  onShipAll: () => void;
}) {
  return (
    <Card padded={false}>
      <CardHeader
        title="Lines to ship"
        description={`${order.order.soNo} · required by ${formatDate(order.order.requiredDate)} · ${formatQty(shippingQty)} units going out`}
        actions={
          <Button variant="outline" size="sm" onClick={onShipAll} disabled={busy}>
            <Truck size={16} strokeWidth={1.75} />
            Ship all
          </Button>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] border-separate border-spacing-0 text-base">
          <thead>
            <tr>
              {["SKU", "Product", "Outstanding", "Shipping", "Short by", "Reason"].map(
                (label, index) => (
                  <th
                    key={label}
                    scope="col"
                    className={cn(
                      "th-label h-8 border-b border-border bg-surface-sunken px-3",
                      index >= 2 && index <= 4 && "text-right",
                    )}
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const short = line.outstanding - line.qtyShipped;
              return (
                <tr
                  key={line.salesOrderLineId}
                  className="transition-colors hover:bg-surface-sunken"
                >
                  <td className="h-row border-b border-border px-3 font-mono font-medium">
                    {line.sku}
                  </td>
                  <td className="h-row max-w-64 truncate border-b border-border px-3">
                    {line.description}
                  </td>
                  <td className="h-row border-b border-border px-3 text-right">
                    <Figure value={line.outstanding} unit={line.uom} tone="muted" />
                  </td>
                  <td className="h-row border-b border-border px-3 text-right">
                    <Input
                      numeric
                      inputMode="numeric"
                      aria-label={`Quantity shipping for ${line.sku}`}
                      value={String(line.qtyShipped)}
                      onChange={(event) =>
                        onUpdate(line.salesOrderLineId, {
                          qtyShipped: Math.min(
                            line.outstanding,
                            Math.max(0, Number(event.target.value) || 0),
                          ),
                        })
                      }
                      className="h-7 w-24"
                    />
                  </td>
                  <td className="h-row border-b border-border px-3 text-right">
                    {short === 0 ? (
                      <span className="font-mono text-ink-muted">—</span>
                    ) : (
                      <Figure value={short} tone="variance" weight="medium" />
                    )}
                  </td>
                  <td className="h-row border-b border-border px-3">
                    {short > 0 && line.qtyShipped > 0 ? (
                      <Select
                        value={line.shortReason}
                        onValueChange={(value) => {
                          if (typeof value === "string") {
                            onUpdate(line.salesOrderLineId, { shortReason: value });
                          }
                        }}
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label="Short reason"
                          aria-invalid={line.shortReason === "" || undefined}
                          className="w-full"
                        >
                          <SelectValue placeholder="Why short?" />
                        </SelectTrigger>
                        <SelectContent>
                          {SHORT_REASONS.map((reason) => (
                            <SelectItem key={reason} value={reason}>
                              {reason}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-ink-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {missingReason && (
        <p className="border-t border-border px-4 py-2.5 text-sm text-overdue">
          Every short line needs a reason — the clerk reading this next week will want to
          know why.
        </p>
      )}
    </Card>
  );
}
