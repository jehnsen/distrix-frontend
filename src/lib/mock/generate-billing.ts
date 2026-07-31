import { addDays } from "date-fns";

import { sum, type Centavos } from "@/lib/money";
import { computeLineAmounts, summariseDocument } from "@/lib/mock/line-math";
import {
  iso,
  settlementDelay,
  stamp,
  type PaymentBehaviour,
  type SalesContext,
} from "@/lib/mock/sales-context";
import { notSubmitted } from "@/types/tax";
import { termsDays } from "@/types/common";
import type {
  Customer,
  DeliveryReceipt,
  Invoice,
  InvoiceLine,
  Payment,
  SalesOrder,
} from "@/types";

/**
 * The billing half of the sales chain: turning acknowledged deliveries into an
 * invoice, and the customer's payment behaviour into settlements against it.
 */

export function buildInvoice(
  ctx: SalesContext,
  order: SalesOrder,
  customer: Customer,
  drs: DeliveryReceipt[],
): Invoice {
  const { rng, series } = ctx;
  const lastDelivery = drs.reduce(
    (latest, dr) => (dr.deliveryDate > latest ? dr.deliveryDate : latest),
    drs[0]?.deliveryDate ?? order.orderDate,
  );
  const invoiceDate = addDays(new Date(lastDelivery), rng.int(0, 3));
  const siNo = series.next("SI", iso(invoiceDate));

  // Bill what actually shipped, not what was ordered.
  const shipped = new Map<string, number>();
  for (const dr of drs) {
    for (const line of dr.lines) {
      shipped.set(line.salesOrderLineId, (shipped.get(line.salesOrderLineId) ?? 0) + line.qtyShipped);
    }
  }

  const lines: InvoiceLine[] = order.lines
    .filter((line) => (shipped.get(line.id) ?? 0) > 0)
    .map((line, index) => {
      const qty = shipped.get(line.id) ?? 0;
      const amounts = computeLineAmounts(qty, line.unitPrice, line.discountPct, line.vatType);
      return {
        id: `sil-${siNo}-${index}`,
        productId: line.productId,
        sku: line.sku,
        description: line.description,
        qty,
        uom: line.uom,
        unitPrice: line.unitPrice,
        discountPct: line.discountPct,
        vatType: line.vatType,
        ...amounts,
      };
    });

  const amounts = summariseDocument(lines);
  const dueDate = addDays(invoiceDate, termsDays(customer.terms));

  return {
    id: `SI-${siNo}`,
    siNo,
    customerId: customer.id,
    salesOrderId: order.id,
    soNo: order.soNo,
    drIds: drs.map((dr) => dr.id),
    drNos: drs.map((dr) => dr.drNo),
    salesRepId: order.salesRepId,
    invoiceDate: iso(invoiceDate),
    dueDate: iso(dueDate),
    terms: customer.terms,
    lines,
    subtotal: amounts.subtotal,
    discount: amounts.discount,
    vatBreakdown: amounts.vat,
    amountDue: amounts.total,
    amountPaid: 0 as Centavos,
    creditApplied: 0 as Centavos,
    status: "open",
    createdAt: stamp(invoiceDate),
    createdById: "USR-004",
    createdByName: "Divina Ocampo",
    updatedAt: stamp(invoiceDate),
    auditTrail: [
      {
        id: `au-${siNo}-1`,
        at: stamp(invoiceDate),
        actorId: "USR-004",
        actorName: "Divina Ocampo",
        action: "issued the invoice",
        detail: `Against ${drs.map((dr) => dr.drNo).join(", ")}`,
      },
    ],
    attachments: [],
    // EIS: submission state stays "not_submitted" until BIR e-invoicing is wired.
    eis: notSubmitted(),
  };
}

export function buildPayments(
  ctx: SalesContext,
  invoice: Invoice,
  customer: Customer,
  behaviour: PaymentBehaviour,
): Payment[] {
  const { rng, series, today } = ctx;
  const dueDate = new Date(invoice.dueDate);
  const settleDate = addDays(dueDate, settlementDelay(behaviour, rng));
  if (settleDate > today) return [];

  // COD accounts settle on delivery; everyone else on their own schedule.
  const payDate = customer.terms === "COD" ? new Date(invoice.invoiceDate) : settleDate;
  if (payDate > today) return [];

  // Some settlements arrive in two tranches.
  const partial = rng.bool(0.14);
  const tranches = partial ? [rng.float(0.35, 0.7), 1] : [1];

  const built: Payment[] = [];
  let paidSoFar = 0 as Centavos;

  for (const [index, fraction] of tranches.entries()) {
    const trancheDate = addDays(payDate, index * rng.int(8, 30));
    if (trancheDate > today) break;

    const target = Math.round(invoice.amountDue * fraction) as Centavos;
    const amount = (target - paidSoFar) as Centavos;
    if (amount <= 0) continue;

    // Larger institutional buyers withhold 1% on goods.
    const withholds =
      (customer.segment === "supermarket" || customer.segment === "hotel") && rng.bool(0.6);
    const withheld = withholds
      ? (Math.round(invoice.vatBreakdown.vatableSales * 0.01 * fraction) as Centavos)
      : (0 as Centavos);
    const cash = (amount - withheld) as Centavos;

    const prNo = series.next("PR", iso(trancheDate));
    const method = rng.weighted<Payment["method"]>([
      { value: "check", weight: 42 },
      { value: "bank_transfer", weight: 38 },
      { value: "cash", weight: 14 },
      { value: "online", weight: 6 },
    ]);

    built.push({
      id: `PR-${prNo}`,
      prNo,
      customerId: customer.id,
      date: iso(trancheDate),
      method,
      reference:
        method === "check"
          ? String(rng.int(1000000, 9999999))
          : `TRF${rng.int(100000, 999999)}`,
      amount: cash,
      allocations: [
        {
          id: `pa-${prNo}-1`,
          invoiceId: invoice.id,
          siNo: invoice.siNo,
          amount,
        },
      ],
      status: "posted",
      receivedById: "USR-004",
      receivedByName: "Divina Ocampo",
      createdAt: stamp(trancheDate),
      createdById: "USR-004",
      createdByName: "Divina Ocampo",
      updatedAt: stamp(trancheDate),
      auditTrail: [],
      attachments: [],
      ...(method === "check"
        ? { checkDate: iso(trancheDate), bank: rng.pick(["BDO", "BPI", "Metrobank", "Landbank"]) }
        : {}),
      ...(withheld > 0
        ? { withholdingTax: { atcCode: "WC158", rateBp: 100, amount: withheld } }
        : {}),
    });

    paidSoFar = target;
  }

  // Post the settlements back onto the invoice.
  const credited = sum(built.flatMap((p) => p.allocations.map((a) => a.amount)));
  invoice.amountPaid = credited;

  return built;
}

