"use client";

import { getInvoice } from "@/lib/api";
import { formatDate, formatMoney, formatQty } from "@/lib/format";
import { termsLabel } from "@/types/common";
import { invoiceBalance } from "@/types/invoice";
import { VAT_TYPE_SHORT } from "@/types/tax";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  PrintHeader,
  PrintParty,
  PrintSheet,
  PrintSignatures,
} from "@/components/distrix/print/print-sheet";

export function InvoicePrint({ siNo }: { siNo: string }) {
  const { data, error, isInitialLoading } = useApiQuery(`print-si:${siNo}`, () =>
    getInvoice(siNo),
  );

  if (error) {
    return (
      <PrintSheet>
        <p className="py-16 text-center text-[11pt]">No invoice with reference {siNo}.</p>
      </PrintSheet>
    );
  }

  if (isInitialLoading || !data) {
    return (
      <PrintSheet>
        <p className="py-16 text-center text-[11pt] text-neutral-500">Preparing…</p>
      </PrintSheet>
    );
  }

  const { invoice, customer } = data;
  const vat = invoice.vatBreakdown;
  const balance = invoiceBalance(invoice);

  return (
    <PrintSheet>
      <PrintHeader
        docType="Sales Invoice"
        docNo={invoice.siNo}
        meta={[
          { label: "Date", value: formatDate(invoice.invoiceDate) },
          { label: "Due", value: formatDate(invoice.dueDate) },
          { label: "Terms", value: termsLabel(invoice.terms) },
        ]}
      />

      <PrintParty
        label="Bill to"
        name={customer.name}
        code={customer.code}
        tin={customer.tin}
        address={`${customer.address.line1}${customer.address.line2 ? `, ${customer.address.line2}` : ""}, ${customer.address.city}, ${customer.address.province} ${customer.address.postalCode}`}
        extra={[
          { label: "Order", value: invoice.soNo },
          { label: "Delivery receipts", value: invoice.drNos.join(", ") || "—" },
        ]}
      />

      <table className="mt-4 w-full border-collapse text-[9pt]">
        <thead>
          <tr className="border-b border-black">
            <th scope="col" className="w-8 py-1.5 text-left font-semibold">#</th>
            <th scope="col" className="w-24 py-1.5 text-left font-semibold">SKU</th>
            <th scope="col" className="py-1.5 text-left font-semibold">Description</th>
            <th scope="col" className="w-16 py-1.5 text-right font-semibold">Qty</th>
            <th scope="col" className="w-10 py-1.5 text-center font-semibold">VAT</th>
            <th scope="col" className="w-24 py-1.5 text-right font-semibold">Unit price</th>
            <th scope="col" className="w-14 py-1.5 text-right font-semibold">Disc</th>
            <th scope="col" className="w-28 py-1.5 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, index) => (
            <tr key={line.id} className="border-b border-neutral-200">
              <td className="py-1.5 font-mono tabular-nums">{index + 1}</td>
              <td className="py-1.5 font-mono tabular-nums">{line.sku}</td>
              <td className="py-1.5">{line.description}</td>
              <td className="py-1.5 text-right font-mono tabular-nums">
                {formatQty(line.qty)} {line.uom}
              </td>
              <td className="py-1.5 text-center font-mono">{VAT_TYPE_SHORT[line.vatType]}</td>
              <td className="py-1.5 text-right font-mono tabular-nums">
                {formatMoney(line.unitPrice)}
              </td>
              <td className="py-1.5 text-right font-mono tabular-nums">
                {line.discountPct === 0 ? "—" : `${line.discountPct}%`}
              </td>
              <td className="py-1.5 text-right font-mono font-medium tabular-nums">
                {formatMoney(line.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* The VAT breakdown block every Philippine invoice must carry. */}
      <section className="mt-4 flex items-start justify-between gap-8 break-inside-avoid">
        <table className="w-[85mm] border-collapse text-[8.5pt]">
          <caption className="pb-1 text-left text-[7.5pt] font-semibold uppercase tracking-wider text-neutral-500">
            VAT breakdown
          </caption>
          <tbody>
            <tr className="border-b border-neutral-200">
              <td className="py-1">VATable sales</td>
              <td className="py-1 text-right font-mono tabular-nums">
                {formatMoney(vat.vatableSales)}
              </td>
            </tr>
            <tr className="border-b border-neutral-200">
              <td className="py-1">VAT-exempt sales</td>
              <td className="py-1 text-right font-mono tabular-nums">
                {formatMoney(vat.vatExemptSales)}
              </td>
            </tr>
            <tr className="border-b border-neutral-200">
              <td className="py-1">Zero-rated sales</td>
              <td className="py-1 text-right font-mono tabular-nums">
                {formatMoney(vat.zeroRatedSales)}
              </td>
            </tr>
            <tr className="border-b border-neutral-300">
              <td className="py-1 font-medium">VAT (12%)</td>
              <td className="py-1 text-right font-mono font-medium tabular-nums">
                {formatMoney(vat.vatAmount)}
              </td>
            </tr>
          </tbody>
        </table>

        <table className="w-[75mm] border-collapse text-[9pt]">
          <tbody>
            <tr className="border-b border-neutral-200">
              <td className="py-1">Subtotal</td>
              <td className="py-1 text-right font-mono tabular-nums">
                {formatMoney(invoice.subtotal)}
              </td>
            </tr>
            {invoice.discount > 0 && (
              <tr className="border-b border-neutral-200">
                <td className="py-1">Discount</td>
                <td className="py-1 text-right font-mono tabular-nums">
                  ({formatMoney(invoice.discount)})
                </td>
              </tr>
            )}
            <tr className="border-b border-neutral-200">
              <td className="py-1">VAT</td>
              <td className="py-1 text-right font-mono tabular-nums">
                {formatMoney(vat.vatAmount)}
              </td>
            </tr>
            <tr className="border-y-2 border-black">
              <td className="py-1.5 text-[10pt] font-bold">Total due</td>
              <td className="py-1.5 text-right font-mono text-[11pt] font-bold tabular-nums">
                {formatMoney(invoice.amountDue, { symbol: true })}
              </td>
            </tr>
            {invoice.amountPaid + invoice.creditApplied > 0 && (
              <>
                <tr className="border-b border-neutral-200">
                  <td className="py-1">Less settled</td>
                  <td className="py-1 text-right font-mono tabular-nums">
                    ({formatMoney((invoice.amountPaid + invoice.creditApplied) as never)})
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-1.5 font-semibold">Balance</td>
                  <td className="py-1.5 text-right font-mono font-bold tabular-nums">
                    {formatMoney(balance, { symbol: true })}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </section>

      <p className="mt-4 text-[8pt] text-neutral-600">
        Payable within {termsLabel(invoice.terms).toLowerCase()} of the invoice date. Cheques
        payable to Pacific Pantry Distribution Inc. Please quote {invoice.siNo} on remittance.
      </p>

      <PrintSignatures
        blocks={[
          { label: "Prepared by", name: invoice.createdByName, note: "Accounting" },
          { label: "Approved by", note: "Authorised signatory" },
          { label: "Received by", note: "Name, signature and date" },
        ]}
      />

      <footer className="mt-6 border-t border-neutral-300 pt-2 text-[7.5pt] text-neutral-500">
        {/* EIS: the BIR e-invoicing QR payload and control number print here. */}
        {invoice.siNo} · THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAX UNLESS
        ACCOMPANIED BY AN OFFICIAL RECEIPT.
      </footer>
    </PrintSheet>
  );
}
