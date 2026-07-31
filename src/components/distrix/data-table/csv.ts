import type { Table } from "@tanstack/react-table";

function escapeCell(value: unknown): string {
  if (value == null) return "";
  const text = String(value);
  // A leading =, +, - or @ turns a cell into a formula in Excel and Sheets.
  const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

/**
 * Exports what the user is currently looking at — visible columns, current
 * sort, current filters — not the whole dataset. Amounts export as plain
 * decimals so the receiving spreadsheet can total them.
 */
export function tableToCsv<TData>(table: Table<TData>): string {
  const columns = table
    .getVisibleLeafColumns()
    .filter((column) => column.columnDef.meta?.noExport !== true);

  const header = columns.map((column) =>
    escapeCell(column.columnDef.meta?.label ?? column.id),
  );

  const rows = table.getRowModel().rows.map((row) =>
    columns.map((column) => {
      const exportValue = column.columnDef.meta?.exportValue;
      if (exportValue) return escapeCell(exportValue(row.original));
      return escapeCell(row.getValue(column.id));
    }),
  );

  return [header, ...rows].map((cells) => cells.join(",")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM so Excel on Windows reads ₱ and ñ correctly.
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
