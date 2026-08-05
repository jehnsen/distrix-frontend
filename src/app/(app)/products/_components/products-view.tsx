"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Plus } from "lucide-react";

import { listProducts, type ProductFilters } from "@/lib/api";
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
import type { SavedView } from "@/components/distrix/data-table/types";
import { FilterBar } from "@/components/distrix/filter-bar/filter-bar";
import { PageHeader } from "@/components/distrix/primitives";
import { EmptyState, NoResultsState } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";
import { productColumns } from "@/app/(app)/products/_components/product-columns";

const FILTERS: FilterDef[] = [
  { kind: "search", key: "q", placeholder: "SKU, name, brand or barcode…" },
  {
    kind: "multi",
    key: "category",
    label: "Category",
    options: Object.entries(PRODUCT_CATEGORY_LABEL).map(([value, label]) => ({
      value,
      label,
    })),
  },
  {
    kind: "multi",
    key: "health",
    label: "Stock",
    options: [
      { value: "out_of_stock", label: "Out of stock" },
      { value: "low_stock", label: "Low stock" },
      { value: "in_stock", label: "In stock" },
    ],
  },
  {
    kind: "multi",
    key: "status",
    label: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
];

const SAVED_VIEWS: SavedView[] = [
  { id: "all", label: "All", query: "" },
  { id: "reorder", label: "Needs reordering", query: "health=out_of_stock&health=low_stock" },
  { id: "imported", label: "Imported", query: "imported=true" },
];

export function ProductsView() {
  const router = useRouter();
  const values = useFilterValues(FILTERS);
  const { pageIndex, pageSize, setPageIndex, setPageSize } = useListPagination();
  const columns = useMemo(() => productColumns(), []);
  // The warehouse switcher scopes every stock figure on this page.
  const warehouseId = useUiStore((s) => s.activeWarehouseId);

  const q = readString(values, "q");
  const category = readArray<ProductCategory>(values, "category");
  const health = readArray<StockHealth>(values, "health");
  const status = readArray<"active" | "inactive">(values, "status");

  const filters: ProductFilters = {
    pageIndex,
    pageSize,
    warehouseId,
    ...(q ? { q } : {}),
    ...(category ? { category } : {}),
    ...(health ? { health } : {}),
    ...(status ? { status } : {}),
  };

  const key = JSON.stringify(filters);
  const { data, error, isLoading, refetch } = useApiQuery(key, () => listProducts(filters));

  const hasFilters = Object.values(values).some((value) =>
    Array.isArray(value) ? value.length > 0 : value != null && value !== "",
  );

  return (
    <>
      <PageHeader
        title="Products"
        count={data?.total}
        description="Stock figures follow the warehouse selected in the top bar."
        actions={
          <Button size="sm" onClick={() => router.push("/products/new")}>
            <Plus size={16} strokeWidth={1.75} />
            New product
          </Button>
        }
      />

      <div className="px-4 pb-6">
        <DataTable
          data={data?.rows ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          what="products"
          exportFilename="products"
          stickyFirstColumn
          isLoading={isLoading}
          error={error ? { message: error.message } : null}
          onRetry={refetch}
          onRowOpen={(row) => router.push(`/products/${row.sku}`)}
          savedViews={SAVED_VIEWS}
          basePath="/products"
          toolbar={<FilterBar filters={FILTERS} />}
          emptyState={
            hasFilters ? (
              <NoResultsState
                {...(q ? { query: q } : {})}
                onClearFilters={() => router.push("/products")}
              />
            ) : (
              <EmptyState
                icon={Boxes}
                title="No products yet"
                description="The catalogue is built before the first purchase order so landed cost has somewhere to land."
                action={
                  <Button size="sm" onClick={() => router.push("/products/new")}>
                    Add the first product
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
