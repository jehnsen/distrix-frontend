import type { DocumentBase, IsoDate, IsoDateTime } from "@/types/common";

export type DeliveryReceiptStatus =
  | "draft"
  | "dispatched"
  | "delivered"
  | "acknowledged";

export const DELIVERY_RECEIPT_STATUSES: DeliveryReceiptStatus[] = [
  "draft",
  "dispatched",
  "delivered",
  "acknowledged",
];

export interface DeliveryReceiptLine {
  id: string;
  /** Ties back to the order line so short-ships roll up correctly. */
  salesOrderLineId: string;
  productId: string;
  sku: string;
  description: string;
  /** What the order asked for, snapshotted. */
  qtyOrdered: number;
  /** What actually went on the truck. Short-ships are normal, not errors. */
  qtyShipped: number;
  uom: string;
  /** Populated on acknowledgement when the customer counts short. */
  qtyAccepted?: number;
  shortReason?: string;
}

export interface DeliveryReceipt extends DocumentBase {
  drNo: string;
  salesOrderId: string;
  soNo: string;
  customerId: string;
  warehouseId: string;
  deliveryDate: IsoDate;
  driver: string;
  plateNo: string;
  /** Ordering on the dispatch board within a delivery date. */
  dropSequence: number;
  lines: DeliveryReceiptLine[];
  status: DeliveryReceiptStatus;
  /** Acknowledgement capture. */
  receivedBy?: string;
  receivedAt?: IsoDateTime;
  /** Data URL or asset key for the captured signature. */
  signatureRef?: string;
  /** Set once a delivery is billed, so the DR list can show what is unbilled. */
  invoiceId?: string;
}

export function isShortShipped(line: DeliveryReceiptLine): boolean {
  return line.qtyShipped < line.qtyOrdered;
}

export function totalShipped(dr: DeliveryReceipt): number {
  return dr.lines.reduce((sum, line) => sum + line.qtyShipped, 0);
}

/** Quantity the customer signed for, falling back to what was shipped. */
export function acceptedQty(line: DeliveryReceiptLine): number {
  return line.qtyAccepted ?? line.qtyShipped;
}

export const DELIVERY_RECEIPT_ACTIONS: Record<DeliveryReceiptStatus, string[]> = {
  draft: ["edit", "dispatch", "print", "delete"],
  dispatched: ["markDelivered", "print", "cancel"],
  delivered: ["acknowledge", "invoice", "print"],
  acknowledged: ["invoice", "print"],
};
