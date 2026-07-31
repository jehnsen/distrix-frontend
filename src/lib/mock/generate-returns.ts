import { addDays, differenceInCalendarDays, formatISO } from "date-fns";

import type { Centavos } from "@/lib/money";
import type { Series } from "@/lib/mock/doc-numbers";
import { computeLineAmounts, summariseDocument } from "@/lib/mock/line-math";
import type { Rng } from "@/lib/mock/rng";
import { notSubmitted } from "@/types/tax";
import type {
  Invoice,
  ReturnDisposition,
  ReturnReason,
  SalesReturn,
  SalesReturnLine,
} from "@/types";

const iso = (date: Date): string => formatISO(date, { representation: "date" });
const stamp = (date: Date): string => formatISO(date);

/** Damage is what actually comes back most; expiry follows on slow movers. */
const REASONS: { value: ReturnReason; weight: number }[] = [
  { value: "damaged", weight: 42 },
  { value: "wrong_item", weight: 18 },
  { value: "expired", weight: 22 },
  { value: "short_delivery", weight: 12 },
  { value: "other", weight: 6 },
];

/** What happens to the goods follows from why they came back. */
function dispositionFor(reason: ReturnReason, rng: Rng): ReturnDisposition {
  switch (reason) {
    case "wrong_item":
      return "restock";
    case "expired":
      return "scrap";
    case "damaged":
      return rng.weighted<ReturnDisposition>([
        { value: "scrap", weight: 55 },
        { value: "supplier_claim", weight: 35 },
        { value: "restock", weight: 10 },
      ]);
    case "short_delivery":
      return "restock";
    case "other":
    default:
      return rng.pick<ReturnDisposition>(["restock", "scrap"]);
  }
}

export function generateReturns(
  rng: Rng,
  series: Series,
  today: Date,
  invoices: Invoice[],
): SalesReturn[] {
  const returns: SalesReturn[] = [];

  // Roughly 5% of invoices see something come back — enough for the damage
  // analysis view to have a shape worth reading.
  const candidates = invoices.filter((invoice) => invoice.status !== "cancelled");
  const chosen = rng.pickMany(candidates, Math.round(candidates.length * 0.05));
  chosen.sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate));

  for (const invoice of chosen) {
    const date = addDays(new Date(invoice.invoiceDate), rng.int(3, 25));
    if (date > today) continue;

    const srNo = series.next("SR", iso(date));
    const returnedLines = rng.pickMany(invoice.lines, rng.int(1, Math.min(3, invoice.lines.length)));
    if (returnedLines.length === 0) continue;

    const ageDays = differenceInCalendarDays(today, date);
    // Newest returns are still on the inspection bench.
    const status: SalesReturn["status"] =
      ageDays < 2
        ? "draft"
        : ageDays < 7
          ? "inspecting"
          : ageDays < 12
            ? rng.bool(0.3)
              ? "approved"
              : "credited"
            : rng.bool(0.94)
              ? "credited"
              : "rejected";

    const inspected = status !== "draft" && status !== "inspecting";

    const lines: SalesReturnLine[] = returnedLines.map((line, index) => {
      const reason = rng.weighted(REASONS);
      const disposition = dispositionFor(reason, rng);
      const qtyClaimed = Math.max(1, Math.floor(line.qty * rng.float(0.03, 0.2)));
      // Counts rarely match the claim exactly.
      const qtyReceived = inspected
        ? rng.bool(0.75)
          ? qtyClaimed
          : Math.max(0, qtyClaimed - rng.int(1, Math.max(1, Math.floor(qtyClaimed * 0.3))))
        : undefined;
      const qtyGood =
        inspected && qtyReceived !== undefined
          ? disposition === "restock"
            ? Math.floor(qtyReceived * rng.float(0.7, 1))
            : 0
          : undefined;

      // Credit is raised on what was accepted, not what was claimed.
      const creditQty = qtyReceived ?? qtyClaimed;
      const amounts = computeLineAmounts(creditQty, line.unitPrice, line.discountPct, line.vatType);

      return {
        id: `srl-${srNo}-${index}`,
        productId: line.productId,
        sku: line.sku,
        description: line.description,
        qtyClaimed,
        uom: line.uom,
        unitPrice: line.unitPrice,
        vatType: line.vatType,
        reason,
        disposition,
        ...amounts,
        ...(qtyReceived !== undefined ? { qtyReceived } : {}),
        ...(qtyGood !== undefined ? { qtyGood } : {}),
        ...(qtyReceived !== undefined && qtyReceived !== qtyClaimed
          ? {
              inspectionNote: rng.pick([
                "Count short against the claim; customer notified",
                "Two cases already opened, not accepted",
                "Recounted with the driver present",
              ]),
            }
          : {}),
      };
    });

    // Returns credit the accepted quantity, so that is what the totals sum.
    const amounts = summariseDocument(
      lines.map((line) => ({
        qty: line.qtyReceived ?? line.qtyClaimed,
        unitPrice: line.unitPrice,
        discountPct: 0,
        vatType: line.vatType,
        lineNet: line.lineNet,
        lineVat: line.lineVat,
      })),
    );
    const credited = status === "credited";
    const creditDate = credited ? addDays(date, rng.int(2, 8)) : null;

    returns.push({
      id: `SR-${srNo}`,
      srNo,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      siNo: invoice.siNo,
      warehouseId: "WH-PRQ",
      date: iso(date),
      lines,
      subtotal: amounts.subtotal,
      vatBreakdown: amounts.vat,
      total: amounts.total,
      status,
      createdAt: stamp(date),
      createdById: "USR-002",
      createdByName: "Marisol Bituin",
      updatedAt: stamp(date),
      auditTrail: [
        {
          id: `au-${srNo}-1`,
          at: stamp(date),
          actorId: "USR-002",
          actorName: "Marisol Bituin",
          action: "logged the return",
          detail: `Against ${invoice.siNo}`,
        },
      ],
      attachments: [],
      eis: notSubmitted(),
      ...(inspected
        ? {
            inspectedById: "USR-003",
            inspectedByName: "Nestor Alcantara",
            inspectedAt: stamp(addDays(date, rng.int(1, 4))),
          }
        : {}),
      ...(credited && creditDate
        ? {
            creditNoteNo: series.next("CN", iso(creditDate)),
            creditNoteDate: iso(creditDate),
            approvedById: "USR-001",
            approvedByName: "Ramon Dimaculangan",
          }
        : {}),
      ...(status === "approved"
        ? { approvedById: "USR-001", approvedByName: "Ramon Dimaculangan" }
        : {}),
      ...(status === "rejected"
        ? {
            rejectionReason: rng.pick([
              "Goods outside the 14-day return window",
              "No proof the damage occurred before delivery",
              "Customer withdrew the claim",
            ]),
          }
        : {}),
    });

    // A credit note reduces what the customer owes on the source invoice, but
    // only down to zero — a credit larger than the remaining balance sits
    // unapplied on the account rather than turning the invoice negative.
    if (credited) {
      const remaining = Math.max(
        0,
        invoice.amountDue - invoice.amountPaid - invoice.creditApplied,
      );
      const applied = Math.min(remaining, amounts.total) as Centavos;
      invoice.creditApplied = (invoice.creditApplied + applied) as Centavos;
      const record = returns[returns.length - 1];
      if (record) record.creditApplied = applied;
    }
  }

  return returns;
}
