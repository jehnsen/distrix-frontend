"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import { useHotkey } from "@/hooks/use-hotkey";
import { ErrorState, LoadingAnnouncer, TableSkeleton } from "@/components/distrix/states";
import { BulkActionBar } from "@/components/distrix/data-table/bulk-action-bar";
import {
  DataTableHead,
  DataTableRow,
} from "@/components/distrix/data-table/data-table-parts";
import { DataTablePagination } from "@/components/distrix/data-table/data-table-pagination";
import { DataTableToolbar } from "@/components/distrix/data-table/data-table-toolbar";
import type { SavedView } from "@/components/distrix/data-table/types";

const SELECT_COLUMN_WIDTH = 36;

export interface DataTablePaginationState {
  pageIndex: number;
  pageSize: number;
  total: number;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  getRowId: (row: TData) => string;
  /** Named by the loading and error states, e.g. "open invoices". */
  what: string;
  exportFilename: string;

  isLoading?: boolean;
  error?: { message: string } | null;
  onRetry?: () => void;
  /** Rendered when `data` is empty: EmptyState or NoResultsState. */
  emptyState?: React.ReactNode;

  onRowOpen?: (row: TData) => void;
  enableSelection?: boolean;
  bulkActions?: (rows: TData[], clear: () => void) => React.ReactNode;

  savedViews?: SavedView[];
  basePath?: string;
  toolbar?: React.ReactNode;
  pagination?: DataTablePaginationState;
  /** Pins the selection and first data column while scrolling horizontally. */
  stickyFirstColumn?: boolean;
  className?: string;
}

/**
 * Every data grid in Distrix. Sticky header, optional sticky first column,
 * hairline row borders and no zebra striping — density comes from row height,
 * not from alternating fills. Numeric alignment is driven by column meta.
 */
export function DataTable<TData>({
  data,
  columns,
  getRowId,
  what,
  exportFilename,
  isLoading = false,
  error = null,
  onRetry,
  emptyState,
  onRowOpen,
  enableSelection = false,
  bulkActions,
  savedViews,
  basePath,
  toolbar,
  pagination,
  stickyFirstColumn = false,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [activeIndex, setActiveIndex] = useState(-1);
  const bodyRef = useRef<HTMLTableSectionElement>(null);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => getRowId(row),
    enableRowSelection: enableSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Pagination is the caller's (i.e. the server's) business.
    manualPagination: true,
  });

  const rows = table.getRowModel().rows;
  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
  const visibleLeafColumns = table.getVisibleLeafColumns();

  /* --- j / k / Enter row navigation (§5) -------------------------------- */
  useHotkey("j", () => setActiveIndex((i) => Math.min(rows.length - 1, i + 1)), {
    enabled: rows.length > 0,
  });
  useHotkey("k", () => setActiveIndex((i) => Math.max(0, i - 1)), {
    enabled: rows.length > 0,
  });
  useHotkey(
    "Enter",
    () => {
      const row = rows[activeIndex];
      if (row && onRowOpen) onRowOpen(row.original);
    },
    { enabled: activeIndex >= 0 && Boolean(onRowOpen) },
  );

  useEffect(() => {
    if (activeIndex < 0) return;
    bodyRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Reset the cursor when the underlying rows change beneath it.
  useEffect(() => setActiveIndex(-1), [data]);

  /** Left offsets for the pinned columns: selection, then the first data one. */
  const stickyLeft = useMemo(() => {
    const map = new Map<string, number>();
    if (!stickyFirstColumn) return map;
    let offset = 0;
    for (const column of visibleLeafColumns.slice(0, enableSelection ? 2 : 1)) {
      map.set(column.id, offset);
      offset += column.id === "select" ? SELECT_COLUMN_WIDTH : 0;
    }
    return map;
  }, [stickyFirstColumn, enableSelection, visibleLeafColumns]);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-raised",
        className,
      )}
    >
      <DataTableToolbar
        table={table}
        savedViews={savedViews}
        basePath={basePath}
        exportFilename={exportFilename}
      >
        {toolbar}
      </DataTableToolbar>

      {error ? (
        <ErrorState what={what} detail={error.message} onRetry={onRetry} />
      ) : isLoading ? (
        <>
          <LoadingAnnouncer what={what} />
          <TableSkeleton columns={visibleLeafColumns.length} />
        </>
      ) : rows.length === 0 ? (
        emptyState
      ) : (
        <div className="relative overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-base">
            <DataTableHead table={table} stickyLeft={stickyLeft} />
            <tbody ref={bodyRef}>
              {rows.map((row, index) => (
                <DataTableRow
                  key={row.id}
                  row={row}
                  active={index === activeIndex}
                  stickyLeft={stickyLeft}
                  onOpen={onRowOpen}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {enableSelection && bulkActions && (
        <BulkActionBar count={selectedRows.length} onClear={() => setRowSelection({})}>
          {bulkActions(selectedRows, () => setRowSelection({}))}
        </BulkActionBar>
      )}

      {pagination && !isLoading && !error && (
        <DataTablePagination
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      )}
    </div>
  );
}
