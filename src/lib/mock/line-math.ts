import { add, applyBp, applyPct, multiplyQty, subtract, sum, VAT_RATE_BP, type Centavos } from "@/lib/money";
import type { VatBreakdown, VatType } from "@/types/tax";

/**
 * The one place line amounts are computed during seeding, so an order, its
 * delivery, its invoice and the credit note against it can never disagree by a
 * centavo. Mirrors `computeLine` in `src/lib/line-items.ts`, which is what the
 * editor uses at runtime.
 */

export interface ComputedLine {
  lineNet: Centavos;
  lineVat: Centavos;
  lineTotal: Centavos;
}

export function computeLineAmounts(
  qty: number,
  unitPrice: Centavos,
  discountPct: number,
  vatType: VatType,
): ComputedLine {
  const gross = multiplyQty(unitPrice, qty);
  const discount = applyPct(gross, discountPct);
  const lineNet = subtract(gross, discount);
  const lineVat = vatType === "vatable" ? applyBp(lineNet, VAT_RATE_BP) : (0 as Centavos);
  return { lineNet, lineVat, lineTotal: add(lineNet, lineVat) };
}

interface Summable {
  qty: number;
  unitPrice: Centavos;
  discountPct: number;
  vatType: VatType;
  lineNet: Centavos;
  lineVat: Centavos;
}

export interface DocumentAmounts {
  subtotal: Centavos;
  discount: Centavos;
  vat: VatBreakdown;
  total: Centavos;
}

/** Rolls a set of lines into the totals block every document carries. */
export function summariseDocument(lines: readonly Summable[]): DocumentAmounts {
  const byType = (type: VatType): Centavos =>
    sum(lines.filter((line) => line.vatType === type).map((line) => line.lineNet));

  const vatableSales = byType("vatable");
  const vatExemptSales = byType("exempt");
  const zeroRatedSales = byType("zero-rated");
  const vatAmount = sum(lines.map((line) => line.lineVat));
  const subtotal = add(vatableSales, vatExemptSales, zeroRatedSales);

  const discount = sum(
    lines.map((line) =>
      applyPct(multiplyQty(line.unitPrice, line.qty), line.discountPct),
    ),
  );

  return {
    subtotal,
    discount,
    vat: { vatableSales, vatExemptSales, zeroRatedSales, vatAmount },
    total: add(subtotal, vatAmount),
  };
}
