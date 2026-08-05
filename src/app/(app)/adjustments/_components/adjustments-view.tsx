"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, RotateCcw } from "lucide-react";

import {
  listAdjustments,
  type AdjustmentFilters,
  type AdjustmentListRow,
} from "@/lib/api";
import type { FilterDef } from "@/lib/filters";
import { ADJUSTMENT_REASON_LABEL, type AdjustmentReason } from "@/types/inventory";
import type { AdjustmentStatus } from "@/types/inventory";
import { useUiStore } from "@/stores/ui-store";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  readArray,
  readDateRange,
  readString,
  useFilterValues,
  useListPagination,
} from "@/hooks/use-list-state";
import {
  codeColumn,
  dateColumn,
  moneyColumn,
  qtyColumn,
  statusColumn,
} from "@/components/distrix/data-table/columns";
import { DataTable } from "@/components/distrix/data-table/data-table";
import { FilterBar } from "@/components/distrix/filter-bar/filter-bar";
import { PageHeader } from "@/components/distrix/primitives";
import { EmptyState, NoResultsState } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";
import { AdjustmentSheet } from "@/app/(app)/adjustments/_components/adjustment-sheet";

const FILTERS: FilterDef[] = [
  { kind: "search", key: "q", placeholder: "Adjustment no. or note…" },
  {
    kind: "multi",
    key: "reason",
    label: "Reason",
    options: Object.entries(ADJUSTMENT_REASON_LABEL).map(([value, label]) => ({
      value,
      label,
    })),
  },
  {
    kind: "multi",
    key: "status",
    label: "Status",
    options: [
      { value: "draft", label: "Draft" },
      { value: "approved", label: "Approved" },
      { value: "posted", label: "Posted" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
  { kind: "dateRange", key: "date", label: "Date" },
];

function adjustmentColumns(): ColumnDef<AdjustmentListRow>[] {
  return [
    codeColumn({ id: "adjNo", label: "Adjustment", accessor: (row) => row.adjNo }),
    dateColumn({ id: "date", label: "Counted", accessor: (row) => row.date }),
    {
      id: "warehouse",
      accessorFn: (row) => row.warehouseName,
      header: "Warehouse",
      meta: { label: "Warehouse", width: "12rem", priority: "essential" },
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <span className="font-mono text-sm text-ink-muted">
            {row.original.warehouseCode}
          </span>
          <span>{row.original.warehouseName}</span>
        </span>
      ),
    },
    {
      id: "reasons",
      accessorFn: (row) => row.reasons.join(", "),
      header: "Reason codes",
      meta: {
        label: "Reason codes",
        priority: "secondary",
        exportValue: (row) =>
          row.reasons.map((reason) => ADJUSTMENT_REASON_LABEL[reason]).join("; "),
      },
      cell: ({ row }) => (
        <span className="flex flex-wrap gap-1">
          {row.original.reasons.map((reason) => (
            <span
              key={reason}
              className="inline-flex h-5 items-center rounded-full border border-border bg-surface-sunken px-2 text-xs text-ink-muted"
            >
              {ADJUSTMENT_REASON_LABEL[reason]}
            </span>
          ))}
        </span>
      ),
    },
    qtyColumn({
      id: "lineCount",
      label: "Lines",
      accessor: (row) => row.lineCount,
      width: "5rem",
    }),
    moneyColumn({
      id: "totalVarianceValue",
      label: "Variance value",
      accessor: (row) => row.totalVarianceValue,
      // Shrinkage is the norm, so any non-zero variance reads as an exception.
      tone: (row) => (row.totalVarianceValue === 0 ? "muted" : "variance"),
      width: "10rem",
    }),
    statusColumn({ accessor: (row) => row.status }),
  ];
}

export function AdjustmentsView() {
  const router = useRouter();
  const values = useFilterValues(FILTERS);
  const { pageIndex, pageSize, setPageIndex, setPageSize } = useListPagination();
  const columns = useMemo(() => adjustmentColumns(), []);
  const warehouseId = useUiStore((s) => s.activeWarehouseId);
  const [openId, setOpenId] = useState<string | null>(null);

  const q = readString(values, "q");
  const reason = readArray<AdjustmentReason>(values, "reason");
  const status = readArray<AdjustmentStatus>(values, "status");
  const date = readDateRange(values, "date");

  const filters: AdjustmentFilters = {
    pageIndex,
    pageSize,
    warehouseId,
    ...(q ? { q } : {}),
    ...(reason ? { reason } : {}),
    ...(status ? { status } : {}),
    ...(date.from ? { dateFrom: date.from } : {}),
    ...(date.to ? { dateTo: date.to } : {}),
  };

  const { data, error, isLoading, refetch } = useApiQuery(JSON.stringify(filters), () =>
    listAdjustments(filters),
  );

  const hasFilters = Object.values(values).some((value) =>
    Array.isArray(value) ? value.length > 0 : value != null && value !== "",
  );

  return (
    <>
      <PageHeader
        title="Stock adjustments"
        count={data?.total}
        description="Cycle counts and write-offs. Every variance carries a reason code and a value."
        actions={
          <Button size="sm" onClick={() => router.push("/adjustments/new")}>
            <Plus size={16} strokeWidth={1.75} />
            New adjustment
          </Button>
        }
      />

      <div className="px-4 pb-6">
        <DataTable
          data={data?.rows ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          what="stock adjustments"
          exportFilename="stock-adjustments"
          stickyFirstColumn
          isLoading={isLoading}
          error={error ? { message: error.message } : null}
          onRetry={refetch}
          onRowOpen={(row) => setOpenId(row.adjNo)}
          toolbar={<FilterBar filters={FILTERS} />}
          emptyState={
            hasFilters ? (
              <NoResultsState
                {...(q ? { query: q } : {})}
                onClearFilters={() => router.push("/adjustments")}
              />
            ) : (
              <EmptyState
                icon={RotateCcw}
                title="No adjustments in this warehouse"
                description="Adjustments come out of a cycle count. Count a section, then record what the shelf actually held."
                action={
                  <Button size="sm" onClick={() => router.push("/adjustments/new")}>
                    Start a cycle count
                  </Button>
                }
              />
            )
          }
          pagination={{
            pageIndex,
            pageSize,
            total: data?.total ?? 0,
            onPageChange: setPageIndex,
            onPageSizeChange: setPageSize,
          }}
        />
      </div>

      <AdjustmentSheet adjNo={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
