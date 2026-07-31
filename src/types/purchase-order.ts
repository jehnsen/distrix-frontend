import type { Centavos } from "@/lib/money";
import type { CurrencyCode, DocumentBase, IsoDate } from "@/types/common";
import type { Incoterm, SupplierType } from "@/types/supplier";

export type PurchaseOrderStatus =
  | "draft"
  | "sent"
  | "acknowledged"
  | "in_transit"
  | "partially_received"
  | "received"
  | "closed"
  | "cancelled";

export const PURCHASE_ORDER_STATUSES: PurchaseOrderStatus[] = [
  "draft",
  "sent",
  "acknowledged",
  "in_transit",
  "partially_received",
  "received",
  "closed",
  "cancelled",
];

export type LandedCostType =
  | "freight"
  | "duty"
  | "brokerage"
  | "insurance"
  | "other";

export const LANDED_COST_TYPE_LABEL: Record<LandedCostType, string> = {
  freight: "Freight",
  duty: "Customs duty",
  brokerage: "Brokerage",
  insurance: "Insurance",
  other: "Other charges",
};

/** How a landed cost is spread across the lines it applies to. */
export type AllocationBasis = "value" | "qty" | "weight";

export const ALLOCATION_BASIS_LABEL: Record<AllocationBasis, string> = {
  value: "By line value",
  qty: "By quantity",
  weight: "By weight",
};

export interface LandedCost {
  id: string;
  type: LandedCostType;
  description: string;
  /** Always PHP — brokerage and duty are billed locally even on imports. */
  amount: Centavos;
  basis: AllocationBasis;
}

export interface PurchaseOrderLine {
  id: string;
  productId: string;
  sku: string;
  description: string;
  qty: number;
  uom: string;
  /** In the PO's currency. */
  unitPrice: Centavos;
  lineTotal: Centavos;
  /** unitPrice converted at the PO's fxRate. Equals unitPrice when PHP. */
  unitPricePhp: Centavos;
  lineTotalPhp: Centavos;
  /** Rolled up from goods receipts against this PO. */
  receivedQty: number;
  /** Allocated share of landed costs, PHP. Set when costs are allocated. */
  allocatedLandedCost?: Centavos;
  /** (lineTotalPhp + allocatedLandedCost) / qty. The number that matters. */
  unitLandedCost?: Centavos;
}

/** Where the shipment is, for the international tracker timeline. */
export type ShipmentStage =
  | "ordered"
  | "shipped"
  | "arrived"
  | "cleared"
  | "received";

export const SHIPMENT_STAGES: ShipmentStage[] = [
  "ordered",
  "shipped",
  "arrived",
  "cleared",
  "received",
];

export const SHIPMENT_STAGE_LABEL: Record<ShipmentStage, string> = {
  ordered: "Ordered",
  shipped: "Shipped",
  arrived: "Arrived at port",
  cleared: "Cleared customs",
  received: "Received",
};

export interface ShipmentEvent {
  stage: ShipmentStage;
  date: IsoDate | null;
  note?: string;
}

export interface GoodsReceiptLine {
  id: string;
  purchaseOrderLineId: string;
  productId: string;
  sku: string;
  qtyExpected: number;
  qtyReceived: number;
  /** qtyReceived - qtyExpected. Non-zero is flagged as over/short. */
  varianceQty: number;
  varianceNote?: string;
}

export interface GoodsReceipt {
  id: string;
  grNo: string;
  purchaseOrderId: string;
  warehouseId: string;
  receivedDate: IsoDate;
  receivedById: string;
  receivedByName: string;
  lines: GoodsReceiptLine[];
}

export interface PurchaseOrder extends DocumentBase {
  poNo: string;
  supplierId: string;
  type: SupplierType;
  warehouseId: string;
  currency: CurrencyCode;
  /** Units of PHP per unit of `currency`. Exactly 1 for local POs. */
  fxRate: number;
  incoterms?: Incoterm;
  orderDate: IsoDate;
  /** International only: estimated departure and arrival. */
  etd?: IsoDate;
  eta?: IsoDate;
  lines: PurchaseOrderLine[];
  landedCosts: LandedCost[];
  receipts: GoodsReceipt[];
  shipment: ShipmentEvent[];
  /** Sum of line totals in the PO currency. */
  subtotal: Centavos;
  subtotalPhp: Centavos;
  landedCostTotal: Centavos;
  /** subtotalPhp + landedCostTotal — the true cost of the shipment. */
  totalPhp: Centavos;
  status: PurchaseOrderStatus;
}

export function isFullyReceived(po: PurchaseOrder): boolean {
  return po.lines.every((line) => line.receivedQty >= line.qty);
}

export function receiptProgress(po: PurchaseOrder): number {
  const ordered = po.lines.reduce((sum, line) => sum + line.qty, 0);
  if (ordered === 0) return 0;
  const received = po.lines.reduce((sum, line) => sum + line.receivedQty, 0);
  return Math.min(1, received / ordered);
}

export function hasVariance(receipt: GoodsReceipt): boolean {
  return receipt.lines.some((line) => line.varianceQty !== 0);
}

export function currentStage(po: PurchaseOrder): ShipmentStage {
  const reached = po.shipment.filter((event) => event.date !== null);
  return reached[reached.length - 1]?.stage ?? "ordered";
}

export const PURCHASE_ORDER_ACTIONS: Record<PurchaseOrderStatus, string[]> = {
  draft: ["edit", "send", "delete"],
  sent: ["acknowledge", "print", "cancel"],
  acknowledged: ["markShipped", "receive", "print", "cancel"],
  in_transit: ["updateShipment", "allocateLandedCost", "receive", "print"],
  partially_received: ["receive", "allocateLandedCost", "print", "close"],
  received: ["allocateLandedCost", "matchBill", "print", "close"],
  closed: ["print", "duplicate"],
  cancelled: ["print", "duplicate"],
};
