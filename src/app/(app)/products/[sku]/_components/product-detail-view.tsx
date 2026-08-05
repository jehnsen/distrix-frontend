"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, ShoppingCart } from "lucide-react";

import { getProduct, listWarehouses } from "@/lib/api";
import { formatPercent, formatQty } from "@/lib/format";
import { grossMarginPct, PRODUCT_CATEGORY_LABEL, stockHealth } from "@/types/product";
import { VAT_TYPE_LABEL } from "@/types/tax";
import { useApiQuery } from "@/hooks/use-api-query";
import { Figure, Money } from "@/components/distrix/money";
import { Card, InlineBanner } from "@/components/distrix/primitives";
import { RecordPage, type RecordTab } from "@/components/distrix/record-page";
import { ErrorState, PanelSkeleton } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";
import {
  MovementsPanel,
  StockByWarehousePanel,
} from "@/app/(app)/products/[sku]/_components/product-panels";
import {
  LandedCostPanel,
  PricingPanel,
} from "@/app/(app)/products/[sku]/_components/product-commercial-panels";

/** GATE 9: price-list names move to a Settings-backed lookup. */
const PRICE_LIST_NAMES = new Map([
  ["PL-STD", "Standard"],
  ["PL-VOL", "Volume"],
  ["PL-KEY", "Key account"],
  ["PL-FSV", "Food service"],
]);

export function ProductDetailView({ sku }: { sku: string }) {
  const router = useRouter();
  const { data, error, isInitialLoading, refetch } = useApiQuery(`product:${sku}`, () =>
    getProduct(sku),
  );
  // Warehouses are fetched separately so a slow list never blocks the header.
  useApiQuery("warehouses", listWarehouses);

  const totals = useMemo(() => {
    if (!data) return { onHand: 0, available: 0, incoming: 0 };
    return data.stockByWarehouse.reduce(
      (acc, row) => ({
        onHand: acc.onHand + row.level.onHand,
        available: acc.available + row.level.available,
        incoming: acc.incoming + row.level.incoming,
      }),
      { onHand: 0, available: 0, incoming: 0 },
    );
  }, [data]);

  if (error) {
    return (
      <div className="p-4">
        <Card padded={false}>
          <ErrorState
            what={`product ${sku}`}
            detail={error.message}
            onRetry={error.status === 404 ? undefined : refetch}
          />
        </Card>
      </div>
    );
  }

  if (isInitialLoading || !data) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Card>
          <PanelSkeleton lines={4} />
        </Card>
        <Card>
          <PanelSkeleton lines={6} />
        </Card>
      </div>
    );
  }

  const { product } = data;
  const health = stockHealth(totals.available, product.reorderPoint);
  const margin = grossMarginPct(product.listPrice, product.standardCost);

  const tabs: RecordTab[] = [
    {
      value: "stock",
      label: "Stock",
      count: data.stockByWarehouse.length,
      content: (
        <div className="flex flex-col gap-4">
          <StockByWarehousePanel detail={data} />
          <MovementsPanel detail={data} />
        </div>
      ),
    },
    {
      value: "pricing",
      label: "Pricing & sourcing",
      count: data.priceListEntries.length,
      content: <PricingPanel detail={data} priceListNames={PRICE_LIST_NAMES} />,
    },
    {
      value: "landed",
      label: "Landed cost",
      count: data.landedCostHistory.length,
      content: <LandedCostPanel detail={data} />,
    },
  ];

  return (
    <RecordPage
      recordType="Product"
      code={product.sku}
      name={product.name}
      status={health === "in_stock" ? "in_stock" : health}
      fields={[
        { label: "Category", value: PRODUCT_CATEGORY_LABEL[product.category] },
        { label: "Brand", value: product.brand },
        {
          label: "UoM",
          value: (
            <span className="font-mono">
              {product.uom}
              {product.altUom && product.altUomConversion
                ? ` · ${product.altUomConversion} per ${product.altUom}`
                : ""}
            </span>
          ),
        },
        { label: "Barcode", value: <span className="font-mono">{product.barcode}</span> },
        { label: "VAT treatment", value: VAT_TYPE_LABEL[product.vatType] },
        {
          label: "Available",
          value: <Figure value={totals.available} unit={product.uom} weight="medium" />,
          hint: `Reorder at ${formatQty(product.reorderPoint)}`,
        },
        {
          label: "Standard cost",
          value: <Money amount={product.standardCost} symbol />,
          hint: product.isImported ? "Weighted average landed" : "Purchase cost",
        },
        {
          label: "List price",
          value: <Money amount={product.listPrice} symbol />,
          hint: `${formatPercent(margin)} margin`,
        },
      ]}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => router.push("/adjustments/new")}>
            <RotateCcw size={16} strokeWidth={1.75} />
            Adjust stock
          </Button>
          <Button variant="outline" size="sm">
            <Pencil size={16} strokeWidth={1.75} />
            Edit
          </Button>
          <Button
            size="sm"
            onClick={() => router.push(`/purchase-orders/new?sku=${product.sku}`)}
          >
            <ShoppingCart size={16} strokeWidth={1.75} />
            Reorder
          </Button>
        </>
      }
      banner={
        health === "out_of_stock" ? (
          <InlineBanner
            tone="overdue"
            title="Nothing available to sell"
            action={
              <Button variant="outline" size="sm">
                Raise a purchase order
              </Button>
            }
          >
            {totals.incoming > 0
              ? `${formatQty(totals.incoming)} ${product.uom} are on an open purchase order but have not arrived.`
              : "There is no incoming stock on any open purchase order either."}
          </InlineBanner>
        ) : health === "low_stock" ? (
          <InlineBanner tone="partial" title="At or below the reorder point">
            {formatQty(totals.available)} {product.uom} available against a reorder point of{" "}
            {formatQty(product.reorderPoint)}
            {totals.incoming > 0 && `, with ${formatQty(totals.incoming)} incoming`}.
          </InlineBanner>
        ) : margin < 10 ? (
          <InlineBanner tone="partial" title="Thin margin">
            List price is only {formatPercent(margin)} above standard cost. Check the
            landed cost history before quoting.
          </InlineBanner>
        ) : undefined
      }
      tabs={tabs}
    />
  );
}
