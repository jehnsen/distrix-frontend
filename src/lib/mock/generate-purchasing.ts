import { addDays, differenceInCalendarDays, formatISO, subMonths } from "date-fns";

import { allocate, convertFx, fromMajor, multiplyQty, sum, type Centavos } from "@/lib/money";
import type { Series } from "@/lib/mock/doc-numbers";
import type { Rng } from "@/lib/mock/rng";
import type {
  AllocationBasis,
  GoodsReceipt,
  GoodsReceiptLine,
  LandedCost,
  Product,
  PurchaseOrder,
  PurchaseOrderLine,
  ShipmentEvent,
  ShipmentStage,
  Supplier,
  Warehouse,
} from "@/types";

const iso = (date: Date): string => formatISO(date, { representation: "date" });
const stamp = (date: Date): string => formatISO(date);

/** Indicative rates. Real POs carry the rate agreed on the order date. */
const FX_RATES: Record<string, [number, number]> = {
  USD: [56.2, 58.9],
  CNY: [7.7, 8.2],
  THB: [1.55, 1.68],
  MYR: [12.1, 13.4],
  PHP: [1, 1],
};

interface Context {
  rng: Rng;
  series: Series;
  today: Date;
  suppliers: Supplier[];
  products: Product[];
  warehouses: Warehouse[];
}

function landedCostsFor(rng: Rng, subtotalPhp: Centavos, isImport: boolean): LandedCost[] {
  if (!isImport) {
    // Local purchases carry delivery only, if anything.
    return rng.bool(0.3)
      ? [
          {
            id: `lc-${rng.int(100000, 999999)}`,
            type: "freight",
            description: "Inland delivery",
            amount: fromMajor(rng.int(1500, 9000)),
            basis: "qty",
          },
        ]
      : [];
  }

  const basis = rng.weighted<AllocationBasis>([
    { value: "value", weight: 55 },
    { value: "qty", weight: 25 },
    { value: "weight", weight: 20 },
  ]);

  return [
    {
      id: `lc-frt-${rng.int(100000, 999999)}`,
      type: "freight",
      description: "Ocean freight and terminal handling",
      amount: Math.round(subtotalPhp * rng.float(0.05, 0.11)) as Centavos,
      basis,
    },
    {
      id: `lc-dut-${rng.int(100000, 999999)}`,
      type: "duty",
      description: "Customs duty",
      amount: Math.round(subtotalPhp * rng.float(0.03, 0.09)) as Centavos,
      basis: "value",
    },
    {
      id: `lc-brk-${rng.int(100000, 999999)}`,
      type: "brokerage",
      description: "Brokerage and processing",
      amount: fromMajor(rng.int(18000, 52000)),
      basis: "qty",
    },
    {
      id: `lc-ins-${rng.int(100000, 999999)}`,
      type: "insurance",
      description: "Marine cargo insurance",
      amount: Math.round(subtotalPhp * rng.float(0.004, 0.012)) as Centavos,
      basis: "value",
    },
  ];
}

/**
 * Spreads landed costs across the lines on the chosen basis and writes the
 * per-unit figure back. `allocate` guarantees the parts sum to the charge
 * exactly, so no centavo is invented at the bottom of the shipment.
 */
export function allocateLandedCosts(
  lines: PurchaseOrderLine[],
  costs: LandedCost[],
  products: Map<string, Product>,
): void {
  const perLine = lines.map(() => 0);

  for (const cost of costs) {
    const weights = lines.map((line) => {
      switch (cost.basis) {
        case "qty":
          return line.qty;
        case "weight":
          return line.qty * (products.get(line.productId)?.weightGrams ?? 1);
        case "value":
        default:
          return line.lineTotalPhp;
      }
    });

    const shares = allocate(cost.amount, weights);
    shares.forEach((share, index) => {
      perLine[index] = (perLine[index] ?? 0) + share;
    });
  }

  lines.forEach((line, index) => {
    const allocated = (perLine[index] ?? 0) as Centavos;
    line.allocatedLandedCost = allocated;
    line.unitLandedCost = Math.round((line.lineTotalPhp + allocated) / line.qty) as Centavos;
  });
}

