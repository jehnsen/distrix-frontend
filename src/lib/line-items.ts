import {
  add,
  applyBp,
  applyPct,
  multiplyQty,
  subtract,
  sum,
  VAT_RATE_BP,
  type Centavos,
} from "@/lib/money";

import type { VatType } from "@/types/tax";

/** Re-exported so the line editor has one import for everything it needs. */
export { VAT_TYPE_LABEL, VAT_TYPE_SHORT } from "@/types/tax";
export type { VatType };

export interface LineProduct {
  id: string;
  sku: string;
  name: string;
  uom: string;
  altUom?: string;
  /** How many base UoM in one altUom, e.g. 24 pieces per case. */
  altUomConversion?: number;
  unitPrice: Centavos;
  /** On-hand less reserved, in the active warehouse. Drives the stock warning. */
  available: number;
  vatType: VatType;
}

export interface LineItem {
  /** Stable client-side id; the row key and the focus target. */
  id: string;
  productId: string | null;
  qty: number;
  uom: string;
  unitPrice: Centavos;
  /** Whole percent as typed, e.g. 7.5. */
  discountPct: number;
  vatType: VatType;
}

export interface LineComputation {
  gross: Centavos;
  discount: Centavos;
  /** Net of discount, before VAT. */
  net: Centavos;
  vat: Centavos;
  /** What the line contributes to the document total. */
  total: Centavos;
}

export function computeLine(line: LineItem): LineComputation {
  const gross = multiplyQty(line.unitPrice, line.qty);
  const discount = applyPct(gross, line.discountPct);
  const net = subtract(gross, discount);
  const vat = line.vatType === "vatable" ? applyBp(net, VAT_RATE_BP) : (0 as Centavos);
  return { gross, discount, net, vat, total: add(net, vat) };
}

export interface LinesSummary {
  vatableSales: Centavos;
  vatExemptSales: Centavos;
  zeroRatedSales: Centavos;
  vatAmount: Centavos;
  discount: Centavos;
  subtotal: Centavos;
  total: Centavos;
  lineCount: number;
  totalQty: number;
}

/** Footer totals, recomputed on every keystroke. */
export function summariseLines(lines: readonly LineItem[]): LinesSummary {
  const filled = lines.filter((line) => line.productId !== null);
  const computed = filled.map((line) => ({ line, calc: computeLine(line) }));

  const byType = (type: VatType): Centavos =>
    sum(computed.filter((row) => row.line.vatType === type).map((row) => row.calc.net));

  const vatableSales = byType("vatable");
  const vatExemptSales = byType("exempt");
  const zeroRatedSales = byType("zero-rated");
  const vatAmount = sum(computed.map((row) => row.calc.vat));
  const discount = sum(computed.map((row) => row.calc.discount));
  const subtotal = add(vatableSales, vatExemptSales, zeroRatedSales);

  return {
    vatableSales,
    vatExemptSales,
    zeroRatedSales,
    vatAmount,
    discount,
    subtotal,
    total: add(subtotal, vatAmount),
    lineCount: filled.length,
    totalQty: filled.reduce((acc, line) => acc + line.qty, 0),
  };
}

export function emptyLine(): LineItem {
  return {
    id: `line-${Math.random().toString(36).slice(2, 10)}`,
    productId: null,
    qty: 1,
    uom: "",
    unitPrice: 0 as Centavos,
    discountPct: 0,
    vatType: "vatable",
  };
}

/** Applies a picked product's defaults without clobbering a typed quantity. */
export function applyProduct(line: LineItem, product: LineProduct): LineItem {
  return {
    ...line,
    productId: product.id,
    uom: product.uom,
    unitPrice: product.unitPrice,
    vatType: product.vatType,
  };
}

/**
 * Quantity beyond what is available. The editor warns rather than blocks:
 * a clerk taking an order for stock arriving tomorrow is doing their job.
 */
export function shortfall(line: LineItem, product: LineProduct | undefined): number {
  if (!product) return 0;
  return Math.max(0, line.qty - product.available);
}
