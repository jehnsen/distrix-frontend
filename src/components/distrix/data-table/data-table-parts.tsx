"use client";

import { flexRender, type Row, type Table } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The header and body of <DataTable>. Split out so the container keeps to the
 * state wiring and these keep to the markup — alignment and mono come from
 * column meta in both.
 */

export function DataTableHead<TData>({
  table,
  stickyLeft,
}: {
  table: Table<TData>;
  stickyLeft: Map<string, number>;
}) {
  return (
    <thead className="sticky top-0 z-10">
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            const meta = header.column.columnDef.meta;
            const sorted = header.column.getIsSorted();
            const left = stickyLeft.get(header.column.id);
            const sortable = header.column.getCanSort();

            return (
              <th
                key={header.id}
                scope="col"
                aria-sort={
                  sorted === "asc"
                    ? "ascending"
                    : sorted === "desc"
                      ? "descending"
                      : sortable
                        ? "none"
                        : undefined
                }
                style={{ width: meta?.width, left }}
                className={cn(
                  "th-label group/th h-8 border-b border-border bg-surface-sunken px-3 py-0 whitespace-nowrap",
                  meta?.align === "right" && "text-right",
                  meta?.align === "center" && "text-center",
                  left !== undefined && "sticky z-10",
                )}
              >
                {header.isPlaceholder ? null : sortable ? (
                  <button
                    type="button"
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                      "inline-flex h-8 w-full items-center gap-1 outline-none transition-colors",
                      "hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                      meta?.align === "right" && "justify-end",
                      meta?.align === "center" && "justify-center",
                      sorted && "text-ink",
                    )}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {sorted === "asc" ? (
                      <ArrowUp size={12} strokeWidth={2} />
                    ) : sorted === "desc" ? (
                      <ArrowDown size={12} strokeWidth={2} />
                    ) : (
                      <ChevronsUpDown
                        size={12}
                        strokeWidth={2}
                        className="opacity-0 transition-opacity group-hover/th:opacity-40"
                      />
                    )}
                  </button>
                ) : (
                  <span className="inline-flex h-8 items-center">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </span>
                )}
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
  );
}

export function DataTableRow<TData>({
  row,
  active,
  stickyLeft,
  onOpen,
}: {
  row: Row<TData>;
  active: boolean;
  stickyLeft: Map<string, number>;
  onOpen?: ((row: TData) => void) | undefined;
}) {
  const selected = row.getIsSelected();

  return (
    <tr
      data-selected={selected || undefined}
      data-active={active || undefined}
      onClick={onOpen ? () => onOpen(row.original) : undefined}
      className={cn(
        "group/row transition-colors duration-[120ms]",
        onOpen && "cursor-pointer",
        // Hairline row borders, no zebra: density comes from row height.
        selected ? "bg-accent-wash" : "bg-surface hover:bg-surface-sunken",
        active && !selected && "bg-accent-wash/60",
      )}
    >
      {row.getVisibleCells().map((cell) => {
        const meta = cell.column.columnDef.meta;
        const left = stickyLeft.get(cell.column.id);
        return (
          <td
            key={cell.id}
            style={{ left }}
            className={cn(
              "h-row border-b border-border px-3 align-middle",
              meta?.align === "right" && "text-right",
              meta?.align === "center" && "text-center",
              meta?.mono && "font-mono tabular-nums",
              left !== undefined && "sticky z-[1] bg-inherit",
            )}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        );
      })}
    </tr>
  );
}
