"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, ArrowLeftRight, Plus } from "lucide-react";

import { listTransfers, type TransferFilters, type TransferListRow } from "@/lib/api";
import type { FilterDef } from "@/lib/filters";
import type { TransferStatus } from "@/types/inventory";
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
  qtyColumn,
  statusColumn,
} from "@/components/distrix/data-table/columns";
import { DataTable } from "@/components/distrix/data-table/data-table";
import { FilterBar } from "@/components/distrix/filter-bar/filter-bar";
import { Figure } from "@/components/distrix/money";
import { PageHeader } from "@/components/distrix/primitives";
import { EmptyState, NoResultsState } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";
import { TransferSheet } from "@/app/(app)/transfers/_components/transfer-sheet";

const FILTERS: FilterDef[] = [
  { kind: "search", key: "q", placeholder: "Transfer no. or warehouse…" },
  {
    kind: "multi",
    key: "status",
    label: "Status",
    options: [
      { value: "draft", label: "Draft" },
      { value: "in_transit", label: "In transit" },
      { value: "received", label: "Received" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
  { kind: "dateRange", key: "date", label: "Dispatched" },
];

function transferColumns(): ColumnDef<TransferListRow>[] {
  return [
    codeColumn({ id: "trNo", label: "Transfer", accessor: (row) => row.trNo }),
    {
      id: "route",
      accessorFn: (row) => `${row.fromCode}-${row.toCode}`,
      header: "Route",
      meta: {
        label: "Route",
        width: "9rem",
        priority: "essential",
        exportValue: (row) => `${row.fromCode} to ${row.toCode}`,
      },
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 font-mono text-sm">
          <span className="text-ink">{row.original.fromCode}</span>
          <ArrowRight aria-hidden size={13} strokeWidth={2} className="text-ink-muted" />
          <span className="text-ink">{row.original.toCode}</span>
        </span>
      ),
    },
    dateColumn({ id: "dispatchDate", label: "Dispatched", accessor: (row) => row.dispatchDate }),
    dateColumn({ id: "expectedDate", label: "Expected", accessor: (row) => row.expectedDate }),
    qtyColumn({ id: "lineCount", label: "Lines", accessor: (row) => row.lineCount, width: "5rem" }),
    qtyColumn({ id: "qtySent", label: "Sent", accessor: (row) => row.qtySent }),
    {
      id: "qtyReceived",
      accessorFn: (row) => row.qtyReceived,
      header: "Received",
      meta: {
        label: "Received",
        align: "right",
        mono: true,
        width: "8rem",
        priority: "essential",
        exportValue: (row) => row.qtyReceived,
      },
      cell: ({ row }) => {
        const { qtyReceived, qtySent, status, hasVariance } = row.original;
        if (status === "in_transit") {
          return <span className="font-mono text-ink-muted">in transit</span>;
        }
        return (
          <span className="inline-flex items-baseline gap-1.5">
            <Figure value={qtyReceived} tone={hasVariance ? "variance" : "plain"} />
            {hasVariance && (
              <span className="font-mono text-xs text-overdue">
                ({qtyReceived - qtySent})
              </span>
            )}
          </span>
        );
      },
    },
    statusColumn({ accessor: (row) => row.status }),
  ];
}

export function TransfersView() {
  const router = useRouter();
  const values = useFilterValues(FILTERS);
  const { pageIndex, pageSize, setPageIndex, setPageSize } = useListPagination();
  const columns = useMemo(() => transferColumns(), []);
  const [openId, setOpenId] = useState<string | null>(null);

  const q = readString(values, "q");
  const status = readArray<TransferStatus>(values, "status");
  const date = readDateRange(values, "date");

  const filters: TransferFilters = {
    pageIndex,
    pageSize,
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
    ...(date.from ? { dateFrom: date.from } : {}),
    ...(date.to ? { dateTo: date.to } : {}),
  };

  const { data, error, isLoading, refetch } = useApiQuery(JSON.stringify(filters), () =>
    listTransfers(filters),
  );

  const hasFilters = Object.values(values).some((value) =>
    Array.isArray(value) ? value.length > 0 : value != null && value !== "",
  );

  return (
    <>
      <PageHeader
        title="Warehouse transfers"
        count={data?.total}
        description="Stock moving between sites. A short receipt at the far end is flagged, not silently absorbed."
        actions={
          <Button size="sm" onClick={() => router.push("/transfers/new")}>
            <Plus size={16} strokeWidth={1.75} />
            New transfer
          </Button>
        }
      />

      <div className="px-4 pb-6">
        <DataTable
          data={data?.rows ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          what="warehouse transfers"
          exportFilename="warehouse-transfers"
          stickyFirstColumn
          isLoading={isLoading}
          error={error ? { message: error.message } : null}
          onRetry={refetch}
          onRowOpen={(row) => setOpenId(row.trNo)}
          toolbar={<FilterBar filters={FILTERS} />}
          emptyState={
            hasFilters ? (
              <NoResultsState
                {...(q ? { query: q } : {})}
                onClearFilters={() => router.push("/transfers")}
              />
            ) : (
              <EmptyState
                icon={ArrowLeftRight}
                title="No transfers yet"
                description="Manila replenishes the branches from the reorder report. Raise a transfer to move stock between sites."
                action={
                  <Button size="sm" onClick={() => router.push("/transfers/new")}>
                    Raise a transfer
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

      <TransferSheet trNo={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
