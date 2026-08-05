"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { PackageSearch } from "lucide-react";

import {
  getReorderReport,
  listStockLevels,
  type StockLevelFilters,
} from "@/lib/api";
import type { FilterDef } from "@/lib/filters";
import { PRODUCT_CATEGORY_LABEL, type ProductCategory } from "@/types/product";
import type { StockHealth } from "@/types/product";
import { useUiStore } from "@/stores/ui-store";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  readArray,
  readString,
  useFilterValues,
  useListPagination,
} from "@/hooks/use-list-state";
import { DataTable } from "@/components/distrix/data-table/data-table";
import { FilterBar } from "@/components/distrix/filter-bar/filter-bar";
import { PageHeader } from "@/components/distrix/primitives";
import { EmptyState, NoResultsState } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReorderReport } from "@/app/(app)/stock-levels/_components/reorder-report";
import { stockColumns } from "@/app/(app)/stock-levels/_components/stock-columns";

const FILTERS: FilterDef[] = [
  { kind: "search", key: "q", placeholder: "SKU or product name…" },
  {
    kind: "multi",
    key: "category",
    label: "Category",
    options: Object.entries(PRODUCT_CATEGORY_LABEL).map(([value, label]) => ({ value, label })),
  },
  {
    kind: "multi",
    key: "health",
    label: "Health",
    options: [
      { value: "out_of_stock", label: "Out of stock" },
      { value: "low_stock", label: "Low stock" },
      { value: "in_stock", label: "In stock" },
    ],
  },
];

const VIEWS = ["levels", "reorder"] as const;

export function StockLevelsView() {
  const router = useRouter();
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(VIEWS).withDefault("levels").withOptions({ history: "replace" }),
  );
  const values = useFilterValues(FILTERS);
  const { pageIndex, pageSize, setPageIndex, setPageSize } = useListPagination(50);
  const columns = useMemo(() => stockColumns(), []);
  const warehouseId = useUiStore((s) => s.activeWarehouseId);

  const q = readString(values, "q");
  const category = readArray<ProductCategory>(values, "category");
  const health = readArray<StockHealth>(values, "health");

  const filters: StockLevelFilters = {
    pageIndex,
    pageSize,
    warehouseId,
    hideZero: true,
    ...(q ? { q } : {}),
    ...(category ? { category } : {}),
    ...(health ? { health } : {}),
  };

  const levels = useApiQuery(JSON.stringify(filters), () => listStockLevels(filters));
  const reorder = useApiQuery(`reorder:${warehouseId}`, () => getReorderReport(warehouseId));

  const hasFilters = Object.values(values).some((value) =>
    Array.isArray(value) ? value.length > 0 : value != null && value !== "",
  );

  return (
    <>
      <PageHeader
        title="Stock levels"
        count={view === "levels" ? levels.data?.total : reorder.data?.length}
        description={
          view === "levels"
            ? "One row per product per warehouse. Reserved is what confirmed orders have already claimed."
            : "Everything at or below its reorder point once incoming stock is counted."
        }
        actions={
          <Tabs
            value={view}
            onValueChange={(next) => void setView(next as (typeof VIEWS)[number])}
          >
            <TabsList variant="segmented">
              <TabsTrigger value="levels">Levels</TabsTrigger>
              <TabsTrigger value="reorder">
                Reorder report
                {reorder.data && reorder.data.length > 0 && (
                  <span className="font-mono text-xs text-partial tabular-nums">
                    {reorder.data.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <div className="px-4 pb-6">
        {view === "reorder" ? (
          <ReorderReport
            rows={reorder.data ?? []}
            isLoading={reorder.isLoading}
            error={reorder.error}
            onRetry={reorder.refetch}
          />
        ) : (
          <DataTable
            data={levels.data?.rows ?? []}
            columns={columns}
            getRowId={(row) => `${row.productId}-${row.warehouseId}`}
            what="stock levels"
            exportFilename="stock-levels"
            stickyFirstColumn
            isLoading={levels.isLoading}
            error={levels.error ? { message: levels.error.message } : null}
            onRetry={levels.refetch}
            onRowOpen={(row) => router.push(`/products/${row.sku}`)}
            toolbar={<FilterBar filters={FILTERS} />}
            emptyState={
              hasFilters ? (
                <NoResultsState
                  {...(q ? { query: q } : {})}
                  onClearFilters={() => router.push("/stock-levels")}
                />
              ) : (
                <EmptyState
                  icon={PackageSearch}
                  title="No stock in this warehouse"
                  description="Stock arrives through a goods receipt against a purchase order, or a transfer from another site."
                  action={
                    <Button size="sm" variant="outline" onClick={() => router.push("/receiving")}>
                      Go to receiving
                    </Button>
                  }
                />
              )
            }
            pagination={{
              pageIndex,
              pageSize,
              total: levels.data?.total ?? 0,
              onPageChange: setPageIndex,
              onPageSizeChange: setPageSize,
            }}
          />
        )}
      </div>
    </>
  );
}
