"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { AGING_BUCKETS, agingOverdueTotal } from "@/lib/aging";
import type { CustomerListRow } from "@/lib/api";
import { termsLabel } from "@/types/common";
import { creditUtilisation } from "@/types/customer";
import { CUSTOMER_SEGMENT_LABEL } from "@/types/customer";
import { cn } from "@/lib/utils";
import { Money } from "@/components/distrix/money";
import {
  codeColumn,
  dateColumn,
  moneyColumn,
} from "@/components/distrix/data-table/columns";
import { UtilisationBar } from "@/components/distrix/utilisation-bar";

/**
 * The worst bucket a customer has money sitting in. A single chip says more
 * about an account than five bucket columns would.
 */
function WorstBucket({ row }: { row: CustomerListRow }) {
  const worst = [...AGING_BUCKETS]
    .reverse()
    .find((bucket) => row.aging[bucket.key].amount > 0);

  if (!worst) {
    return <span className="font-mono text-xs text-ink-muted">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("size-1.5 rounded-full", worst.fill)} />
      <span className={cn("font-mono text-xs", worst.text)}>{worst.label}</span>
    </span>
  );
}

export function customerColumns(): ColumnDef<CustomerListRow>[] {
  return [
    codeColumn({
      id: "code",
      label: "Code",
      accessor: (row) => row.code,
      width: "6rem",
    }),
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: "Customer",
      meta: { label: "Customer", priority: "essential" },
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-ink">{row.original.name}</span>
          <span className="truncate text-xs text-ink-muted">
            {CUSTOMER_SEGMENT_LABEL[row.original.segment]} · {row.original.address.city}
          </span>
        </div>
      ),
    },
    {
      id: "salesRep",
      accessorFn: (row) => row.salesRepName,
      header: "Sales rep",
      meta: { label: "Sales rep", width: "10rem", priority: "secondary" },
    },
    {
      id: "terms",
      accessorFn: (row) => row.terms,
      header: "Terms",
      meta: {
        label: "Terms",
        width: "6rem",
        priority: "secondary",
        exportValue: (row) => termsLabel(row.terms),
      },
      cell: ({ row }) => (
        <span className="font-mono text-sm text-ink-muted">
          {row.original.terms === "COD" ? "COD" : `${row.original.terms}d`}
        </span>
      ),
    },
    moneyColumn({
      id: "creditLimit",
      label: "Credit limit",
      accessor: (row) => row.creditLimit,
      priority: "secondary",
    }),
    moneyColumn({
      id: "balance",
      label: "Balance",
      accessor: (row) => row.currentBalance,
      tone: (row) => (row.currentBalance > row.creditLimit ? "variance" : "plain"),
    }),
    {
      id: "utilisation",
      accessorFn: (row) => creditUtilisation(row),
      header: "Utilisation",
      meta: {
        label: "Utilisation",
        width: "9rem",
        priority: "essential",
        exportValue: (row) => `${Math.round(creditUtilisation(row) * 100)}%`,
      },
      cell: ({ row }) => <UtilisationBar value={creditUtilisation(row.original)} />,
    },
    {
      id: "bucket",
      accessorFn: (row) => agingOverdueTotal(row.aging),
      header: "Worst bucket",
      meta: {
        label: "Worst bucket",
        width: "8rem",
        priority: "essential",
        exportValue: (row) =>
          [...AGING_BUCKETS].reverse().find((b) => row.aging[b.key].amount > 0)?.label ?? "",
      },
      cell: ({ row }) => <WorstBucket row={row.original} />,
    },
    {
      id: "overdue",
      accessorFn: (row) => agingOverdueTotal(row.aging),
      header: "Past due",
      meta: {
        label: "Past due",
        align: "right",
        mono: true,
        width: "8.5rem",
        priority: "essential",
        exportValue: (row) => (agingOverdueTotal(row.aging) / 100).toFixed(2),
      },
      cell: ({ row }) => {
        const overdue = agingOverdueTotal(row.original.aging);
        return <Money amount={overdue} tone={overdue === 0 ? "muted" : "variance"} />;
      },
    },
    dateColumn({
      id: "lastOrderDate",
      label: "Last order",
      accessor: (row) => row.lastOrderDate,
    }),
  ];
}
