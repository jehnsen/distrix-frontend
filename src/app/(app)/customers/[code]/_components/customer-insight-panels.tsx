"use client";

import Link from "next/link";

import { getCustomerActivity, getCustomerProductSummary } from "@/lib/api";
import { formatDate, formatQty, initials, relativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApiQuery } from "@/hooks/use-api-query";
import { Money } from "@/components/distrix/money";
import { Card, CardHeader } from "@/components/distrix/primitives";
import { ErrorState, PanelSkeleton } from "@/components/distrix/states";

/**
 * The two panels that ask a question of the whole account rather than showing a
 * field on it: what this customer buys, and everything that has happened to it.
 */

/* --- What they buy ------------------------------------------------------ */

export function PurchaseSummaryPanel({ customerId }: { customerId: string }) {
  const { data, error, isInitialLoading, refetch } = useApiQuery(
    `purchases:${customerId}`,
    () => getCustomerProductSummary(customerId),
  );

  if (error) {
    return (
      <Card padded={false}>
        <ErrorState what="the purchase summary" detail={error.message} onRetry={refetch} />
      </Card>
    );
  }
  if (isInitialLoading || !data) {
    return (
      <Card>
        <PanelSkeleton lines={8} />
      </Card>
    );
  }

  return (
    <Card padded={false}>
      <CardHeader
        title="What they buy"
        description={`${data.length} SKUs invoiced, ranked by value.`}
      />
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-base">
          <thead>
            <tr>
              {["SKU", "Product", "Qty", "Value", "Share", "Invoices", "Last bought"].map(
                (label, index) => (
                  <th
                    key={label}
                    scope="col"
                    className={cn(
                      "th-label h-8 border-b border-border bg-surface-sunken px-3",
                      index >= 2 && index <= 5 && "text-right",
                    )}
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.productId} className="transition-colors hover:bg-surface-sunken">
                <td className="h-row border-b border-border px-3">
                  <Link
                    href={`/products/${row.sku}`}
                    className="font-mono font-medium text-ink underline-offset-2 hover:text-accent hover:underline"
                  >
                    {row.sku}
                  </Link>
                </td>
                <td className="h-row max-w-72 truncate border-b border-border px-3">
                  {row.description}
                </td>
                <td className="h-row border-b border-border px-3 text-right font-mono tabular-nums">
                  {formatQty(row.qty)}{" "}
                  <span className="text-ink-muted">{row.uom}</span>
                </td>
                <td className="h-row border-b border-border px-3 text-right">
                  <Money amount={row.value} />
                </td>
                <td className="h-row border-b border-border px-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span
                      aria-hidden
                      className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-sunken"
                    >
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${Math.min(100, row.share * 100)}%` }}
                      />
                    </span>
                    <span className="w-9 font-mono text-xs text-ink-muted tabular-nums">
                      {(row.share * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="h-row border-b border-border px-3 text-right font-mono text-ink-muted tabular-nums">
                  {row.orderCount}
                </td>
                <td className="h-row border-b border-border px-3 font-mono text-ink-muted tabular-nums">
                  {formatDate(row.lastOrdered)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* --- Activity ----------------------------------------------------------- */

export function ActivityPanel({ customerId }: { customerId: string }) {
  const { data, error, isInitialLoading, refetch } = useApiQuery(
    `activity:${customerId}`,
    () => getCustomerActivity(customerId),
  );

  if (error) {
    return (
      <Card padded={false}>
        <ErrorState what="the activity log" detail={error.message} onRetry={refetch} />
      </Card>
    );
  }
  if (isInitialLoading || !data) {
    return (
      <Card>
        <PanelSkeleton lines={8} />
      </Card>
    );
  }

  return (
    <Card padded={false}>
      <CardHeader title="Activity" description="Newest first, across every document." />
      {data.length === 0 ? (
        <p className="px-4 py-10 text-center text-base text-ink-muted">
          Nothing has happened on this account yet.
        </p>
      ) : (
        <ol role="list" className="flex flex-col px-4 py-3">
          {data.map((entry, index) => (
            <li key={entry.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden
                  className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-sunken text-xs font-medium text-ink-muted"
                >
                  {initials(entry.actorName)}
                </span>
                {index < data.length - 1 && (
                  <span aria-hidden className="w-px flex-1 bg-border" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-4">
                <p className="text-base text-ink">
                  <span className="font-medium">{entry.actorName}</span> {entry.action}
                </p>
                {entry.detail && <p className="text-sm text-ink-muted">{entry.detail}</p>}
                <p className="font-mono text-xs text-ink-muted">{relativeDay(entry.at)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
