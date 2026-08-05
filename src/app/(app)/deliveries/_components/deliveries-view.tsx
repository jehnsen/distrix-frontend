"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Plus, Truck } from "lucide-react";

import {
  getDispatchBoard,
  listDeliveries,
  type DeliveryFilters,
  type DeliveryListRow,
} from "@/lib/api";
import type { FilterDef } from "@/lib/filters";
import type { DeliveryReceiptStatus } from "@/types/delivery-receipt";
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
  qtyColumn,
  statusColumn,
} from "@/components/distrix/data-table/columns";
import { DataTable } from "@/components/distrix/data-table/data-table";
import { FilterBar } from "@/components/distrix/filter-bar/filter-bar";
import { PageHeader } from "@/components/distrix/primitives";
import { EmptyState, NoResultsState } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DispatchBoard } from "@/app/(app)/deliveries/_components/dispatch-board";

const FILTERS: FilterDef[] = [
  { kind: "search", key: "q", placeholder: "DR no., order, customer, driver or plate…" },
  {
    kind: "multi",
    key: "status",
    label: "Status",
    options: [
      { value: "draft", label: "Draft" },
      { value: "dispatched", label: "Dispatched" },
      { value: "delivered", label: "Delivered" },
      { value: "acknowledged", label: "Acknowledged" },
    ],
  },
  { kind: "dateRange", key: "delivery", label: "Delivery date" },
];

const VIEWS = ["board", "list"] as const;

function deliveryColumns(): ColumnDef<DeliveryListRow>[] {
  return [
    codeColumn({ id: "drNo", label: "DR no.", accessor: (row) => row.drNo }),
    codeColumn({ id: "soNo", label: "Order", accessor: (row) => row.soNo, width: "9rem" }),
    {
      id: "customer",
      accessorFn: (row) => row.customerName,
      header: "Customer",
      meta: { label: "Customer", priority: "essential" },
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-ink">{row.original.customerName}</span>
          {row.original.hasShortShip && (
            <AlertTriangle
              aria-label="Short shipment"
              size={13}
              strokeWidth={2}
              className="shrink-0 text-partial"
            />
          )}
        </div>
      ),
    },
    dateColumn({
      id: "deliveryDate",
      label: "Delivery",
      accessor: (row) => row.deliveryDate,
    }),
    {
      id: "driver",
      accessorFn: (row) => row.driver,
      header: "Driver",
      meta: { label: "Driver", width: "11rem", priority: "essential" },
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-ink">{row.original.driver}</span>
          <span className="font-mono text-xs text-ink-muted">{row.original.plateNo}</span>
        </div>
      ),
    },
    qtyColumn({
      id: "dropSequence",
      label: "Drop",
      accessor: (row) => row.dropSequence,
      width: "5rem",
      priority: "secondary",
    }),
    qtyColumn({
      id: "lineCount",
      label: "Lines",
      accessor: (row) => row.lineCount,
      width: "5rem",
    }),
    {
      id: "billed",
      accessorFn: (row) => (row.invoiceId ? 1 : 0),
      header: "Billed",
      meta: {
        label: "Billed",
        width: "6rem",
        priority: "secondary",
        exportValue: (row) => (row.invoiceId ? "Yes" : "No"),
      },
      cell: ({ row }) =>
        row.original.invoiceId ? (
          <span className="text-sm text-paid">Yes</span>
        ) : (
          <span className="text-sm text-ink-muted">—</span>
        ),
    },
    statusColumn({ accessor: (row) => row.status }),
  ];
}

export function DeliveriesView() {
  const router = useRouter();
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(VIEWS).withDefault("board").withOptions({ history: "replace" }),
  );
  const values = useFilterValues(FILTERS);
  const { pageIndex, pageSize, setPageIndex, setPageSize } = useListPagination();
  const columns = useMemo(() => deliveryColumns(), []);
  const warehouseId = useUiStore((s) => s.activeWarehouseId);

  const q = readString(values, "q");
  const status = readArray<DeliveryReceiptStatus>(values, "status");
  const delivery = readDateRange(values, "delivery");

  const filters: DeliveryFilters = {
    pageIndex,
    pageSize,
    warehouseId,
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
    ...(delivery.from ? { deliveryDateFrom: delivery.from } : {}),
    ...(delivery.to ? { deliveryDateTo: delivery.to } : {}),
  };

  const list = useApiQuery(JSON.stringify(filters), () => listDeliveries(filters));
  const board = useApiQuery(`board:${warehouseId}`, () => getDispatchBoard(warehouseId));

  const hasFilters = Object.values(values).some((value) =>
    Array.isArray(value) ? value.length > 0 : value != null && value !== "",
  );

  return (
    <>
      <PageHeader
        title="Deliveries"
        count={view === "list" ? list.data?.total : undefined}
        description={
          view === "board"
            ? "Everything still to go out, grouped by delivery date and run in drop order."
            : "Every delivery receipt cut, including those already acknowledged and billed."
        }
        actions={
          <>
            <Tabs
              value={view}
              onValueChange={(next) => void setView(next as (typeof VIEWS)[number])}
            >
              <TabsList variant="segmented">
                <TabsTrigger value="board">Dispatch board</TabsTrigger>
                <TabsTrigger value="list">All receipts</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" onClick={() => router.push("/deliveries/new")}>
              <Plus size={16} strokeWidth={1.75} />
              New delivery
            </Button>
          </>
        }
      />

      <div className="px-4 pb-6">
        {view === "board" ? (
          <DispatchBoard
            days={board.data ?? []}
            isLoading={board.isLoading}
            error={board.error}
            onRetry={board.refetch}
          />
        ) : (
          <DataTable
            data={list.data?.rows ?? []}
            columns={columns}
            getRowId={(row) => row.id}
            what="delivery receipts"
            exportFilename="delivery-receipts"
            stickyFirstColumn
            isLoading={list.isLoading}
            error={list.error ? { message: list.error.message } : null}
            onRetry={list.refetch}
            onRowOpen={(row) => router.push(`/deliveries/${row.drNo}`)}
            toolbar={<FilterBar filters={FILTERS} />}
            emptyState={
              hasFilters ? (
                <NoResultsState
                  {...(q ? { query: q } : {})}
                  onClearFilters={() => router.push("/deliveries?view=list")}
                />
              ) : (
                <EmptyState
                  icon={Truck}
                  title="No delivery receipts"
                  description="A delivery is cut from a confirmed order, defaulting to shipping everything outstanding."
                  action={
                    <Button size="sm" onClick={() => router.push("/deliveries/new")}>
                      Cut a delivery receipt
                    </Button>
                  }
                />
              )
            }
            pagination={{
              pageIndex,
              pageSize,
              total: list.data?.total ?? 0,
              onPageChange: setPageIndex,
              onPageSizeChange: setPageSize,
            }}
          />
        )}
      </div>
    </>
  );
}
