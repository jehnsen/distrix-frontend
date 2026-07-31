"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Table } from "@tanstack/react-table";
import { Columns3, Download, Rows3 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { downloadCsv, tableToCsv } from "@/components/distrix/data-table/csv";
import type { SavedView } from "@/components/distrix/data-table/types";

/** Saved views are URL presets, so "My overdue" is a shareable link. */
function SavedViews({ views, basePath }: { views: SavedView[]; basePath: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.toString();

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto">
      {views.map((view) => {
        const active = current === view.query;
        return (
          <button
            key={view.id}
            type="button"
            onClick={() => router.push(view.query ? `${basePath}?${view.query}` : basePath)}
            aria-pressed={active}
            className={cn(
              "flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-base font-medium",
              "transition-colors duration-[160ms] ease-out",
              "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
              active
                ? "bg-accent-wash text-accent"
                : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
            )}
          >
            {view.label}
            {view.count !== undefined && (
              <span
                className={cn(
                  "font-mono text-xs tabular-nums",
                  active ? "text-accent" : "text-ink-muted",
                )}
              >
                {view.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function DataTableToolbar<TData>({
  table,
  savedViews,
  basePath,
  exportFilename,
  children,
}: {
  table: Table<TData>;
  savedViews?: SavedView[];
  basePath?: string;
  exportFilename: string;
  /** The FilterBar, or anything else that belongs in the toolbar row. */
  children?: React.ReactNode;
}) {
  const density = useUiStore((s) => s.density);
  const toggleDensity = useUiStore((s) => s.toggleDensity);
  const hideableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide() && column.columnDef.meta?.label);

  return (
    <div
      data-print="hide"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {savedViews && basePath && <SavedViews views={savedViews} basePath={basePath} />}
        {children}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggleDensity}
                aria-pressed={density === "compact"}
                aria-label="Toggle compact rows"
              >
                <Rows3 size={16} strokeWidth={1.75} />
              </Button>
            }
          />
          <TooltipContent>
            {density === "compact" ? "Comfortable rows" : "Compact rows"}
          </TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Choose columns">
                <Columns3 size={16} strokeWidth={1.75} />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {hideableColumns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(checked) => column.toggleVisibility(checked === true)}
                closeOnClick={false}
              >
                {column.columnDef.meta?.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Export visible rows to CSV"
                onClick={() => downloadCsv(exportFilename, tableToCsv(table))}
              >
                <Download size={16} strokeWidth={1.75} />
              </Button>
            }
          />
          <TooltipContent>Export CSV</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
