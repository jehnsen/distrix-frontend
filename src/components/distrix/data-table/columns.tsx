"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { formatDate, formatMoney, formatQty, isoDate } from "@/lib/format";
import type { Centavos } from "@/lib/money";
import { Absent, Figure, Money, type FigureTone } from "@/components/distrix/money";
import { StatusPill, statusLabel, type StatusKey } from "@/components/distrix/status-pill";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Column factories. Every numeric column in the app comes from here, which is
 * how right-alignment and mono figures stay guaranteed rather than remembered.
 */

export function selectColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    size: 36,
    enableSorting: false,
    enableHiding: false,
    meta: { noExport: true, width: "36px", priority: "essential" },
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked === true)}
        aria-label="Select all rows on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onCheckedChange={(checked) => row.toggleSelected(checked === true)}
        aria-label="Select row"
        // The row itself is clickable; the checkbox must not trigger it.
        onClick={(event) => event.stopPropagation()}
      />
    ),
  };
}

interface MoneyColumnOptions<TData> {
  id: string;
  label: string;
  accessor: (row: TData) => Centavos;
  tone?: FigureTone | ((row: TData) => FigureTone);
  width?: string;
  priority?: "essential" | "secondary";
  enableSorting?: boolean;
}

export function moneyColumn<TData>({
  id,
  label,
  accessor,
  tone = "plain",
  width = "8.5rem",
  priority = "essential",
  enableSorting = true,
}: MoneyColumnOptions<TData>): ColumnDef<TData> {
  return {
    id,
    accessorFn: accessor,
    header: label,
    enableSorting,
    sortingFn: "basic",
    meta: {
      label,
      align: "right",
      mono: true,
      width,
      priority,
      exportValue: (row) => (accessor(row) / 100).toFixed(2),
    },
    cell: ({ row }) => {
      const amount = accessor(row.original);
      const resolved = typeof tone === "function" ? tone(row.original) : tone;
      return <Money amount={amount} tone={resolved} />;
    },
  };
}

interface QtyColumnOptions<TData> {
  id: string;
  label: string;
  accessor: (row: TData) => number;
  unit?: string;
  decimals?: number;
  tone?: FigureTone | ((row: TData) => FigureTone);
  width?: string;
  priority?: "essential" | "secondary";
}

export function qtyColumn<TData>({
  id,
  label,
  accessor,
  unit,
  decimals = 0,
  tone = "plain",
  width = "6rem",
  priority = "essential",
}: QtyColumnOptions<TData>): ColumnDef<TData> {
  return {
    id,
    accessorFn: accessor,
    header: label,
    sortingFn: "basic",
    meta: {
      label,
      align: "right",
      mono: true,
      width,
      priority,
      exportValue: (row) => accessor(row),
    },
    cell: ({ row }) => {
      const value = accessor(row.original);
      const resolved = typeof tone === "function" ? tone(row.original) : tone;
      return <Figure value={value} unit={unit} decimals={decimals} tone={resolved} />;
    },
  };
}

interface CodeColumnOptions<TData> {
  id: string;
  label: string;
  accessor: (row: TData) => string;
  width?: string;
  priority?: "essential" | "secondary";
}

/** Document numbers, SKUs, customer codes — mono, left-aligned, medium. */
export function codeColumn<TData>({
  id,
  label,
  accessor,
  width = "9rem",
  priority = "essential",
}: CodeColumnOptions<TData>): ColumnDef<TData> {
  return {
    id,
    accessorFn: accessor,
    header: label,
    meta: {
      label,
      mono: true,
      width,
      priority,
      exportValue: (row) => accessor(row),
    },
    cell: ({ row }) => (
      <span className="font-mono font-medium text-ink tabular-nums">
        {accessor(row.original)}
      </span>
    ),
  };
}

interface DateColumnOptions<TData> {
  id: string;
  label: string;
  accessor: (row: TData) => string | Date | null;
  width?: string;
  priority?: "essential" | "secondary";
}

export function dateColumn<TData>({
  id,
  label,
  accessor,
  width = "7.5rem",
  priority = "essential",
}: DateColumnOptions<TData>): ColumnDef<TData> {
  return {
    id,
    accessorFn: (row) => {
      const value = accessor(row);
      return value ? new Date(value).getTime() : 0;
    },
    header: label,
    sortingFn: "basic",
    meta: {
      label,
      mono: true,
      width,
      priority,
      exportValue: (row) => {
        const value = accessor(row);
        return value ? isoDate(value).slice(0, 10) : "";
      },
    },
    cell: ({ row }) => {
      const value = accessor(row.original);
      if (!value) return <Absent />;
      return (
        <time dateTime={isoDate(value)} className="font-mono text-ink tabular-nums">
          {formatDate(value)}
        </time>
      );
    },
  };
}

interface StatusColumnOptions<TData> {
  id?: string;
  label?: string;
  accessor: (row: TData) => StatusKey;
  width?: string;
}

export function statusColumn<TData>({
  id = "status",
  label = "Status",
  accessor,
  width = "9rem",
}: StatusColumnOptions<TData>): ColumnDef<TData> {
  return {
    id,
    accessorFn: accessor,
    header: label,
    meta: {
      label,
      width,
      priority: "essential",
      exportValue: (row) => statusLabel(accessor(row)),
    },
    cell: ({ row }) => <StatusPill status={accessor(row.original)} />,
  };
}

/** Re-exported so callers building bespoke cells still format consistently. */
export { formatDate, formatMoney, formatQty };
