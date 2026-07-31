import { addDays, formatISO, subMonths } from "date-fns";

import { multiplyQty, sum } from "@/lib/money";
import type { Series } from "@/lib/mock/doc-numbers";
import type { Rng } from "@/lib/mock/rng";
import type {
  AdjustmentReason,
  DeliveryReceipt,
  Product,
  PurchaseOrder,
  SalesOrder,
  SalesReturn,
  StockAdjustment,
  StockAdjustmentLine,
  StockLevel,
  StockMovement,
  StockTransfer,
  Warehouse,
} from "@/types";
import { restockQty } from "@/types/sales-return";

const iso = (date: Date): string => formatISO(date, { representation: "date" });
const stamp = (date: Date): string => formatISO(date);

interface Context {
  rng: Rng;
  series: Series;
  today: Date;
  products: Product[];
  warehouses: Warehouse[];
  orders: SalesOrder[];
  deliveries: DeliveryReceipt[];
  purchaseOrders: PurchaseOrder[];
  returns: SalesReturn[];
}

export interface StockResult {
  levels: StockLevel[];
  movements: StockMovement[];
  adjustments: StockAdjustment[];
  transfers: StockTransfer[];
}

/**
 * Derives stock from the documents that moved it, rather than inventing a
 * number: receipts add, deliveries subtract, restocked returns add back, and
 * confirmed-but-undelivered order lines sit as `reserved`.
 */
export function generateStock(ctx: Context): StockResult {
  const { rng, today, products, warehouses } = ctx;

  const onHand = new Map<string, number>();
  const key = (productId: string, warehouseId: string) => `${productId}::${warehouseId}`;
  const movements: StockMovement[] = [];

  const bump = (
    productId: string,
    warehouseId: string,
    qty: number,
    date: string,
    type: StockMovement["type"],
    doc: { type: string; no: string; id: string },
  ): void => {
    const k = key(productId, warehouseId);
    const next = (onHand.get(k) ?? 0) + qty;
    onHand.set(k, next);
    movements.push({
      id: `mv-${movements.length + 1}`,
      productId,
      warehouseId,
      date,
      type,
      qty,
      balanceAfter: next,
      sourceDocType: doc.type,
      sourceDocNo: doc.no,
      sourceDocId: doc.id,
    });
  };

  // Opening stock, eighteen months ago, so balances never go implausibly negative.
  const openingDate = iso(subMonths(today, 18));
  for (const product of products) {
    for (const warehouse of warehouses) {
      const share = warehouse.code === "PRQ" ? 1 : rng.float(0.25, 0.55);
      const opening = Math.round(product.reorderPoint * rng.float(2.5, 6) * share);
      bump(product.id, warehouse.id, opening, openingDate, "receipt", {
        type: "Opening balance",
        no: "OPENING",
        id: "opening",
      });
    }
  }

  const timeline: { date: string; run: () => void }[] = [];

  for (const po of ctx.purchaseOrders) {
    for (const receipt of po.receipts) {
      for (const line of receipt.lines) {
        timeline.push({
          date: receipt.receivedDate,
          run: () =>
            bump(line.productId, receipt.warehouseId, line.qtyReceived, receipt.receivedDate, "receipt", {
              type: "Goods receipt",
              no: receipt.grNo,
              id: receipt.id,
            }),
        });
      }
    }
  }

  for (const dr of ctx.deliveries) {
    for (const line of dr.lines) {
      timeline.push({
        date: dr.deliveryDate,
        run: () =>
          bump(line.productId, dr.warehouseId, -line.qtyShipped, dr.deliveryDate, "delivery", {
            type: "Delivery receipt",
            no: dr.drNo,
            id: dr.id,
          }),
      });
    }
  }

  for (const sr of ctx.returns) {
    if (sr.status !== "credited" && sr.status !== "approved") continue;
    for (const line of sr.lines) {
      const qty = restockQty(line);
      if (qty <= 0) continue;
      timeline.push({
        date: sr.date,
        run: () =>
          bump(line.productId, sr.warehouseId, qty, sr.date, "return_restock", {
            type: "Sales return",
            no: sr.srNo,
            id: sr.id,
          }),
      });
    }
  }

  timeline.sort((a, b) => a.date.localeCompare(b.date));
  for (const event of timeline) event.run();

  const adjustments = generateAdjustments(ctx, onHand, key, bump);
  const transfers = generateTransfers(ctx, bump);

  // Reservations: confirmed order lines not yet delivered.
  const reserved = new Map<string, number>();
  for (const order of ctx.orders) {
    if (order.status !== "confirmed" && order.status !== "partially_delivered") continue;
    for (const line of order.lines) {
      const outstanding = line.qty - line.deliveredQty;
      if (outstanding <= 0) continue;
      const k = key(line.productId, order.warehouseId);
      reserved.set(k, (reserved.get(k) ?? 0) + outstanding);
    }
  }

  // Incoming: open purchase order lines not yet received.
  const incoming = new Map<string, number>();
  for (const po of ctx.purchaseOrders) {
    if (po.status === "received" || po.status === "closed" || po.status === "cancelled") continue;
    for (const line of po.lines) {
      const outstanding = line.qty - line.receivedQty;
      if (outstanding <= 0) continue;
      const k = key(line.productId, po.warehouseId);
      incoming.set(k, (incoming.get(k) ?? 0) + outstanding);
    }
  }

  const levels: StockLevel[] = [];
  for (const product of products) {
    for (const warehouse of warehouses) {
      const k = key(product.id, warehouse.id);
      const hand = Math.max(0, onHand.get(k) ?? 0);
      const res = Math.min(hand, reserved.get(k) ?? 0);
      levels.push({
        productId: product.id,
        warehouseId: warehouse.id,
        onHand: hand,
        reserved: res,
        available: hand - res,
        incoming: incoming.get(k) ?? 0,
      });
    }
  }

  movements.sort((a, b) => b.date.localeCompare(a.date));

  return { levels, movements, adjustments, transfers };
}

