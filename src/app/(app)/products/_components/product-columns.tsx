"use client";

import type { ColumnDef } from "@tanstack/react-table";

import type { ProductListRow } from "@/lib/api";
import { formatPercent } from "@/lib/format";
import { PRODUCT_CATEGORY_LABEL } from "@/types/product";
import {
  codeColumn,
  moneyColumn,
  qtyColumn,
} from "@/components/distrix/data-table/columns";
import { Figure } from "@/components/distrix/money";
import { StockIndicator } from "@/components/distrix/stock-indicator";

/** Every stock figure in this table is scoped by the top-bar warehouse. */
export function productColumns(): ColumnDef<ProductListRow>[] {
  return [
    codeColumn({ id: "sku", label: "SKU", accessor: (row) => row.sku, width: "10rem" }),
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: "Product",
      meta: { label: "Product", priority: "essential" },
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-ink">{row.original.name}</span>
          <span className="truncate text-xs text-ink-muted">
            {PRODUCT_CATEGORY_LABEL[row.original.category]}
            {row.original.isImported && " · Imported"}
          </span>
        </div>
      ),
    },
    qtyColumn({
      id: "onHand",
      label: "On hand",
      accessor: (row) => row.onHand,
      priority: "secondary",
    }),
    qtyColumn({
      id: "reserved",
      label: "Reserved",
      accessor: (row) => row.reserved,
      tone: "muted",
      priority: "secondary",
    }),
    {
      id: "available",
      accessorFn: (row) => row.available,
      header: "Available",
      meta: {
        label: "Available",
        align: "right",
        mono: true,
        width: "8rem",
        priority: "essential",
        exportValue: (row) => row.available,
      },
      cell: ({ row }) => (
        <StockIndicator
          available={row.original.available}
          reorderPoint={row.original.reorderPoint}
          health={row.original.health}
        />
      ),
    },
    {
      id: "incoming",
      accessorFn: (row) => row.incoming,
      header: "Incoming",
      meta: {
        label: "Incoming",
        align: "right",
        mono: true,
        width: "7rem",
        priority: "secondary",
        exportValue: (row) => row.incoming,
      },
      cell: ({ row }) =>
        row.original.incoming === 0 ? (
          <span className="font-mono text-ink-muted">—</span>
        ) : (
          <Figure value={row.original.incoming} tone="accent" />
        ),
    },
    qtyColumn({
      id: "reorderPoint",
      label: "Reorder pt.",
      accessor: (row) => row.reorderPoint,
      tone: "muted",
      priority: "secondary",
    }),
    moneyColumn({
      id: "standardCost",
      label: "Std. cost",
      accessor: (row) => row.standardCost,
      priority: "secondary",
    }),
    moneyColumn({ id: "listPrice", label: "List price", accessor: (row) => row.listPrice }),
    {
      id: "marginPct",
      accessorFn: (row) => row.marginPct,
      header: "Margin",
      meta: {
        label: "Margin",
        align: "right",
        mono: true,
        width: "6.5rem",
        priority: "secondary",
        exportValue: (row) => row.marginPct.toFixed(1),
      },
      cell: ({ row }) => (
        <span
          className={
            row.original.marginPct < 15 ? "font-mono text-partial" : "font-mono text-ink"
          }
        >
          {formatPercent(row.original.marginPct)}
        </span>
      ),
    },
  ];
}

