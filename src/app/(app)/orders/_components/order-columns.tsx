"use client";

import type { ColumnDef } from "@tanstack/react-table";

import type { OrderListRow } from "@/lib/api";
import { termsLabel } from "@/types/common";
import {
  codeColumn,
  dateColumn,
  moneyColumn,
  statusColumn,
} from "@/components/distrix/data-table/columns";
import { ProgressBar } from "@/components/distrix/utilisation-bar";

/** Fulfilment progress is the column the sales admin actually scans for. */
export function orderColumns(): ColumnDef<OrderListRow>[] {
  return [
    codeColumn({ id: "soNo", label: "Order no.", accessor: (row) => row.soNo }),
    {
      id: "customer",
      accessorFn: (row) => row.customerName,
      header: "Customer",
      meta: { label: "Customer", priority: "essential" },
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-ink">{row.original.customerName}</span>
          <span className="font-mono text-xs text-ink-muted">
            {row.original.customerCode}
            {row.original.customerRef ? ` · ${row.original.customerRef}` : ""}
          </span>
        </div>
      ),
    },
    dateColumn({ id: "orderDate", label: "Ordered", accessor: (row) => row.orderDate }),
    dateColumn({
      id: "requiredDate",
      label: "Required",
      accessor: (row) => row.requiredDate,
    }),
    {
      id: "warehouse",
      accessorFn: (row) => row.warehouseCode,
      header: "WH",
      meta: { label: "Warehouse", width: "5rem", priority: "secondary" },
      cell: ({ row }) => (
        <span className="font-mono text-sm text-ink-muted">
          {row.original.warehouseCode}
        </span>
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
        width: "5.5rem",
        priority: "secondary",
        exportValue: (row) => termsLabel(row.terms),
      },
      cell: ({ row }) => (
        <span className="font-mono text-sm text-ink-muted">
          {row.original.terms === "COD" ? "COD" : `${row.original.terms}d`}
        </span>
      ),
    },
    {
      id: "progress",
      accessorFn: (row) => row.progress,
      header: "Fulfilled",
      meta: {
        label: "Fulfilled",
        width: "9rem",
        priority: "essential",
        exportValue: (row) => `${Math.round(row.progress * 100)}%`,
      },
      cell: ({ row }) => (
        <ProgressBar value={row.original.progress} label="Fulfilment progress" />
      ),
    },
    moneyColumn({ id: "total", label: "Total", accessor: (row) => row.total }),
    statusColumn({ accessor: (row) => row.status }),
  ];
}
