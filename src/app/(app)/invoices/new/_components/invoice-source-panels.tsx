"use client";

import type { DeliveryReceipt, InvoiceLine } from "@/types";
import { formatDate, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Figure } from "@/components/distrix/money";
import { Card, CardHeader } from "@/components/distrix/primitives";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * What is being billed and what it comes to. Quantities are what the customer
 * accepted at the gate, which is not always what left the warehouse.
 */
export function InvoiceSourcePanels({
  billable,
  chosen,
  previewLines,
  onToggle,
}: {
  billable: DeliveryReceipt[];
  chosen: Set<string>;
  previewLines: InvoiceLine[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
            <Card padded={false}>
              <CardHeader
                title="Delivery receipts to bill"
                description="Quantities come from what the customer accepted, not what left the warehouse."
              />
              <ul role="list" className="divide-y divide-border">
                {billable.map((dr) => {
                  const shipped = dr.lines.reduce((acc, line) => acc + line.qtyShipped, 0);
                  const accepted = dr.lines.reduce(
                    (acc, line) => acc + (line.qtyAccepted ?? line.qtyShipped),
                    0,
                  );
                  return (
                    <li key={dr.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-sunken">
                        <Checkbox
                          checked={chosen.has(dr.id)}
                          onCheckedChange={() => onToggle(dr.id)}
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="font-mono font-medium text-ink">{dr.drNo}</span>
                          <span className="text-xs text-ink-muted">
                            Delivered {formatDate(dr.deliveryDate)} · {dr.driver}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <Figure
                            value={accepted}
                            weight="medium"
                            tone={accepted < shipped ? "variance" : "plain"}
                          />
                          <span className="block text-xs text-ink-muted">
                            {accepted < shipped
                              ? `accepted of ${formatQty(shipped)}`
                              : "units accepted"}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </Card>

            {previewLines.length > 0 && (
              <Card padded={false}>
                <CardHeader
                  title="Lines to be billed"
                  description={`${previewLines.length} line(s) from ${chosen.size} receipt(s).`}
                />
                <table className="w-full border-separate border-spacing-0 text-base">
                  <thead>
                    <tr>
                      {["SKU", "Product", "Qty", "Unit price", "Line total"].map(
                        (label, index) => (
                          <th
                            key={label}
                            scope="col"
                            className={cn(
                              "th-label h-8 border-b border-border bg-surface-sunken px-3",
                              index >= 2 && "text-right",
                            )}
                          >
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewLines.map((line) => (
                      <tr key={line.id} className="hover:bg-surface-sunken">
                        <td className="h-row border-b border-border px-3 font-mono font-medium">
                          {line.sku}
                        </td>
                        <td className="h-row max-w-72 truncate border-b border-border px-3">
                          {line.description}
                        </td>
                        <td className="h-row border-b border-border px-3 text-right">
                          <Figure value={line.qty} unit={line.uom} />
                        </td>
                        <td className="h-row border-b border-border px-3 text-right font-mono tabular-nums">
                          {(line.unitPrice / 100).toFixed(2)}
                        </td>
                        <td className="h-row border-b border-border px-3 text-right font-mono font-medium tabular-nums">
                          {(line.lineTotal / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
    </div>
  );
}
