"use client";

import { add, subtract, type Centavos } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Money } from "@/components/distrix/money";

/**
 * The VAT breakdown every Philippine invoice must show: VATable, VAT-Exempt,
 * Zero-Rated and the 12% VAT itself, each as its own line.
 */
export interface VatBreakdown {
  vatableSales: Centavos;
  vatExemptSales: Centavos;
  zeroRatedSales: Centavos;
  vatAmount: Centavos;
}

export interface DocumentTotals {
  subtotal: Centavos;
  discount: Centavos;
  vat: VatBreakdown;
  total: Centavos;
  /** Invoices only: what has been collected and what is still owed. */
  amountPaid?: Centavos;
  /** Commissions and applicable expenses: expanded withholding tax. */
  ewt?: Centavos;
}

function Row({
  label,
  amount,
  emphasis = false,
  muted = false,
  indent = false,
  negative = false,
}: {
  label: string;
  amount: Centavos;
  emphasis?: boolean;
  muted?: boolean;
  indent?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-6 py-1",
        emphasis && "border-t border-border pt-2 mt-1",
      )}
    >
      <span
        className={cn(
          "text-base",
          muted ? "text-ink-muted" : "text-ink",
          emphasis && "font-semibold",
          indent && "pl-3",
        )}
      >
        {label}
      </span>
      <Money
        amount={negative ? (-amount as Centavos) : amount}
        weight={emphasis ? "semibold" : "regular"}
        tone={muted ? "muted" : "plain"}
        className={emphasis ? "text-xl" : undefined}
      />
    </div>
  );
}

/**
 * Right-hand totals panel on every document. Figures align on the decimal
 * because every amount goes through <Money>.
 */
export function TotalsPanel({
  totals,
  className,
}: {
  totals: DocumentTotals;
  className?: string;
}) {
  const { subtotal, discount, vat, total, amountPaid, ewt } = totals;
  const netDue = amountPaid === undefined ? null : subtract(total, amountPaid);
  const netPayable = ewt === undefined ? null : subtract(total, ewt);

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border bg-surface p-4 shadow-raised",
        className,
      )}
      aria-live="polite"
    >
      <h3 className="th-label pb-2">Totals</h3>

      <Row label="Subtotal" amount={subtotal} />
      {discount !== 0 && <Row label="Discount" amount={discount} negative muted />}

      {/* VAT breakdown — required on the printed document, so shown here too. */}
      <div className="mt-2 flex flex-col border-t border-border pt-2">
        <h4 className="th-label pb-1">VAT breakdown</h4>
        <Row label="VATable sales" amount={vat.vatableSales} indent muted />
        {vat.vatExemptSales !== 0 && (
          <Row label="VAT-exempt sales" amount={vat.vatExemptSales} indent muted />
        )}
        {vat.zeroRatedSales !== 0 && (
          <Row label="Zero-rated sales" amount={vat.zeroRatedSales} indent muted />
        )}
        <Row label="VAT (12%)" amount={vat.vatAmount} indent />
      </div>

      <Row label="Total" amount={total} emphasis />

      {amountPaid !== undefined && netDue !== null && (
        <>
          <Row label="Amount paid" amount={amountPaid} negative muted />
          <Row label="Amount due" amount={netDue} emphasis />
        </>
      )}

      {ewt !== undefined && netPayable !== null && (
        <>
          {/* EWT is a separate deduction line, never folded into the total. */}
          <Row label="Withholding tax (EWT)" amount={ewt} negative muted />
          <Row label="Net payable" amount={netPayable} emphasis />
        </>
      )}
    </div>
  );
}

/** Sums a set of line amounts into the shape the panel expects. */
export function buildTotals({
  vatableSales,
  vatExemptSales,
  zeroRatedSales,
  vatAmount,
  discount,
  amountPaid,
  ewt,
}: {
  vatableSales: Centavos;
  vatExemptSales: Centavos;
  zeroRatedSales: Centavos;
  vatAmount: Centavos;
  discount: Centavos;
  amountPaid?: Centavos;
  ewt?: Centavos;
}): DocumentTotals {
  const subtotal = add(vatableSales, vatExemptSales, zeroRatedSales);
  const total = subtract(add(subtotal, vatAmount), discount);
  return {
    subtotal,
    discount,
    vat: { vatableSales, vatExemptSales, zeroRatedSales, vatAmount },
    total,
    ...(amountPaid !== undefined ? { amountPaid } : {}),
    ...(ewt !== undefined ? { ewt } : {}),
  };
}
