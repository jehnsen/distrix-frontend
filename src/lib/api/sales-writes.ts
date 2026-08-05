import { addDays, formatISO } from "date-fns";

import { ApiError, read, requireRecord, ValidationError, write } from "@/lib/api/client";
import { computeLineAmounts, summariseDocument } from "@/lib/mock/line-math";
import type { Centavos } from "@/lib/money";
import {
  deliveryReceiptSchema,
  invoiceSchema,
  salesOrderSchema,
} from "@/lib/schemas/sales";
import { termsDays } from "@/types/common";
import { notSubmitted } from "@/types/tax";
import type {
  AuditEntry,
  DeliveryReceipt,
  DeliveryReceiptLine,
  Invoice,
  InvoiceLine,
  SalesOrder,
  SalesOrderLine,
} from "@/types";
import type { Database } from "@/lib/mock/db";

const CURRENT_USER = { id: "USR-002", name: "Marisol Bituin" };
const WAREHOUSE_USER = { id: "USR-003", name: "Nestor Alcantara" };
const ACCOUNTS_USER = { id: "USR-004", name: "Divina Ocampo" };

const iso = (date: Date): string => formatISO(date, { representation: "date" });

function audit(
  actor: { id: string; name: string },
  action: string,
  detail?: string,
): AuditEntry {
  return {
    id: `au-${Math.random().toString(36).slice(2, 10)}`,
    at: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    action,
    ...(detail ? { detail } : {}),
  };
}