type Bump = (
  productId: string,
  warehouseId: string,
  qty: number,
  date: string,
  type: StockMovement["type"],
  doc: { type: string; no: string; id: string },
) => void;

function generateAdjustments(
  ctx: Context,
  onHand: Map<string, number>,
  key: (p: string, w: string) => string,
  bump: Bump,
): StockAdjustment[] {
  const { rng, series, today, products, warehouses } = ctx;
  const adjustments: StockAdjustment[] = [];

  const reasons: { value: AdjustmentReason; weight: number }[] = [
    { value: "cycle_count", weight: 40 },
    { value: "damage", weight: 22 },
    { value: "expiry", weight: 16 },
    { value: "pilferage", weight: 8 },
    { value: "found", weight: 8 },
    { value: "sample", weight: 6 },
  ];

  // A monthly cycle count per warehouse for the last 18 months.
  for (let monthsBack = 17; monthsBack >= 0; monthsBack--) {
    const date = addDays(subMonths(today, monthsBack), rng.int(20, 27));
    if (date > today) continue;

    for (const warehouse of warehouses) {
      const counted = rng.pickMany(products, rng.int(3, 8));
      const lines: StockAdjustmentLine[] = counted.map((product, index) => {
        const systemQty = Math.max(0, onHand.get(key(product.id, warehouse.id)) ?? 0);
        const reason = rng.weighted(reasons);
        const drift =
          reason === "found"
            ? rng.int(1, 12)
            : -rng.int(1, Math.max(2, Math.floor(systemQty * 0.03) + 2));
        const countedQty = Math.max(0, systemQty + drift);
        const varianceQty = countedQty - systemQty;
        return {
          id: `adjl-${monthsBack}-${warehouse.code}-${index}`,
          productId: product.id,
          systemQty,
          countedQty,
          varianceQty,
          reason,
          varianceValue: multiplyQty(product.standardCost, varianceQty),
        };
      });

      const adjNo = series.next("ADJ", iso(date));
      for (const line of lines) {
        if (line.varianceQty === 0) continue;
        bump(line.productId, warehouse.id, line.varianceQty, iso(date), "adjustment", {
          type: "Stock adjustment",
          no: adjNo,
          id: `ADJ-${adjNo}`,
        });
      }

      adjustments.push({
        id: `ADJ-${adjNo}`,
        adjNo,
        warehouseId: warehouse.id,
        date: iso(date),
        lines,
        totalVarianceValue: sum(lines.map((line) => line.varianceValue)),
        status: monthsBack === 0 ? rng.pick(["draft", "approved"]) : "posted",
        createdAt: stamp(date),
        createdById: "USR-003",
        createdByName: "Nestor Alcantara",
        updatedAt: stamp(date),
        auditTrail: [],
        attachments: [],
        ...(monthsBack > 0
          ? { approvedById: "USR-001", approvedByName: "Ramon Dimaculangan" }
          : {}),
      });
    }
  }

  return adjustments;
}

function generateTransfers(ctx: Context, bump: Bump): StockTransfer[] {
  const { rng, series, today, products, warehouses } = ctx;
  const transfers: StockTransfer[] = [];
  const prq = warehouses.find((w) => w.code === "PRQ");
  const branches = warehouses.filter((w) => w.code !== "PRQ");
  if (!prq || branches.length === 0) return transfers;

  // Manila replenishes the branches roughly twice a month.
  for (let monthsBack = 17; monthsBack >= 0; monthsBack--) {
    for (let i = 0; i < 2; i++) {
      const dispatchDate = addDays(subMonths(today, monthsBack), rng.int(1, 27));
      if (dispatchDate > today) continue;

      const to = rng.pick(branches);
      const expectedDate = addDays(dispatchDate, to.code === "CEB" ? 4 : 6);
      const arrived = expectedDate <= today;
      const trNo = series.next("TR", iso(dispatchDate));
      const picks = rng.pickMany(products, rng.int(4, 10));

      const lines = picks.map((product, index) => {
        const qtySent = (product.altUomConversion ?? 1) * rng.int(4, 30);
        // Occasional short receipt at the branch.
        const qtyReceived = arrived
          ? rng.bool(0.9)
            ? qtySent
            : qtySent - rng.int(1, Math.max(2, Math.floor(qtySent * 0.05)))
          : 0;
        return {
          id: `trl-${trNo}-${index}`,
          productId: product.id,
          qtySent,
          qtyReceived,
        };
      });

      for (const line of lines) {
        bump(line.productId, prq.id, -line.qtySent, iso(dispatchDate), "transfer_out", {
          type: "Stock transfer",
          no: trNo,
          id: `TR-${trNo}`,
        });
        if (arrived && line.qtyReceived > 0) {
          bump(line.productId, to.id, line.qtyReceived, iso(expectedDate), "transfer_in", {
            type: "Stock transfer",
            no: trNo,
            id: `TR-${trNo}`,
          });
        }
      }

      transfers.push({
        id: `TR-${trNo}`,
        trNo,
        fromWarehouseId: prq.id,
        toWarehouseId: to.id,
        dispatchDate: iso(dispatchDate),
        expectedDate: iso(expectedDate),
        lines,
        status: arrived ? "received" : "in_transit",
        createdAt: stamp(dispatchDate),
        createdById: "USR-003",
        createdByName: "Nestor Alcantara",
        updatedAt: stamp(dispatchDate),
        auditTrail: [],
        attachments: [],
        ...(arrived ? { receivedDate: iso(expectedDate) } : {}),
      });
    }
  }

  return transfers;
}
