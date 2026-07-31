import type { Centavos } from "@/lib/money";
import type { DocumentBase, IsoDate, PaymentTerms } from "@/types/common";
import type { VatBreakdown, VatType } from "@/types/tax";

export type SalesOrderStatus =
  | "draft"
  | "confirmed"
  | "partially_delivered"
  | "delivered"
  | "invoiced"
  | "cancelled";

export const SALES_ORDER_STATUSES: SalesOrderStatus[] = [
  "draft",
  "confirmed",
  "partially_delivered",
  "delivered",
  "invoiced",
  "cancelled",
];

export interface SalesOrderLine {
  id: string;
  productId: string;
  /** Snapshotted at order time — the product may be renamed later. */
  sku: string;
  description: string;
  qty: number;
  uom: string;
  unitPrice: Centavos;
  /** Whole percent as entered, e.g. 7.5. */
  discountPct: number;
  vatType: VatType;
  /** Net of discount, before VAT. */
  lineNet: Centavos;
  lineVat: Centavos;
  lineTotal: Centavos;
  /** Rolled up from delivery receipts against this order. */
  deliveredQty: number;
}

export interface SalesOrder extends DocumentBase {
  soNo: string;
  customerId: string;
  warehouseId: string;
  salesRepId: string;
  orderDate: IsoDate;
  requiredDate: IsoDate;
  /** Copied from the customer at order time; the customer may change later. */
  terms: PaymentTerms;
  /** Customer's own PO reference, printed on the DR and the invoice. */
  customerRef?: string;
  lines: SalesOrderLine[];
  subtotal: Centavos;
  discount: Centavos;
  vat: VatBreakdown;
  total: Centavos;
  status: SalesOrderStatus;
  /** Set when the order was taken against an exceeded credit limit. */
  creditOverrideById?: string;
  creditOverrideByName?: string;
}

/** 0–1. Drives the fulfilment progress bar on the orders list. */
export function fulfilmentProgress(order: SalesOrder): number {
  const ordered = order.lines.reduce((sum, line) => sum + line.qty, 0);
  if (ordered === 0) return 0;
  const delivered = order.lines.reduce((sum, line) => sum + line.deliveredQty, 0);
  return Math.min(1, delivered / ordered);
}

export function outstandingQty(line: SalesOrderLine): number {
  return Math.max(0, line.qty - line.deliveredQty);
}

export function isFullyDelivered(order: SalesOrder): boolean {
  return order.lines.every((line) => line.deliveredQty >= line.qty);
}

/** Which actions the toolbar offers, keyed by status. */
export const SALES_ORDER_ACTIONS: Record<SalesOrderStatus, string[]> = {
  draft: ["edit", "confirm", "delete"],
  confirmed: ["createDelivery", "invoice", "print", "cancel"],
  partially_delivered: ["createDelivery", "invoice", "print", "cancel"],
  delivered: ["invoice", "print"],
  invoiced: ["print", "viewInvoice"],
  cancelled: ["print", "duplicate"],
};
