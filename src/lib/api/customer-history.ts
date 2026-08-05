import { read, requireRecord } from "@/lib/api/client";
import { sum, type Centavos } from "@/lib/money";
import type { AuditEntry, IsoDate } from "@/types";

/**
 * The Sales History ledger (§7): orders, deliveries, invoices, payments and
 * credit notes for one customer, interleaved in date order with a running
 * balance — one story rather than five tabs the user has to correlate by eye.
 */

export type LedgerKind =
  | "order"
  | "delivery"
  | "invoice"
  | "payment"
  | "credit_note"
  | "return";

export interface LedgerEntry {
  id: string;
  date: IsoDate;
  kind: LedgerKind;
  docNo: string;
  href: string;
  description: string;
  /** Quantity moved, where the document moves goods. */
  qty?: number;
  /** Increases what the customer owes. */
  debit: Centavos;
  /** Reduces it. */
  credit: Centavos;
  /** Only set on entries that affect the balance. */
  runningBalance?: Centavos;
  status: string;
}

/** Ordering within a day, so an invoice never appears before its delivery. */
const KIND_ORDER: Record<LedgerKind, number> = {
  order: 0,
  delivery: 1,
  invoice: 2,
  return: 3,
  credit_note: 4,
  payment: 5,
};

export function getCustomerLedger(customerId: string): Promise<LedgerEntry[]> {
  return read("the sales history", (database) => {
    const customer = requireRecord(
      database.customers.find((row) => row.id === customerId || row.code === customerId),
      "customer",
      customerId,
    );

    const zero = 0 as Centavos;
    const entries: Omit<LedgerEntry, "runningBalance">[] = [];

    for (const order of database.orders.filter((row) => row.customerId === customer.id)) {
      entries.push({
        id: order.id,
        date: order.orderDate,
        kind: "order",
        docNo: order.soNo,
        href: `/orders/${order.soNo}`,
        description: `${order.lines.length} line(s) ordered`,
        qty: order.lines.reduce((acc, line) => acc + line.qty, 0),
        debit: zero,
        credit: zero,
        status: order.status,
      });
    }

    for (const dr of database.deliveries.filter((row) => row.customerId === customer.id)) {
      entries.push({
        id: dr.id,
        date: dr.deliveryDate,
        kind: "delivery",
        docNo: dr.drNo,
        href: `/deliveries/${dr.drNo}`,
        description: `Against ${dr.soNo} · ${dr.driver}`,
        qty: dr.lines.reduce((acc, line) => acc + line.qtyShipped, 0),
        debit: zero,
        credit: zero,
        status: dr.status,
      });
    }

    for (const invoice of database.invoices.filter(
      (row) => row.customerId === customer.id && row.status !== "cancelled",
    )) {
      entries.push({
        id: invoice.id,
        date: invoice.invoiceDate,
        kind: "invoice",
        docNo: invoice.siNo,
        href: `/invoices/${invoice.siNo}`,
        description: `Due ${invoice.dueDate}`,
        debit: invoice.amountDue,
        credit: zero,
        status: invoice.status,
      });
    }

    for (const payment of database.payments.filter(
      (row) => row.customerId === customer.id && row.status === "posted",
    )) {
      entries.push({
        id: payment.id,
        date: payment.date,
        kind: "payment",
        docNo: payment.prNo,
        href: `/payments/${payment.prNo}`,
        description: `${payment.method} · ${payment.reference}`,
        debit: zero,
        credit: sum(payment.allocations.map((a) => a.amount)),
        status: payment.status,
      });
    }

    for (const sr of database.returns.filter((row) => row.customerId === customer.id)) {
      const isCredited = sr.status === "credited" && sr.creditNoteDate;
      entries.push({
        id: sr.id,
        date: isCredited ? (sr.creditNoteDate ?? sr.date) : sr.date,
        kind: isCredited ? "credit_note" : "return",
        docNo: isCredited ? (sr.creditNoteNo ?? sr.srNo) : sr.srNo,
        href: `/returns/${sr.srNo}`,
        description: sr.siNo ? `Against ${sr.siNo}` : "Standalone return",
        qty: sr.lines.reduce((acc, line) => acc + (line.qtyReceived ?? line.qtyClaimed), 0),
        debit: zero,
        // Only what was actually offset moves the balance.
        credit: isCredited ? (sr.creditApplied ?? sr.total) : zero,
        status: sr.status,
      });
    }

    entries.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        a.docNo.localeCompare(b.docNo),
    );

    let running = zero;
    return entries.map((entry) => {
      const affectsBalance = entry.debit !== 0 || entry.credit !== 0;
      if (!affectsBalance) return entry;
      running = (running + entry.debit - entry.credit) as Centavos;
      return { ...entry, runningBalance: running };
    });
  });
}

/** What this customer actually buys — the per-product purchase summary. */
export interface CustomerProductRow {
  productId: string;
  sku: string;
  description: string;
  uom: string;
  qty: number;
  value: Centavos;
  orderCount: number;
  lastOrdered: IsoDate;
  /** Share of the customer's total spend, 0–1. */
  share: number;
}

export function getCustomerProductSummary(customerId: string): Promise<CustomerProductRow[]> {
  return read("the purchase summary", (database) => {
    const customer = requireRecord(
      database.customers.find((row) => row.id === customerId || row.code === customerId),
      "customer",
      customerId,
    );

    const rows = new Map<string, CustomerProductRow>();

    for (const invoice of database.invoices.filter(
      (row) => row.customerId === customer.id && row.status !== "cancelled",
    )) {
      for (const line of invoice.lines) {
        const row = rows.get(line.productId) ?? {
          productId: line.productId,
          sku: line.sku,
          description: line.description,
          uom: line.uom,
          qty: 0,
          value: 0 as Centavos,
          orderCount: 0,
          lastOrdered: invoice.invoiceDate,
          share: 0,
        };
        row.qty += line.qty;
        row.value = (row.value + line.lineNet) as Centavos;
        row.orderCount += 1;
        if (invoice.invoiceDate > row.lastOrdered) row.lastOrdered = invoice.invoiceDate;
        rows.set(line.productId, row);
      }
    }

    const list = [...rows.values()].sort((a, b) => b.value - a.value);
    const total = sum(list.map((row) => row.value));
    for (const row of list) row.share = total === 0 ? 0 : row.value / total;
    return list;
  });
}

/**
 * Activity log. Master records accrue audit entries of their own, and the
 * documents raised against them are activity too — a credit-limit change and
 * the order it unblocked belong on the same timeline.
 */
export function getCustomerActivity(customerId: string): Promise<AuditEntry[]> {
  return read("the activity log", (database) => {
    const customer = requireRecord(
      database.customers.find((row) => row.id === customerId || row.code === customerId),
      "customer",
      customerId,
    );

    const fromDocuments: AuditEntry[] = [
      ...database.orders
        .filter((row) => row.customerId === customer.id)
        .flatMap((order) =>
          order.auditTrail.map((entry) => ({
            ...entry,
            action: `${entry.action} on ${order.soNo}`,
          })),
        ),
      ...database.invoices
        .filter((row) => row.customerId === customer.id)
        .flatMap((invoice) =>
          invoice.auditTrail.map((entry) => ({
            ...entry,
            action: `${entry.action} ${invoice.siNo}`,
          })),
        ),
      ...database.returns
        .filter((row) => row.customerId === customer.id)
        .flatMap((sr) =>
          sr.auditTrail.map((entry) => ({
            ...entry,
            action: `${entry.action} ${sr.srNo}`,
          })),
        ),
    ];

    return [...customer.auditTrail, ...fromDocuments]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 120);
  });
}
