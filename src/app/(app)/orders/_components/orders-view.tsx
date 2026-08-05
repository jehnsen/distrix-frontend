"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShoppingCart } from "lucide-react";

import { listOrders, type OrderFilters } from "@/lib/api";
import type { FilterDef } from "@/lib/filters";
import type { SalesOrderStatus } from "@/types/sales-order";
import { useUiStore } from "@/stores/ui-store";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  readAmountRange,
  readArray,
  readDateRange,
  readString,
  useFilterValues,
  useListPagination,
} from "@/hooks/use-list-state";
import { DataTable } from "@/components/distrix/data-table/data-table";
import type { SavedView } from "@/components/distrix/data-table/types";
import { FilterBar } from "@/components/distrix/filter-bar/filter-bar";
import { PageHeader } from "@/components/distrix/primitives";
import { EmptyState, NoResultsState } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";
import { orderColumns } from "@/app/(app)/orders/_components/order-columns";

const FILTERS: FilterDef[] = [
  { kind: "search", key: "q", placeholder: "Order no., customer or their PO…" },
  {
    kind: "multi",
    key: "status",
    label: "Status",
    options: [
      { value: "draft", label: "Draft" },
      { value: "confirmed", label: "Confirmed" },
      { value: "partially_delivered", label: "Partly delivered" },
      { value: "delivered", label: "Delivered" },
      { value: "invoiced", label: "Invoiced" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
  { kind: "dateRange", key: "order", label: "Order date" },
  { kind: "amountRange", key: "total", label: "Total" },
];

const SAVED_VIEWS: SavedView[] = [
  { id: "all", label: "All", query: "" },
  {
    id: "dispatch",
    label: "Ready to ship",
    query: "status=confirmed&status=partially_delivered",
  },
  { id: "drafts", label: "Drafts", query: "status=draft" },
  { id: "unbilled", label: "Delivered, unbilled", query: "status=delivered" },
];

export function OrdersView() {
  const router = useRouter();
  const values = useFilterValues(FILTERS);
  const { pageIndex, pageSize, setPageIndex, setPageSize } = useListPagination();
  const columns = useMemo(() => orderColumns(), []);
  const warehouseId = useUiStore((s) => s.activeWarehouseId);

  const q = readString(values, "q");
  const status = readArray<SalesOrderStatus>(values, "status");
  const order = readDateRange(values, "order");
  const total = readAmountRange(values, "total");

  const filters: OrderFilters = {
    pageIndex,
    pageSize,
    warehouseId,
    totalMin: total.min,
    totalMax: total.max,
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
    ...(order.from ? { orderDateFrom: order.from } : {}),
    ...(order.to ? { orderDateTo: order.to } : {}),
  };

  const { data, error, isLoading, refetch } = useApiQuery(JSON.stringify(filters), () =>
    listOrders(filters),
  );

  const hasFilters = Object.values(values).some((value) =>
    Array.isArray(value) ? value.length > 0 : value != null && value !== "",
  );

  return (
    <>
      <PageHeader
        title="Sales orders"
        count={data?.total}
        description="What has been sold and how much of it has actually gone out."
        actions={
          <Button size="sm" onClick={() => router.push("/orders/new")}>
            <Plus size={16} strokeWidth={1.75} />
            New order
          </Button>
        }
      />

      <div className="px-4 pb-6">
        <DataTable
          data={data?.rows ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          what="sales orders"
          exportFilename="sales-orders"
          stickyFirstColumn
          isLoading={isLoading}
          error={error ? { message: error.message } : null}
          onRetry={refetch}
          onRowOpen={(row) => router.push(`/orders/${row.soNo}`)}
          savedViews={SAVED_VIEWS}
          basePath="/orders"
          toolbar={<FilterBar filters={FILTERS} />}
          emptyState={
            hasFilters ? (
              <NoResultsState
                {...(q ? { query: q } : {})}
                onClearFilters={() => router.push("/orders")}
              />
            ) : (
              <EmptyState
                icon={ShoppingCart}
                title="No orders yet"
                description="An order starts the chain: confirm it to reserve stock, cut a delivery receipt, then invoice what was accepted."
                action={
                  <Button size="sm" onClick={() => router.push("/orders/new")}>
                    Take the first order
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
    </>
  );
}
