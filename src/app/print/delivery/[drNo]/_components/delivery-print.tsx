"use client";

import { getDelivery } from "@/lib/api";
import { formatDate, formatQty } from "@/lib/format";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  PrintHeader,
  PrintParty,
  PrintSheet,
  PrintSignatures,
} from "@/components/distrix/print/print-sheet";

export function DeliveryPrint({ drNo }: { drNo: string }) {
  const { data, error, isInitialLoading } = useApiQuery(`print-dr:${drNo}`, () =>
    getDelivery(drNo),
  );

  if (error) {
    return (
      <PrintSheet>
        <p className="py-16 text-center text-[11pt]">
          No delivery receipt with reference {drNo}.
        </p>
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

  const { delivery, customer } = data;
  const totalShipped = delivery.lines.reduce((acc, line) => acc + line.qtyShipped, 0);
  const hasShort = delivery.lines.some((line) => line.qtyShipped < line.qtyOrdered);

  return (
    <PrintSheet>
      <PrintHeader
        docType="Delivery Receipt"
        docNo={delivery.drNo}
        meta={[
          { label: "Date", value: formatDate(delivery.deliveryDate) },
          { label: "Order", value: delivery.soNo },
          { label: "Drop", value: String(delivery.dropSequence) },
        ]}
      />

      <PrintParty
        label="Deliver to"
        name={customer.name}
        code={customer.code}
        tin={customer.tin}
        address={`${customer.address.line1}${customer.address.line2 ? `, ${customer.address.line2}` : ""}, ${customer.address.city}, ${customer.address.province} ${customer.address.postalCode}`}
        extra={[
          { label: "Driver", value: delivery.driver },
          { label: "Plate no.", value: delivery.plateNo },
          { label: "Total units", value: formatQty(totalShipped) },
        ]}
      />

      <table className="mt-4 w-full border-collapse text-[9pt]">
        <thead>
          <tr className="border-b border-black">
            <th scope="col" className="w-10 py-1.5 text-left font-semibold">
              #
            </th>
            <th scope="col" className="w-28 py-1.5 text-left font-semibold">
              SKU
            </th>
            <th scope="col" className="py-1.5 text-left font-semibold">
              Description
            </th>
            <th scope="col" className="w-20 py-1.5 text-right font-semibold">
              Ordered
            </th>
            <th scope="col" className="w-20 py-1.5 text-right font-semibold">
              Shipped
            </th>
            <th scope="col" className="w-14 py-1.5 text-left font-semibold">
              UoM
            </th>
          </tr>
        </thead>
        <tbody>
          {delivery.lines.map((line, index) => (
            <tr key={line.id} className="border-b border-neutral-200">
              <td className="py-1.5 font-mono tabular-nums">{index + 1}</td>
              <td className="py-1.5 font-mono tabular-nums">{line.sku}</td>
              <td className="py-1.5">
                {line.description}
                {line.shortReason && (
                  <span className="block text-[7.5pt] text-neutral-500">
                    Short: {line.shortReason}
                  </span>
                )}
              </td>
              <td className="py-1.5 text-right font-mono tabular-nums">
                {formatQty(line.qtyOrdered)}
              </td>
              <td className="py-1.5 text-right font-mono font-semibold tabular-nums">
                {formatQty(line.qtyShipped)}
              </td>
              <td className="py-1.5 font-mono">{line.uom}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black">
            <td colSpan={4} className="py-2 text-right font-semibold">
              Total units shipped
            </td>
            <td className="py-2 text-right font-mono text-[11pt] font-bold tabular-nums">
              {formatQty(totalShipped)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>

      {hasShort && (
        <p className="mt-3 border border-neutral-400 px-3 py-2 text-[8.5pt]">
          One or more lines shipped short of the quantity ordered. The balance remains
          outstanding on {delivery.soNo}.
        </p>
      )}

      <p className="mt-4 text-[8pt] text-neutral-600">
        Received the goods listed above in good order and condition. Claims for shortage or
        damage must be noted on this receipt at the time of delivery.
      </p>

      <PrintSignatures
        blocks={[
          { label: "Issued by", name: delivery.createdByName, note: "Warehouse" },
          { label: "Delivered by", name: delivery.driver, note: delivery.plateNo },
          {
            label: "Received by",
            ...(delivery.receivedBy ? { name: delivery.receivedBy } : {}),
            note: "Name, signature and date",
          },
        ]}
      />

      <footer className="mt-6 border-t border-neutral-300 pt-2 text-[7.5pt] text-neutral-500">
        {delivery.drNo} · This document is not an invoice. Goods remain the property of{" "}
        Pacific Pantry Distribution Inc. until paid for in full.
      </footer>
    </PrintSheet>
  );
}