/** Next number in a series, following the same shape the seed uses. */
function nextNumber(prefix: string, existing: string[], isoDate: string): string {
  const year = isoDate.slice(0, 4);
  const highest = existing
    .filter((no) => no.startsWith(`${prefix}-${year}-`))
    .map((no) => Number(no.split("-")[2] ?? 0))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${prefix}-${year}-${String(highest + 1).padStart(4, "0")}`;
}

function fieldErrors(error: { flatten: () => { fieldErrors: unknown } }) {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

/* -------------------------------------------------------------------------
   Sales orders
   ------------------------------------------------------------------------- */

export function createSalesOrder(input: unknown): Promise<SalesOrder> {
  return write("sales order", (database) => {
    const parsed = salesOrderSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("sales order", fieldErrors(parsed.error));
    const data = parsed.data;

    const customer = requireRecord(
      database.customers.find((row) => row.id === data.customerId),
      "customer",
      data.customerId,
    );

    const products = new Map(database.products.map((p) => [p.id, p]));
    const lines: SalesOrderLine[] = data.lines.map((line, index) => {
      const product = products.get(line.productId);
      const amounts = computeLineAmounts(
        line.qty,
        line.unitPrice as Centavos,
        line.discountPct,
        line.vatType,
      );
      return {
        id: `sol-new-${index}`,
        productId: line.productId,
        sku: product?.sku ?? line.sku,
        description: product?.name ?? line.description,
        qty: line.qty,
        uom: line.uom,
        unitPrice: line.unitPrice as Centavos,
        discountPct: line.discountPct,
        vatType: line.vatType,
        deliveredQty: 0,
        ...amounts,
      };
    });

    const amounts = summariseDocument(lines);
    const soNo = nextNumber(
      "SO",
      database.orders.map((row) => row.soNo),
      data.orderDate,
    );
    const now = new Date().toISOString();

    const order: SalesOrder = {
      id: `SO-${soNo}`,
      soNo,
      customerId: customer.id,
      warehouseId: data.warehouseId,
      salesRepId: data.salesRepId,
      orderDate: data.orderDate,
      requiredDate: data.requiredDate,
      terms: data.terms as SalesOrder["terms"],
      lines,
      subtotal: amounts.subtotal,
      discount: amounts.discount,
      vat: amounts.vat,
      total: amounts.total,
      status: "draft",
      createdAt: now,
      createdById: CURRENT_USER.id,
      createdByName: CURRENT_USER.name,
      updatedAt: now,
      auditTrail: [audit(CURRENT_USER, "created the order")],
      attachments: [],
      ...(data.customerRef ? { customerRef: data.customerRef } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
    };

    database.orders.push(order);
    return order;
  });
}

/**
 * Confirming reserves stock. An order for a customer over its credit limit can
 * still be taken — the spec is explicit that the breach warns rather than
 * blocks — but the override is recorded on the document.
 */
export function confirmSalesOrder(id: string, overrideCredit = false): Promise<SalesOrder> {
  return write("sales order", (database) => {
    const order = findOrder(database, id);
    if (order.status !== "draft") {
      throw new ApiError("sales order", `${order.soNo} is already ${order.status}.`, 409);
    }

    const customer = requireRecord(
      database.customers.find((row) => row.id === order.customerId),
      "customer",
      order.customerId,
    );

    const wouldExceed = customer.currentBalance + order.total > customer.creditLimit;
    if (wouldExceed && !overrideCredit) {
      throw new ApiError(
        "sales order",
        `${customer.name} would exceed its credit limit. A manager must approve the breach.`,
        409,
      );
    }

    order.status = "confirmed";
    order.updatedAt = new Date().toISOString();
    order.auditTrail.push(audit(CURRENT_USER, "confirmed the order"));

    if (wouldExceed) {
      order.creditOverrideById = "USR-001";
      order.creditOverrideByName = "Ramon Dimaculangan";
      order.auditTrail.push(
        audit(
          { id: "USR-001", name: "Ramon Dimaculangan" },
          "approved the credit-limit breach",
          `Balance would reach ${((customer.currentBalance + order.total) / 100).toFixed(2)} against a limit of ${(customer.creditLimit / 100).toFixed(2)}`,
        ),
      );
    }

    reserveStock(database, order);
    return order;
  });
}

export function cancelSalesOrder(id: string, reason: string): Promise<SalesOrder> {
  return write("sales order", (database) => {
    const order = findOrder(database, id);
    if (order.status === "invoiced" || order.status === "cancelled") {
      throw new ApiError(
        "sales order",
        `${order.soNo} is ${order.status} and can no longer be cancelled.`,
        409,
      );
    }

    order.status = "cancelled";
    order.updatedAt = new Date().toISOString();
    order.auditTrail.push(audit(CURRENT_USER, "cancelled the order", reason));
    releaseStock(database, order);
    return order;
  });
}

/* -------------------------------------------------------------------------
   Delivery receipts
   ------------------------------------------------------------------------- */

export function createDeliveryReceipt(input: unknown): Promise<DeliveryReceipt> {
  return write("delivery receipt", (database) => {
    const parsed = deliveryReceiptSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("delivery receipt", fieldErrors(parsed.error));
    }
    const data = parsed.data;
    const order = findOrder(database, data.salesOrderId);

    if (order.status !== "confirmed" && order.status !== "partially_delivered") {
      throw new ApiError(
        "delivery receipt",
        `${order.soNo} is ${order.status}; nothing can be shipped against it.`,
        409,
      );
    }

    // Never ship more than the order still owes.
    for (const line of data.lines) {
      const orderLine = order.lines.find((row) => row.id === line.salesOrderLineId);
      if (!orderLine) continue;
      const outstanding = orderLine.qty - orderLine.deliveredQty;
      if (line.qtyShipped > outstanding) {
        throw new ApiError(
          "delivery receipt",
          `${orderLine.sku} has only ${outstanding} left to ship on ${order.soNo}.`,
          409,
        );
      }
    }

    const drNo = nextNumber(
      "DR",
      database.deliveries.map((row) => row.drNo),
      data.deliveryDate,
    );
    const now = new Date().toISOString();

    const lines: DeliveryReceiptLine[] = data.lines
      .filter((line) => line.qtyShipped > 0)
      .map((line, index) => ({
        id: `drl-${drNo}-${index}`,
        salesOrderLineId: line.salesOrderLineId,
        productId: line.productId,
        sku: line.sku,
        description: line.description,
        qtyOrdered: line.qtyOrdered,
        qtyShipped: line.qtyShipped,
        uom: line.uom,
        ...(line.shortReason ? { shortReason: line.shortReason } : {}),
      }));

    const delivery: DeliveryReceipt = {
      id: `DR-${drNo}`,
      drNo,
      salesOrderId: order.id,
      soNo: order.soNo,
      customerId: order.customerId,
      warehouseId: data.warehouseId,
      deliveryDate: data.deliveryDate,
      driver: data.driver,
      plateNo: data.plateNo.toUpperCase(),
      dropSequence: data.dropSequence,
      lines,
      status: "draft",
      createdAt: now,
      createdById: WAREHOUSE_USER.id,
      createdByName: WAREHOUSE_USER.name,
      updatedAt: now,
      auditTrail: [audit(WAREHOUSE_USER, "cut the delivery receipt")],
      attachments: [],
      ...(data.notes ? { notes: data.notes } : {}),
    };

    // Roll the shipped quantities up onto the order.
    for (const line of lines) {
      const orderLine = order.lines.find((row) => row.id === line.salesOrderLineId);
      if (orderLine) orderLine.deliveredQty += line.qtyShipped;
    }
    order.status = order.lines.every((line) => line.deliveredQty >= line.qty)
      ? "delivered"
      : "partially_delivered";
    order.updatedAt = now;

    database.deliveries.push(delivery);
    applyStockMovement(database, delivery, -1);
    return delivery;
  });
}

export function dispatchDelivery(
  id: string,
  driver: string,
  plateNo: string,
): Promise<DeliveryReceipt> {
  return write("delivery receipt", (database) => {
    const delivery = findDelivery(database, id);
    if (delivery.status !== "draft") {
      throw new ApiError(
        "delivery receipt",
        `${delivery.drNo} has already left the warehouse.`,
        409,
      );
    }
    delivery.driver = driver;
    delivery.plateNo = plateNo.toUpperCase();
    delivery.status = "dispatched";
    delivery.updatedAt = new Date().toISOString();
    delivery.auditTrail.push(
      audit(WAREHOUSE_USER, "dispatched the delivery", `${driver} · ${plateNo}`),
    );
    return delivery;
  });
}

export function markDelivered(id: string): Promise<DeliveryReceipt> {
  return write("delivery receipt", (database) => {
    const delivery = findDelivery(database, id);
    if (delivery.status !== "dispatched") {
      throw new ApiError(
        "delivery receipt",
        `${delivery.drNo} is ${delivery.status}, not out for delivery.`,
        409,
      );
    }
    delivery.status = "delivered";
    delivery.updatedAt = new Date().toISOString();
    delivery.auditTrail.push(audit(WAREHOUSE_USER, "marked the delivery delivered"));
    return delivery;
  });
}

export interface AcknowledgementInput {
  receivedBy: string;
  signatureRef?: string;
  /** Short-acceptance at the customer's gate, per line. */
  lines: { id: string; qtyAccepted: number; shortReason?: string }[];
}

export function acknowledgeDelivery(
  id: string,
  input: AcknowledgementInput,
): Promise<DeliveryReceipt> {
  return write("delivery receipt", (database) => {
    const delivery = findDelivery(database, id);
    if (delivery.status !== "delivered" && delivery.status !== "dispatched") {
      throw new ApiError(
        "delivery receipt",
        `${delivery.drNo} cannot be acknowledged from ${delivery.status}.`,
        409,
      );
    }
    if (input.receivedBy.trim().length < 2) {
      throw new ValidationError("delivery receipt", {
        receivedBy: ["Who signed for the delivery?"],
      });
    }

    let shortfall = 0;
    for (const entry of input.lines) {
      const line = delivery.lines.find((row) => row.id === entry.id);
      if (!line) continue;
      if (entry.qtyAccepted > line.qtyShipped) {
        throw new ApiError(
          "delivery receipt",
          `${line.sku}: cannot accept more than the ${line.qtyShipped} shipped.`,
          409,
        );
      }
      line.qtyAccepted = entry.qtyAccepted;
      if (entry.shortReason) line.shortReason = entry.shortReason;
      shortfall += line.qtyShipped - entry.qtyAccepted;
    }

    delivery.status = "acknowledged";
    delivery.receivedBy = input.receivedBy.trim();
    delivery.receivedAt = new Date().toISOString();
    if (input.signatureRef) delivery.signatureRef = input.signatureRef;
    delivery.updatedAt = delivery.receivedAt;
    delivery.auditTrail.push(
      audit(
        WAREHOUSE_USER,
        "captured the acknowledgement",
        shortfall > 0
          ? `${delivery.receivedBy} signed, ${shortfall} unit(s) short`
          : `${delivery.receivedBy} signed in full`,
      ),
    );
    return delivery;
  });
}

/* -------------------------------------------------------------------------
   Invoices
   ------------------------------------------------------------------------- */

export function createInvoice(input: unknown): Promise<Invoice> {
  return write("invoice", (database) => {
    const parsed = invoiceSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("invoice", fieldErrors(parsed.error));
    const data = parsed.data;

    const order = findOrder(database, data.salesOrderId);
    const customer = requireRecord(
      database.customers.find((row) => row.id === data.customerId),
      "customer",
      data.customerId,
    );

    const deliveries = data.drIds.map((drId) =>
      requireRecord(
        database.deliveries.find((row) => row.id === drId),
        "delivery receipt",
        drId,
      ),
    );

    for (const delivery of deliveries) {
      if (delivery.invoiceId) {
        throw new ApiError(
          "invoice",
          `${delivery.drNo} has already been billed.`,
          409,
        );
      }
    }

    // Bill what the customer actually accepted, falling back to what shipped.
    const billed = new Map<string, number>();
    for (const delivery of deliveries) {
      for (const line of delivery.lines) {
        const qty = line.qtyAccepted ?? line.qtyShipped;
        billed.set(line.salesOrderLineId, (billed.get(line.salesOrderLineId) ?? 0) + qty);
      }
    }

    const siNo = nextNumber(
      "SI",
      database.invoices.map((row) => row.siNo),
      data.invoiceDate,
    );

    const lines: InvoiceLine[] = order.lines
      .filter((line) => (billed.get(line.id) ?? 0) > 0)
      .map((line, index) => {
        const qty = billed.get(line.id) ?? 0;
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
          ...computeLineAmounts(qty, line.unitPrice, line.discountPct, line.vatType),
        };
      });

    if (lines.length === 0) {
      throw new ApiError("invoice", "Those delivery receipts have nothing to bill.", 409);
    }

    const amounts = summariseDocument(lines);
    const now = new Date().toISOString();

    const invoice: Invoice = {
      id: `SI-${siNo}`,
      siNo,
      customerId: customer.id,
      salesOrderId: order.id,
      soNo: order.soNo,
      drIds: deliveries.map((dr) => dr.id),
      drNos: deliveries.map((dr) => dr.drNo),
      salesRepId: order.salesRepId,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      terms: data.terms as Invoice["terms"],
      lines,
      subtotal: amounts.subtotal,
      discount: amounts.discount,
      vatBreakdown: amounts.vat,
      amountDue: amounts.total,
      amountPaid: 0 as Centavos,
      creditApplied: 0 as Centavos,
      status: "open",
      createdAt: now,
      createdById: ACCOUNTS_USER.id,
      createdByName: ACCOUNTS_USER.name,
      updatedAt: now,
      auditTrail: [
        audit(
          ACCOUNTS_USER,
          "issued the invoice",
          `Against ${deliveries.map((dr) => dr.drNo).join(", ")}`,
        ),
      ],
      attachments: [],
      // EIS: submission to BIR e-invoicing would be queued here.
      eis: notSubmitted(),
    };

    for (const delivery of deliveries) delivery.invoiceId = invoice.id;
    if (order.lines.every((line) => line.deliveredQty >= line.qty)) {
      order.status = "invoiced";
    }
    order.updatedAt = now;

    database.invoices.push(invoice);
    return invoice;
  });
}

/** Default due date from the customer's terms, for the invoice form. */
export function dueDateFor(invoiceDate: string, terms: string): string {
  return iso(addDays(new Date(invoiceDate), termsDays(terms as never)));
}

export interface InvoicePreview {
  lines: InvoiceLine[];
  subtotal: Centavos;
  discount: Centavos;
  vat: Invoice["vatBreakdown"];
  total: Centavos;
}

/**
 * What an invoice over these delivery receipts would look like, without
 * issuing it. The form needs the same arithmetic the post uses, and this is
 * where that arithmetic lives — a component must never reach into the mock
 * layer to do its own line maths.
 */
export function previewInvoice(
  salesOrderId: string,
  drIds: string[],
): Promise<InvoicePreview> {
  return read("the invoice preview", (database) => {
    const order = findOrder(database, salesOrderId);
    const chosen = database.deliveries.filter((dr) => drIds.includes(dr.id));

    const billed = new Map<string, number>();
    for (const delivery of chosen) {
      for (const line of delivery.lines) {
        const qty = line.qtyAccepted ?? line.qtyShipped;
        billed.set(line.salesOrderLineId, (billed.get(line.salesOrderLineId) ?? 0) + qty);
      }
    }

    const lines: InvoiceLine[] = order.lines
      .filter((line) => (billed.get(line.id) ?? 0) > 0)
      .map((line, index) => {
        const qty = billed.get(line.id) ?? 0;
        return {
          id: `preview-${index}`,
          productId: line.productId,
          sku: line.sku,
          description: line.description,
          qty,
          uom: line.uom,
          unitPrice: line.unitPrice,
          discountPct: line.discountPct,
          vatType: line.vatType,
          ...computeLineAmounts(qty, line.unitPrice, line.discountPct, line.vatType),
        };
      });

    const amounts = summariseDocument(lines);
    return {
      lines,
      subtotal: amounts.subtotal,
      discount: amounts.discount,
      vat: amounts.vat,
      total: amounts.total,
    };
  });
}

/* -------------------------------------------------------------------------
   Shared helpers
   ------------------------------------------------------------------------- */

function findOrder(database: Database, id: string): SalesOrder {
  return requireRecord(
    database.orders.find((row) => row.id === id || row.soNo === id),
    "sales order",
    id,
  );
}

function findDelivery(database: Database, id: string): DeliveryReceipt {
  return requireRecord(
    database.deliveries.find((row) => row.id === id || row.drNo === id),
    "delivery receipt",
    id,
  );
}

/** Confirming an order claims stock; cancelling gives it back. */
function reserveStock(database: Database, order: SalesOrder): void {
  for (const line of order.lines) {
    const level = database.stockLevels.find(
      (row) => row.productId === line.productId && row.warehouseId === order.warehouseId,
    );
    if (!level) continue;
    const outstanding = Math.max(0, line.qty - line.deliveredQty);
    level.reserved = Math.min(level.onHand, level.reserved + outstanding);
    level.available = level.onHand - level.reserved;
  }
}

function releaseStock(database: Database, order: SalesOrder): void {
  for (const line of order.lines) {
    const level = database.stockLevels.find(
      (row) => row.productId === line.productId && row.warehouseId === order.warehouseId,
    );
    if (!level) continue;
    const outstanding = Math.max(0, line.qty - line.deliveredQty);
    level.reserved = Math.max(0, level.reserved - outstanding);
    level.available = level.onHand - level.reserved;
  }
}

/** Shipping takes goods off the shelf and releases the reservation with them. */
function applyStockMovement(
  database: Database,
  delivery: DeliveryReceipt,
  direction: 1 | -1,
): void {
  for (const line of delivery.lines) {
    const level = database.stockLevels.find(
      (row) =>
        row.productId === line.productId && row.warehouseId === delivery.warehouseId,
    );
    if (!level) continue;

    level.onHand = Math.max(0, level.onHand + direction * line.qtyShipped);
    level.reserved = Math.max(0, level.reserved - line.qtyShipped);
    level.available = level.onHand - level.reserved;

    database.stockMovements.unshift({
      id: `mv-${database.stockMovements.length + 1}`,
      productId: line.productId,
      warehouseId: delivery.warehouseId,
      date: delivery.deliveryDate,
      type: "delivery",
      qty: direction * line.qtyShipped,
      balanceAfter: level.onHand,
      sourceDocType: "Delivery receipt",
      sourceDocNo: delivery.drNo,
      sourceDocId: delivery.id,
    });
  }
}
