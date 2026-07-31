import { addDays, formatISO, subDays } from "date-fns";

import { fromMajor, sum, type Centavos } from "@/lib/money";
import { computeLineAmounts, summariseDocument } from "@/lib/mock/line-math";
import type { Series } from "@/lib/mock/doc-numbers";
import type { Rng } from "@/lib/mock/rng";
import { notSubmitted } from "@/types/tax";
import { invoiceBalance } from "@/types/invoice";
import type {
  CommissionRun,
  Customer,
  DeliveryReceipt,
  Invoice,
  Product,
  PurchaseOrder,
  SalesOrder,
  SalesReturn,
} from "@/types";

const iso = (date: Date): string => formatISO(date, { representation: "date" });
const stamp = (date: Date): string => formatISO(date);

export interface EdgeCaseTargets {
  /** The customer deliberately pushed past its credit limit. */
  overLimitCustomerId: string;
  /** The customer carrying a 90+ balance nobody has collected. */
  ninetyPlusCustomerId: string;
  partiallyDeliveredOrderId: string;
  returnUnderInspectionId: string;
  purchaseOrderInTransitId: string;
  commissionRunForReviewId: string;
}

interface Bag {
  rng: Rng;
  series: Series;
  today: Date;
  customers: Customer[];
  products: Product[];
  orders: SalesOrder[];
  deliveries: DeliveryReceipt[];
  invoices: Invoice[];
  returns: SalesReturn[];
  purchaseOrders: PurchaseOrder[];
  commissionRuns: CommissionRun[];
}

/**
 * The spec asks for specific messy cases to exist rather than hoping the random
 * walk produces them. Each is forced onto a real record so it behaves like the
 * rest of the data — the 90+ balance ages, the over-limit customer blocks
 * dispatch, the in-transit PO shows a live shipment tracker.
 */
export function applyEdgeCases(bag: Bag): EdgeCaseTargets {
  const { rng, series, today, customers, invoices } = bag;

  /* --- A customer over its credit limit -------------------------------- */
  const restaurant =
    customers.find((c) => c.segment === "restaurant" && c.status === "active") ??
    customers[0]!;

  /* --- A 90+ overdue balance nobody has chased ------------------------- */
  const overdueCustomer =
    customers.find(
      (c) => c.id !== restaurant.id && c.segment === "consolidator" && c.status === "active",
    ) ?? customers[1]!;

  // Two unpaid invoices deep in the 90+ bucket, so the rail's last segment is real.
  for (const [index, config] of [
    { daysAgo: 172, amount: 515_800 },
    { daysAgo: 118, amount: 214_600 },
  ].entries()) {
    const invoiceDate = subDays(today, config.daysAgo);
    const product = rng.pick(bag.products.filter((p) => p.status === "active"));
    const qty = Math.max(1, Math.round(fromMajor(config.amount) / product.listPrice));
    const amounts = computeLineAmounts(qty, product.listPrice, 0, product.vatType);
    const siNo = series.next("SI", iso(invoiceDate));
    const docAmounts = summariseDocument([
      { qty, unitPrice: product.listPrice, discountPct: 0, vatType: product.vatType, ...amounts },
    ]);

    invoices.push({
      id: `SI-${siNo}`,
      siNo,
      customerId: overdueCustomer.id,
      salesOrderId: "",
      soNo: "—",
      drIds: [],
      drNos: [],
      salesRepId: overdueCustomer.salesRepId,
      invoiceDate: iso(invoiceDate),
      dueDate: iso(addDays(invoiceDate, 30)),
      terms: "30",
      lines: [
        {
          id: `sil-${siNo}-0`,
          productId: product.id,
          sku: product.sku,
          description: product.name,
          qty,
          uom: product.uom,
          unitPrice: product.listPrice,
          discountPct: 0,
          vatType: product.vatType,
          ...amounts,
        },
      ],
      subtotal: docAmounts.subtotal,
      discount: docAmounts.discount,
      vatBreakdown: docAmounts.vat,
      amountDue: docAmounts.total,
      amountPaid: 0 as Centavos,
      creditApplied: 0 as Centavos,
      status: "overdue",
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
        },
        {
          id: `au-${siNo}-2`,
          at: stamp(addDays(invoiceDate, 45)),
          actorId: "USR-004",
          actorName: "Divina Ocampo",
          action: "sent a collection reminder",
          detail: index === 0 ? "Second reminder, no response" : "First reminder",
        },
      ],
      attachments: [],
      eis: notSubmitted(),
    });
  }

  /* --- Push the restaurant group past its limit ------------------------ */
  // Raise its unpaid balance above the limit by leaving a big invoice open.
  const restaurantInvoices = invoices.filter(
    (invoice) => invoice.customerId === restaurant.id && invoiceBalance(invoice) > 0,
  );
  const shortfall = restaurant.creditLimit - sum(restaurantInvoices.map(invoiceBalance));
  if (shortfall > 0) {
    const target = restaurantInvoices[0];
    if (target) {
      // Reverse a settlement so the account tips over the line.
      target.amountPaid = 0 as Centavos;
      target.creditApplied = 0 as Centavos;
    }
  }

  /* --- A partially delivered order ------------------------------------- */
  const partial =
    bag.orders.find((order) => order.status === "partially_delivered") ??
    bag.orders.find((order) => order.status === "confirmed");
  if (partial && partial.status !== "partially_delivered") {
    const line = partial.lines[0];
    if (line) {
      line.deliveredQty = Math.floor(line.qty / 2);
      partial.status = "partially_delivered";
    }
  }

  /* --- A return sitting under inspection ------------------------------- */
  const inspecting =
    bag.returns.find((sr) => sr.status === "inspecting") ?? bag.returns[bag.returns.length - 1];
  if (inspecting && inspecting.status !== "inspecting") {
    inspecting.status = "inspecting";
    delete inspecting.creditNoteNo;
    delete inspecting.creditNoteDate;
  }

  /* --- An international PO still on the water -------------------------- */
  const inTransit =
    bag.purchaseOrders.find((po) => po.type === "international" && po.status === "in_transit") ??
    bag.purchaseOrders.filter((po) => po.type === "international").at(-1);
  if (inTransit && inTransit.status !== "in_transit") {
    inTransit.status = "in_transit";
    inTransit.receipts = [];
    for (const line of inTransit.lines) line.receivedQty = 0;
  }

  /* --- A commission run waiting on approval ---------------------------- */
  const forReview =
    bag.commissionRuns.find((run) => run.status === "for_review") ??
    bag.commissionRuns.at(-1);
  if (forReview && forReview.status !== "for_review") forReview.status = "for_review";

  return {
    overLimitCustomerId: restaurant.id,
    ninetyPlusCustomerId: overdueCustomer.id,
    partiallyDeliveredOrderId: partial?.id ?? "",
    returnUnderInspectionId: inspecting?.id ?? "",
    purchaseOrderInTransitId: inTransit?.id ?? "",
    commissionRunForReviewId: forReview?.id ?? "",
  };
}