function shipmentTimeline(
  rng: Rng,
  orderDate: Date,
  etd: Date,
  eta: Date,
  today: Date,
  reached: ShipmentStage,
): ShipmentEvent[] {
  const order: ShipmentStage[] = ["ordered", "shipped", "arrived", "cleared", "received"];
  const dates: Record<ShipmentStage, Date> = {
    ordered: orderDate,
    shipped: etd,
    arrived: eta,
    cleared: addDays(eta, rng.int(2, 9)),
    received: addDays(eta, rng.int(4, 14)),
  };
  const cutoff = order.indexOf(reached);

  return order.map((stage, index) => {
    const date = dates[stage];
    const done = index <= cutoff && date <= today;
    return {
      stage,
      date: done ? iso(date) : null,
      ...(stage === "cleared" && done && rng.bool(0.25)
        ? { note: "Held two days for FDA document check" }
        : {}),
    };
  });
}

export function generatePurchaseOrders(ctx: Context): PurchaseOrder[] {
  const { rng, series, today } = ctx;
  const start = subMonths(today, 18);
  const productMap = new Map(ctx.products.map((p) => [p.id, p]));
  const pos: PurchaseOrder[] = [];

  const spanDays = differenceInCalendarDays(today, start);
  const schedule: { supplier: Supplier; date: Date }[] = [];
  for (const supplier of ctx.suppliers) {
    // Imports land roughly every 6-10 weeks; local restocks far more often.
    const intervalDays = supplier.type === "international" ? rng.int(42, 70) : rng.int(12, 26);
    for (let day = 0; day <= spanDays; day += intervalDays) {
      const date = addDays(start, day + rng.int(0, 6));
      if (date <= today) schedule.push({ supplier, date });
    }
  }
  schedule.sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const { supplier, date: orderDate } of schedule) {
    const catalogue = ctx.products.filter((p) => p.primarySupplierId === supplier.id);
    if (catalogue.length === 0) continue;

    const isImport = supplier.type === "international";
    const [fxLow, fxHigh] = FX_RATES[supplier.currency] ?? [1, 1];
    const fxRate = isImport ? Number(rng.float(fxLow, fxHigh).toFixed(4)) : 1;

    const picks = rng.pickMany(catalogue, rng.int(3, Math.min(9, catalogue.length)));
    const poNo = series.next("PO", iso(orderDate));

    const lines: PurchaseOrderLine[] = picks.map((product, index) => {
      const caseSize = product.altUomConversion ?? 1;
      const qty = caseSize > 1 ? caseSize * rng.int(20, 180) : rng.int(200, 3000);
      // Supplier price is the standard cost, expressed in their currency.
      const unitPricePhp = Math.round(product.standardCost * rng.float(0.9, 1.05)) as Centavos;
      const unitPrice = isImport
        ? (Math.round(unitPricePhp / fxRate) as Centavos)
        : unitPricePhp;

      return {
        id: `pol-${poNo}-${index}`,
        productId: product.id,
        sku: product.sku,
        description: product.name,
        qty,
        uom: product.uom,
        unitPrice,
        lineTotal: multiplyQty(unitPrice, qty),
        unitPricePhp,
        lineTotalPhp: multiplyQty(unitPricePhp, qty),
        receivedQty: 0,
      };
    });

    const subtotal = sum(lines.map((line) => line.lineTotal));
    const subtotalPhp = isImport
      ? convertFx(subtotal, fxRate)
      : sum(lines.map((line) => line.lineTotalPhp));
    const landedCosts = landedCostsFor(rng, subtotalPhp, isImport);

    const etd = addDays(orderDate, rng.int(10, 25));
    const eta = addDays(etd, supplier.leadTimeDays - rng.int(5, 15));
    const ageDays = differenceInCalendarDays(today, orderDate);

    // Where the shipment has got to, given how long ago it was ordered.
    const stage: ShipmentStage =
      !isImport
        ? "received"
        : ageDays > supplier.leadTimeDays + 14
          ? "received"
          : ageDays > supplier.leadTimeDays + 4
            ? "cleared"
            : ageDays > supplier.leadTimeDays - 4
              ? "arrived"
              : ageDays > 14
                ? "shipped"
                : "ordered";

    const receipts: GoodsReceipt[] = [];
    let status: PurchaseOrder["status"];

    if (stage === "received") {
      const receivedDate = isImport ? addDays(eta, rng.int(4, 14)) : addDays(orderDate, supplier.leadTimeDays);
      if (receivedDate <= today) {
        const grNo = series.next("GR", iso(receivedDate));
        const grLines: GoodsReceiptLine[] = lines.map((line, index) => {
          // One receipt in eight arrives over or short.
          const variance = rng.bool(0.12) ? rng.int(-40, 24) : 0;
          const qtyReceived = Math.max(0, line.qty + variance);
          line.receivedQty = qtyReceived;
          return {
            id: `grl-${grNo}-${index}`,
            purchaseOrderLineId: line.id,
            productId: line.productId,
            sku: line.sku,
            qtyExpected: line.qty,
            qtyReceived,
            varianceQty: qtyReceived - line.qty,
            ...(variance !== 0
              ? {
                  varianceNote: rng.pick([
                    "Cases crushed in transit, rejected at gate",
                    "Supplier over-shipped, accepted",
                    "Short count confirmed with forwarder",
                  ]),
                }
              : {}),
          };
        });

        receipts.push({
          id: `GR-${grNo}`,
          grNo,
          purchaseOrderId: `PO-${poNo}`,
          warehouseId: ctx.warehouses[0]?.id ?? "WH-PRQ",
          receivedDate: iso(receivedDate),
          receivedById: "USR-003",
          receivedByName: "Nestor Alcantara",
          lines: grLines,
        });

        allocateLandedCosts(lines, landedCosts, productMap);
        status = ageDays > supplier.leadTimeDays + 45 ? "closed" : "received";
      } else {
        status = "in_transit";
      }
    } else if (stage === "ordered") {
      // A PO raised in the last few days may not have gone out yet.
      status =
        ageDays < 2
          ? rng.bool(0.45)
            ? "draft"
            : "sent"
          : ageDays < 6
            ? rng.bool(0.5)
              ? "sent"
              : "acknowledged"
            : "acknowledged";
    } else {
      status = "in_transit";
    }

    const landedCostTotal = sum(landedCosts.map((cost) => cost.amount));

    pos.push({
      id: `PO-${poNo}`,
      poNo,
      supplierId: supplier.id,
      type: supplier.type,
      warehouseId: ctx.warehouses[0]?.id ?? "WH-PRQ",
      currency: supplier.currency,
      fxRate,
      orderDate: iso(orderDate),
      lines,
      landedCosts,
      receipts,
      shipment: isImport
        ? shipmentTimeline(rng, orderDate, etd, eta, today, stage)
        : [
            { stage: "ordered", date: iso(orderDate) },
            { stage: "shipped", date: null },
            { stage: "arrived", date: null },
            { stage: "cleared", date: null },
            {
              stage: "received",
              date: receipts[0] ? receipts[0].receivedDate : null,
            },
          ],
      subtotal,
      subtotalPhp,
      landedCostTotal,
      totalPhp: (subtotalPhp + landedCostTotal) as Centavos,
      status,
      createdAt: stamp(orderDate),
      createdById: "USR-005",
      createdByName: "Joel Fajardo",
      updatedAt: stamp(orderDate),
      auditTrail: [
        {
          id: `au-${poNo}-1`,
          at: stamp(orderDate),
          actorId: "USR-005",
          actorName: "Joel Fajardo",
          action: "raised the purchase order",
        },
      ],
      attachments: [],
      ...(isImport
        ? {
            incoterms: supplier.incoterms ?? "FOB",
            etd: iso(etd),
            eta: iso(eta),
          }
        : {}),
    });
  }

  return pos;
}

export { iso as isoDay };
