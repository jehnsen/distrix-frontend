import type { Centavos } from "@/lib/money";
import type { Address, DocumentBase, IsoDate } from "@/types/common";

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: Address;
  isDefault: boolean;
}

/**
 * One row per product per warehouse. `available` is derived — `onHand` less
 * what confirmed orders have reserved — and is the figure the line editor
 * warns against.
 */
export interface StockLevel {
  productId: string;
  warehouseId: string;
  onHand: number;
  reserved: number;
  available: number;
  /** On open purchase orders not yet received. */
  incoming: number;
}

export function computeAvailable(onHand: number, reserved: number): number {
  return onHand - reserved;
}

/** Every movement that changed on-hand, newest first on the product page. */
export type StockMovementType =
  | "receipt"
  | "delivery"
  | "return_restock"
  | "adjustment"
  | "transfer_in"
  | "transfer_out";

export const STOCK_MOVEMENT_LABEL: Record<StockMovementType, string> = {
  receipt: "Goods receipt",
  delivery: "Delivery",
  return_restock: "Return restocked",
  adjustment: "Adjustment",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
};

export interface StockMovement {
  id: string;
  productId: string;
  warehouseId: string;
  date: IsoDate;
  type: StockMovementType;
  /** Signed: negative for deliveries, transfers out and write-offs. */
  qty: number;
  /** Running on-hand after this movement, for the movement history table. */
  balanceAfter: number;
  sourceDocType: string;
  sourceDocNo: string;
  sourceDocId: string;
}

export type AdjustmentReason =
  | "cycle_count"
  | "damage"
  | "expiry"
  | "pilferage"
  | "found"
  | "sample"
  | "repack";

export const ADJUSTMENT_REASON_LABEL: Record<AdjustmentReason, string> = {
  cycle_count: "Cycle count variance",
  damage: "Damaged in warehouse",
  expiry: "Expired",
  pilferage: "Pilferage",
  found: "Found stock",
  sample: "Sample / promo issue",
  repack: "Repack",
};

export type AdjustmentStatus = "draft" | "approved" | "posted" | "cancelled";

export interface StockAdjustmentLine {
  id: string;
  productId: string;
  /** What the system thought was there. */
  systemQty: number;
  /** What the count found. */
  countedQty: number;
  /** countedQty - systemQty. Negative is shrinkage. */
  varianceQty: number;
  reason: AdjustmentReason;
  /** varianceQty valued at standard cost. Posts to a write-off. */
  varianceValue: Centavos;
}

export interface StockAdjustment extends DocumentBase {
  adjNo: string;
  warehouseId: string;
  date: IsoDate;
  lines: StockAdjustmentLine[];
  totalVarianceValue: Centavos;
  status: AdjustmentStatus;
  approvedById?: string;
  approvedByName?: string;
}

export type TransferStatus = "draft" | "in_transit" | "received" | "cancelled";

export interface TransferLine {
  id: string;
  productId: string;
  qtySent: number;
  /** Short receipts happen; the variance is flagged on receiving. */
  qtyReceived: number;
}

export interface StockTransfer extends DocumentBase {
  trNo: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  dispatchDate: IsoDate;
  expectedDate: IsoDate;
  receivedDate?: IsoDate;
  lines: TransferLine[];
  status: TransferStatus;
}
