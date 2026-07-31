import { addDays, differenceInCalendarDays, subMonths } from "date-fns";

import { DRIVERS } from "@/lib/mock/catalogues";
import { buildInvoice, buildPayments } from "@/lib/mock/generate-billing";
import {
  behaviourFor,
  buildOrderLines,
  iso,
  monthlyOrderRate,
  orderScale,
  stamp,
  warehouseFor,
  type PaymentBehaviour,
  type SalesChain,
  type SalesContext,
} from "@/lib/mock/sales-context";
import { summariseDocument } from "@/lib/mock/line-math";
import type {
  Customer,
  DeliveryReceipt,
  DeliveryReceiptLine,
  Invoice,
  Payment,
  SalesOrder,
} from "@/types";

/**
 * Walks 18 months day by day and produces the full document chain. Each order
 * progresses only as far as its age allows, so recent orders sit mid-flight and
 * old ones are settled — which is what gives the aging buckets real shape and
 * the dispatch board real work on it.
 */
export function generateSalesChain(ctx: SalesContext): SalesChain {
  const { rng, series, today } = ctx;
  const start = subMonths(today, 18);

  const orders: SalesOrder[] = [];
  const deliveries: DeliveryReceipt[] = [];
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  const behaviours = new Map<string, PaymentBehaviour>();

  const active = ctx.customers.filter((c) => c.status !== "inactive");
  for (const customer of active) behaviours.set(customer.id, behaviourFor(rng));

  // Order dates first, so numbering runs in true chronological order.
  const scheduled: { customer: Customer; date: Date }[] = [];
  const totalMonths = 18;
  // Months are not 30 days. Spreading over the real span is what keeps orders
  // running right up to today, which is what fills the dispatch board.
  const spanDays = differenceInCalendarDays(today, start);

  for (const customer of active) {
    const rate = monthlyOrderRate(customer, rng);
    for (let month = 0; month < totalMonths; month++) {
      // Trade grows modestly across the period, so charts have a slope.
      const growth = 0.85 + (month / totalMonths) * 0.35;
      const count = Math.round(rng.normal(rate * growth, 1.2, 0, 12));
      for (let i = 0; i < count; i++) {
        const offset = Math.floor((spanDays * (month + rng.next())) / totalMonths);
        const date = addDays(start, offset);
        if (date <= today) scheduled.push({ customer, date });
      }
    }
  }

  scheduled.sort((a, b) => a.date.getTime() - b.date.getTime());

  const scaleByCustomer = new Map(active.map((c) => [c.id, orderScale(c, rng)]));

  for (const { customer, date: orderDate } of scheduled) {
    // Individual orders vary around the account's usual size.
    const scale = (scaleByCustomer.get(customer.id) ?? 1) * rng.float(0.55, 1.9);
    const lines = buildOrderLines(ctx, customer, orderDate, scale);
    if (lines.length === 0) continue;

    const warehouse = warehouseFor(ctx, customer);
    const amounts = summariseDocument(lines);
    const ageDays = differenceInCalendarDays(today, orderDate);
    const soNo = series.next("SO", iso(orderDate));

    const order: SalesOrder = {
      id: `SO-${soNo}`,
      soNo,
      customerId: customer.id,
      warehouseId: warehouse.id,
      salesRepId: customer.salesRepId,
      orderDate: iso(orderDate),
      requiredDate: iso(addDays(orderDate, rng.int(3, 14))),
      terms: customer.terms,
      lines,
      subtotal: amounts.subtotal,
      discount: amounts.discount,
      vat: amounts.vat,
      total: amounts.total,
      status: "confirmed",
      createdAt: stamp(orderDate),
      createdById: "USR-002",
      createdByName: "Marisol Bituin",
      updatedAt: stamp(orderDate),
      auditTrail: [
        {
          id: `au-${soNo}-1`,
          at: stamp(orderDate),
          actorId: "USR-002",
          actorName: "Marisol Bituin",
          action: "created the order",
        },
      ],
      attachments: [],
      ...(rng.bool(0.4) ? { customerRef: `PO-${rng.int(10000, 99999)}` } : {}),
    };

    // Orders taken in the last fortnight are still working through the
    // warehouse. This is what fills the dispatch board and the "awaiting
    // dispatch" tile — without it every order in the system reads as invoiced.
    if (ageDays < 4) {
      order.status = ageDays < 1 && rng.bool(0.45) ? "draft" : "confirmed";
      orders.push(order);
      continue;
    }

    // Roughly one order in forty is cancelled outright.
    if (rng.bool(0.025)) {
      order.status = "cancelled";
      order.auditTrail.push({
        id: `au-${soNo}-x`,
        at: stamp(addDays(orderDate, 1)),
        actorId: "USR-002",
        actorName: "Marisol Bituin",
        action: "cancelled the order",
        detail: rng.pick([
          "Customer cancelled by phone",
          "Stock unavailable within the required date",
          "Duplicate of another order",
        ]),
      });
      orders.push(order);
      continue;
    }

    const { drs, fullyDelivered } = buildDeliveries(ctx, order, customer, orderDate, ageDays);
    deliveries.push(...drs);

    // A short shipment usually ends there — the customer takes what arrived and
    // the order closes. The rest stay open for the balance to follow.
    const closedShort = !fullyDelivered && drs.length > 0 && rng.bool(0.78);
    const complete = fullyDelivered || closedShort;

    order.status = complete
      ? "delivered"
      : drs.length > 0
        ? "partially_delivered"
        : "confirmed";

    // Deliveries acknowledged in the last few days are not billed yet.
    const billable = drs.filter((dr) => dr.status === "acknowledged");
    if (billable.length > 0 && ageDays > 5 && complete) {
      const invoice = buildInvoice(ctx, order, customer, billable);
      invoices.push(invoice);
      order.status = "invoiced";
      for (const dr of billable) dr.invoiceId = invoice.id;

      const behaviour = behaviours.get(customer.id) ?? "average";
      payments.push(...buildPayments(ctx, invoice, customer, behaviour));
    }

    orders.push(order);
  }

  return { orders, deliveries, invoices, payments, behaviours };
}

