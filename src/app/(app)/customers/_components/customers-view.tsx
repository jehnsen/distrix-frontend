"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { parseAsBoolean, useQueryState } from "nuqs";
import { Plus, Users } from "lucide-react";

import { listCustomers, type CustomerFilters } from "@/lib/api";
import type { FilterDef } from "@/lib/filters";
import type { CustomerSegment } from "@/types/customer";
import type { RecordStatus } from "@/types/common";
import { CUSTOMER_SEGMENT_LABEL } from "@/types/customer";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  readAmountRange,
  readArray,
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
import { customerColumns } from "@/app/(app)/customers/_components/customer-columns";

const FILTERS: FilterDef[] = [
  { kind: "search", key: "q", placeholder: "Name, code or TIN…" },
  {
    kind: "multi",
    key: "segment",
    label: "Segment",
    options: Object.entries(CUSTOMER_SEGMENT_LABEL).map(([value, label]) => ({
      value,
      label,
    })),
  },
  {
    kind: "multi",
    key: "status",
    label: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "on_hold", label: "On hold" },
      { value: "inactive", label: "Inactive" },
    ],
  },
  { kind: "amountRange", key: "balance", label: "Balance" },
];

const SAVED_VIEWS: SavedView[] = [
  { id: "all", label: "All", query: "" },
  { id: "over", label: "Over limit", query: "overLimit=true" },
  { id: "active", label: "Active", query: "status=active" },
  { id: "hold", label: "On hold", query: "status=on_hold" },
];

export function CustomersView() {
  const router = useRouter();
  const values = useFilterValues(FILTERS);
  const { pageIndex, pageSize, setPageIndex, setPageSize } = useListPagination();
  const columns = useMemo(() => customerColumns(), []);

  // `overLimit` is a saved-view preset rather than a chip the user assembles,
  // so it lives outside the FilterBar's parser set.
  const [overLimitOnly] = useQueryState(
    "overLimit",
    parseAsBoolean.withDefault(false).withOptions({ history: "replace", shallow: true }),
  );

  const q = readString(values, "q");
  const segment = readArray<CustomerSegment>(values, "segment");
  const status = readArray<RecordStatus>(values, "status");
  const balance = readAmountRange(values, "balance");

  const filters: CustomerFilters = {
    pageIndex,
    pageSize,
    overLimitOnly,
    balanceMin: balance.min,
    balanceMax: balance.max,
    ...(q ? { q } : {}),
    ...(segment ? { segment } : {}),
    ...(status ? { status } : {}),
  };

  const key = JSON.stringify(filters);
  const { data, error, isLoading, refetch } = useApiQuery(key, () => listCustomers(filters));

  const hasFilters =
    Object.keys(values).some((field) => {
      const value = values[field];
      return Array.isArray(value) ? value.length > 0 : value != null && value !== "";
    }) || overLimitOnly;

  return (
    <>
      <PageHeader
        title="Customers"
        count={data?.total}
        description="Every account, what it owes and how much headroom is left on its limit."
        actions={
          <Button size="sm" onClick={() => router.push("/customers/new")}>
            <Plus size={16} strokeWidth={1.75} />
            New customer
          </Button>
        }
      />

      <div className="px-4 pb-6">
        <DataTable
          data={data?.rows ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          what="customers"
          exportFilename="customers"
          stickyFirstColumn
          isLoading={isLoading}
          error={error ? { message: error.message } : null}
          onRetry={refetch}
          onRowOpen={(row) => router.push(`/customers/${row.code}`)}
          savedViews={SAVED_VIEWS}
          basePath="/customers"
          toolbar={<FilterBar filters={FILTERS} />}
          emptyState={
            hasFilters ? (
              <NoResultsState
                query={readString(values, "q")}
                onClearFilters={() => router.push("/customers")}
              />
            ) : (
              <EmptyState
                icon={Users}
                title="No customers yet"
                description="Accounts are created before the first order so terms and credit limits are agreed up front."
                action={
                  <Button size="sm" onClick={() => router.push("/customers/new")}>
                    Add the first customer
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
