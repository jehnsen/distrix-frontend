import type { RowData } from "@tanstack/react-table";

/**
 * Column metadata drives alignment, mono rendering, the column-visibility menu
 * and CSV export from one declaration, so a numeric column cannot be defined
 * left-aligned by accident.
 */
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Human label for the column-visibility menu and the CSV header. */
    label?: string;
    align?: "left" | "right" | "center";
    /** Mono + tabular. Set automatically by the numeric column helpers. */
    mono?: boolean;
    /** Fixed width, e.g. "9rem". Numeric columns want a stable width. */
    width?: string;
    /** Excluded from CSV export (checkbox and row-action columns). */
    noExport?: boolean;
    /** Plain value for CSV — defaults to the raw cell value. */
    exportValue?: (row: TData) => string | number;
    /** Hidden below 1280px on the responsive pass (§8). */
    priority?: "essential" | "secondary";
  }
}

export interface SavedView {
  id: string;
  label: string;
  /** Query string applied on click, e.g. "status=overdue&sort=-dueDate". */
  query: string;
  /** Optional count badge, resolved by the caller. */
  count?: number;
}
