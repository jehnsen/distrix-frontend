import { formatISO } from "date-fns";

import { type Centavos } from "@/lib/money";
import { computeLineAmounts } from "@/lib/mock/line-math";
import type { Series } from "@/lib/mock/doc-numbers";
import type { Rng } from "@/lib/mock/rng";
import type {
  Customer,
  DeliveryReceipt,
  Invoice,
  Payment,
  PriceListEntry,
  Product,
  SalesOrder,
  SalesOrderLine,
  Warehouse,
} from "@/types";

/**
 * Shared vocabulary and pricing helpers for the sales-chain generator. Split
 * out so the chain orchestration and the billing step each stay readable.
 */

/** How reliably a customer pays. Assigned once, drives the aging shape. */
export type PaymentBehaviour = "prompt" | "average" | "slow" | "delinquent";

export const iso = (date: Date): string => formatISO(date, { representation: "date" });
export const stamp = (date: Date): string => formatISO(date);

export interface SalesChain {
  orders: SalesOrder[];
  deliveries: DeliveryReceipt[];
  invoices: Invoice[];
  payments: Payment[];
  behaviours: Map<string, PaymentBehaviour>;
}

export interface SalesContext {
  rng: Rng;
  series: Series;
  today: Date;
  customers: Customer[];
  products: Product[];
  warehouses: Warehouse[];
  priceEntries: PriceListEntry[];
}

export function priceFor(ctx: SalesContext, product: Product, priceListId: string, qty: number): Centavos {
  const applicable = ctx.priceEntries.filter(
    (entry) =>
      entry.productId === product.id &&
      entry.priceListId === priceListId &&
      qty >= entry.minQty,
  );
  if (applicable.length === 0) return product.listPrice;
  return applicable.reduce((best, entry) =>
    entry.minQty > best.minQty ? entry : best,
  ).unitPrice;
}

export function warehouseFor(ctx: SalesContext, customer: Customer): Warehouse {
  const province = customer.address.province;
  const code =
    province === "Cebu" || province === "Iloilo" || province === "Negros Occidental" || province === "Bohol"
      ? "CEB"
      : province.startsWith("Davao") || province === "Misamis Oriental" ||
        province === "South Cotabato" || province === "Zamboanga del Sur" ||
        province === "Agusan del Norte"
        ? "DVO"
        : "PRQ";
  return ctx.warehouses.find((w) => w.code === code) ?? ctx.warehouses[0]!;
}

/**
 * How big this account's orders run. A sari-sari consolidator buying two lines
 * and a supermarket chain filling a truck are the same document type at very
 * different scales, and the spec's ₱15K–₱800K range depends on both existing.
 */
export function orderScale(customer: Customer, rng: Rng): number {
  switch (customer.segment) {
    case "supermarket":
      return rng.float(1.1, 2.6);
    case "distributor":
      return rng.float(0.8, 1.8);
    case "convenience":
      return rng.float(0.6, 1.4);
    case "hotel":
      return rng.float(0.35, 0.9);
    case "restaurant":
      return rng.float(0.2, 0.7);
    case "consolidator":
    default:
      return rng.float(0.1, 0.55);
  }
}

export function buildOrderLines(
  ctx: SalesContext,
  customer: Customer,
  orderDate: Date,
  scale: number,
): SalesOrderLine[] {
  const sellable = ctx.products.filter((p) => p.status === "active");
  const lineCount = Math.round(ctx.rng.normal(2 + scale * 1.6, 2, 1, 12));
  const picks = ctx.rng.pickMany(sellable, lineCount);

  return picks.map((product, index) => {
    // Case-moving accounts buy in multiples of the case pack.
    const caseSize = product.altUomConversion ?? 1;
    const cases = Math.max(1, Math.round(ctx.rng.normal(5 * scale, 4 * scale, 1, 90)));
    const qty =
      caseSize > 1
        ? cases * caseSize
        : Math.round(ctx.rng.normal(24 * scale, 20 * scale, 1, 400));

    const unitPrice = priceFor(ctx, product, customer.priceListId, qty);
    const discountPct = ctx.rng.bool(0.22) ? ctx.rng.pick([2, 2.5, 3, 5, 7.5]) : 0;
    const amounts = computeLineAmounts(qty, unitPrice, discountPct, product.vatType);

    return {
      id: `sol-${iso(orderDate)}-${index}-${product.id}`,
      productId: product.id,
      sku: product.sku,
      description: product.name,
      qty,
      uom: product.uom,
      unitPrice,
      discountPct,
      vatType: product.vatType,
      deliveredQty: 0,
      ...amounts,
    };
  });
}

/**
 * Orders per month, by segment. Distribution is a high-frequency, modest-ticket
 * trade: restaurants reorder weekly, consolidators every fortnight, and the
 * chains place scheduled drops per branch.
 */
export function monthlyOrderRate(customer: Customer, rng: Rng): number {
  switch (customer.segment) {
    case "supermarket":
    case "convenience":
      return rng.float(5.0, 8.5);
    case "distributor":
      return rng.float(3.2, 5.5);
    case "restaurant":
    case "hotel":
      return rng.float(3.5, 6.0);
    default:
      return rng.float(1.8, 3.6);
  }
}

export function behaviourFor(rng: Rng): PaymentBehaviour {
  return rng.weighted<PaymentBehaviour>([
    { value: "prompt", weight: 34 },
    { value: "average", weight: 40 },
    { value: "slow", weight: 20 },
    { value: "delinquent", weight: 6 },
  ]);
}

/** Days after the due date this customer typically settles. */
export function settlementDelay(behaviour: PaymentBehaviour, rng: Rng): number {
  switch (behaviour) {
    case "prompt":
      return rng.int(-6, 3);
    case "average":
      return rng.int(0, 14);
    case "slow":
      return rng.int(10, 45);
    case "delinquent":
      return rng.int(60, 150);
  }
}

/**
 * Walks 18 months day by day and produces the full document chain. Each order
 * progresses only as far as its age allows, so recent orders sit mid-flight and
 * old ones are settled — which is what gives the aging buckets real shape.
 */