function buildDeliveries(
  ctx: SalesContext,
  order: SalesOrder,
  customer: Customer,
  orderDate: Date,
  ageDays: number,
): { drs: DeliveryReceipt[]; fullyDelivered: boolean } {
  const { rng, series, today } = ctx;
  const drs: DeliveryReceipt[] = [];

  // Most orders ship in one drop; larger ones split across two.
  const splitDelivery = order.lines.length > 4 && rng.bool(0.22);
  const batches = splitDelivery
    ? [order.lines.slice(0, Math.ceil(order.lines.length / 2)), order.lines.slice(Math.ceil(order.lines.length / 2))]
    : [order.lines];

  let fullyDelivered = true;

  for (const [batchIndex, batch] of batches.entries()) {
    const deliveryDate = addDays(orderDate, rng.int(1, 6) + batchIndex * rng.int(4, 20));
    // Deliveries scheduled beyond three days out have not been cut yet.
    if (differenceInCalendarDays(deliveryDate, today) > 3) {
      fullyDelivered = false;
      continue;
    }

    const driver = rng.pick(DRIVERS);
    const drNo = series.next("DR", iso(deliveryDate));
    const lines: DeliveryReceiptLine[] = batch.map((line, index) => {
      // One line in fourteen ships short — the warehouse ran out.
      const short = rng.bool(0.07);
      const qtyShipped = short
        ? Math.max(1, Math.floor(line.qty * rng.float(0.4, 0.9)))
        : line.qty;
      if (qtyShipped < line.qty) fullyDelivered = false;
      line.deliveredQty += qtyShipped;

      return {
        id: `drl-${drNo}-${index}`,
        salesOrderLineId: line.id,
        productId: line.productId,
        sku: line.sku,
        description: line.description,
        qtyOrdered: line.qty,
        qtyShipped,
        uom: line.uom,
        ...(short
          ? {
              shortReason: rng.pick([
                "Insufficient stock at picking",
                "Damaged cases pulled at loading",
                "Customer accepted partial",
              ]),
            }
          : {}),
      };
    });

    // The dispatch board is the last few days: drafts waiting to be loaded,
    // trucks out today, drops delivered but not yet signed for.
    const sinceDelivery = differenceInCalendarDays(today, deliveryDate);
    const status: DeliveryReceipt["status"] =
      sinceDelivery < 0
        ? "draft"
        : sinceDelivery === 0
          ? rng.bool(0.6)
            ? "dispatched"
            : "draft"
          : sinceDelivery === 1
            ? rng.bool(0.5)
              ? "dispatched"
              : "delivered"
            : sinceDelivery <= 3
              ? rng.bool(0.45)
                ? "delivered"
                : "acknowledged"
              : "acknowledged";

    const dr: DeliveryReceipt = {
      id: `DR-${drNo}`,
      drNo,
      salesOrderId: order.id,
      soNo: order.soNo,
      customerId: customer.id,
      warehouseId: order.warehouseId,
      deliveryDate: iso(deliveryDate),
      driver: driver.name,
      plateNo: driver.plate,
      dropSequence: rng.int(1, 8),
      lines,
      status,
      createdAt: stamp(deliveryDate),
      createdById: "USR-003",
      createdByName: "Nestor Alcantara",
      updatedAt: stamp(deliveryDate),
      auditTrail: [],
      attachments: [],
      ...(status === "acknowledged"
        ? {
            receivedBy: rng.pick(customer.contacts).name,
            receivedAt: stamp(addDays(deliveryDate, 0)),
          }
        : {}),
    };

    drs.push(dr);
  }

  if (ageDays < 2) fullyDelivered = false;
  return { drs, fullyDelivered };
}


export type { PaymentBehaviour, SalesChain } from "@/lib/mock/sales-context";
