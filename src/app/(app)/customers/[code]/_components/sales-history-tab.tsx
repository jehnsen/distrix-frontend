"use client";

import Link from "next/link";
import {
  Banknote,
  FileText,
  ReceiptText,
  ShoppingCart,
  Truck,
  Undo2,
} from "lucide-react";

import { getCustomerLedger, type LedgerEntry, type LedgerKind } from "@/lib/api";
import { formatDate, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApiQuery } from "@/hooks/use-api-query";
import { Money } from "@/components/distrix/money";
import { Card } from "@/components/distrix/primitives";
import { StatusPill, type StatusKey } from "@/components/distrix/status-pill";
import { ErrorState, PanelSkeleton } from "@/components/distrix/states";

const KIND_ICON: Record<LedgerKind, typeof ShoppingCart> = {
  order: ShoppingCart,
  delivery: Truck,
  invoice: FileText,
  payment: Banknote,
  credit_note: ReceiptText,
  return: Undo2,
};

const KIND_LABEL: Record<LedgerKind, string> = {
  order: "Order",
  delivery: "Delivery",
  invoice: "Invoice",
  payment: "Payment",
  credit_note: "Credit note",
  return: "Return",
};

/** Documents that move money get an accent rail; the rest are context. */
const AFFECTS_BALANCE: Record<LedgerKind, boolean> = {
  order: false,
  delivery: false,
  invoice: true,
  payment: true,
  credit_note: true,
  return: false,
};

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const Icon = KIND_ICON[entry.kind];
  const money = AFFECTS_BALANCE[entry.kind];

  return (
    <tr className="group/row transition-colors hover:bg-surface-sunken">
      <td className="h-row border-b border-border px-3 whitespace-nowrap">
        <time dateTime={entry.date} className="font-mono text-ink tabular-nums">
          {formatDate(entry.date)}
        </time>
      </td>
      <td className="h-row border-b border-border px-3">
        <span className="inline-flex items-center gap-2">
          <Icon
            aria-hidden
            size={16}
            strokeWidth={1.75}
            className={money ? "text-accent" : "text-ink-muted"}
          />
          <span className="text-sm text-ink-muted">{KIND_LABEL[entry.kind]}</span>
        </span>
      </td>
      <td className="h-row border-b border-border px-3">
        <Link
          href={entry.href}
          className="font-mono font-medium text-ink underline-offset-2 hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          {entry.docNo}
        </Link>
      </td>
      <td className="h-row max-w-64 truncate border-b border-border px-3 text-ink-muted">
        {entry.description}
      </td>
      <td className="h-row border-b border-border px-3 text-right font-mono text-ink-muted tabular-nums">
        {entry.qty === undefined ? "—" : formatQty(entry.qty)}
      </td>
      <td className="h-row border-b border-border px-3 text-right">
        {entry.debit === 0 ? (
          <span className="font-mono text-ink-muted">—</span>
        ) : (
          <Money amount={entry.debit} />
        )}
      </td>
      <td className="h-row border-b border-border px-3 text-right">
        {entry.credit === 0 ? (
          <span className="font-mono text-ink-muted">—</span>
        ) : (
          <Money amount={entry.credit} tone="accent" />
        )}
      </td>
      <td
        className={cn(
          "h-row border-b border-border px-3 text-right",
          money && "bg-surface-sunken/50",
        )}
      >
        {entry.runningBalance === undefined ? (
          <span className="font-mono text-ink-muted">—</span>
        ) : (
          <Money amount={entry.runningBalance} weight="medium" />
        )}
      </td>
      <td className="h-row border-b border-border px-3">
        <StatusPill status={entry.status as StatusKey} />
      </td>
    </tr>
  );
}

/**
 * Orders, deliveries, invoices, payments and credit notes as one chronological
 * ledger with a running balance (§7). Documents that do not move money still
 * appear — the delivery that explains an invoice belongs next to it.
 */
export function SalesHistoryTab({ customerId }: { customerId: string }) {
  const { data, error, isInitialLoading, refetch } = useApiQuery(
    `ledger:${customerId}`,
    () => getCustomerLedger(customerId),
  );

  if (error) {
    return (
      <Card padded={false}>
        <ErrorState what="the sales history" detail={error.message} onRetry={refetch} />
      </Card>
    );
  }

  if (isInitialLoading || !data) {
    return (
      <Card>
        <PanelSkeleton lines={10} />
      </Card>
    );
  }

  return (
    <Card padded={false}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] border-separate border-spacing-0 text-base">
          <thead className="sticky top-topbar z-10">
            <tr>
              {[
                ["Date", "left"],
                ["Type", "left"],
                ["Document", "left"],
                ["Detail", "left"],
                ["Qty", "right"],
                ["Charge", "right"],
                ["Credit", "right"],
                ["Balance", "right"],
                ["Status", "left"],
              ].map(([label, align]) => (
                <th
                  key={label}
                  scope="col"
                  className={cn(
                    "th-label h-8 border-b border-border bg-surface-sunken px-3",
                    align === "right" && "text-right",
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <LedgerRow key={`${entry.kind}-${entry.id}`} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-3 py-2 text-sm text-ink-muted">
        <span className="font-mono tabular-nums">{data.length}</span> entries · the balance
        column moves only on invoices, payments and credit notes.
      </p>
    </Card>
  );
}
