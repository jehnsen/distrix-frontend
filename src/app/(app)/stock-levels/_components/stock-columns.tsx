"use client";

import type { ColumnDef } from "@tanstack/react-table";

import type { StockLevelRow } from "@/lib/api";
import {
  codeColumn,
  moneyColumn,
  qtyColumn,
} from "@/components/distrix/data-table/columns";
import { Figure } from "@/components/distrix/money";
import { StockIndicator } from "@/components/distrix/stock-indicator";

/** One row per product per warehouse, valued at standard cost. */
export function stockColumns(): ColumnDef<StockLevelRow>[] {
  return [
    codeColumn({ id: "sku", label: "SKU", accessor: (row) => row.sku, width: "10rem" }),
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: "Product",
      meta: { label: "Product", priority: "essential" },
    },
    {
      id: "warehouse",
      accessorFn: (row) => row.warehouseCode,
      header: "Warehouse",
      meta: { label: "Warehouse", width: "7rem", priority: "essential" },
      cell: ({ row }) => (
        <span className="font-mono text-sm text-ink-muted">{row.original.warehouseCode}</span>
      ),
    },
    qtyColumn({ id: "onHand", label: "On hand", accessor: (row) => row.onHand }),
    qtyColumn({
      id: "reserved",
      label: "Reserved",
      accessor: (row) => row.reserved,
      tone: "muted",
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
      id: "stockValue",
      label: "Stock value",
      accessor: (row) => row.stockValue,
    }),
  ];
}

