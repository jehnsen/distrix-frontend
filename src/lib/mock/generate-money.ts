import { addDays, differenceInCalendarDays, format, formatISO, subMonths } from "date-fns";

import { applyBp, fromMajor, subtract, sum, type Centavos } from "@/lib/money";
import { EXPENSE_PAYEES } from "@/lib/mock/catalogues";
import type { Series } from "@/lib/mock/doc-numbers";
import type { Rng } from "@/lib/mock/rng";
import type {
  CommissionBasis,
  CommissionLine,
  CommissionRule,
  CommissionRun,
  Expense,
  ExpenseCategory,
  Invoice,
  Payment,
  SalesRep,
} from "@/types";
import { tierFor } from "@/types/commission";

const iso = (date: Date): string => formatISO(date, { representation: "date" });
const stamp = (date: Date): string => formatISO(date);

/** Typical monthly spend per category, in pesos. */
const CATEGORY_SPEND: Record<ExpenseCategory, [number, number, number]> = {
  // [min, max, times per month]
  fuel_transport: [8_000, 42_000, 6],
  warehouse_rent: [180_000, 320_000, 1],
  utilities: [24_000, 88_000, 3],
  salaries_wages: [420_000, 610_000, 1],
  repairs_maintenance: [6_000, 68_000, 2],
  brokerage_fees: [18_000, 95_000, 1],
  office_supplies: [3_000, 18_000, 2],
  professional_fees: [25_000, 90_000, 1],
  marketing: [15_000, 140_000, 2],
  permits_licenses: [4_000, 55_000, 1],
  representation: [3_500, 28_000, 3],
  other: [1_500, 22_000, 2],
};

/** Categories where the payee is a VAT-registered supplier issuing a receipt. */
const VATABLE_CATEGORIES = new Set<ExpenseCategory>([
  "fuel_transport",
  "warehouse_rent",
  "utilities",
  "repairs_maintenance",
  "brokerage_fees",
  "office_supplies",
  "marketing",
]);

/** Categories that attract expanded withholding tax. */
const EWT_CATEGORIES: Partial<Record<ExpenseCategory, { atcCode: string; rateBp: number }>> = {
  warehouse_rent: { atcCode: "WC100", rateBp: 500 },
  professional_fees: { atcCode: "WI010", rateBp: 500 },
  brokerage_fees: { atcCode: "WC160", rateBp: 200 },
  repairs_maintenance: { atcCode: "WC160", rateBp: 200 },
};

export function generateExpenses(rng: Rng, series: Series, today: Date): Expense[] {
  const start = subMonths(today, 18);
  const expenses: Expense[] = [];
  const entries = Object.entries(CATEGORY_SPEND) as [ExpenseCategory, [number, number, number]][];

  // Spread across the real span, not 30-day months, so claims run up to today
  // and the approval queue has a live backlog rather than being empty.
  const spanDays = differenceInCalendarDays(today, start);
  const scheduled: { category: ExpenseCategory; date: Date; range: [number, number] }[] = [];
  for (const [category, [min, max, perMonth]] of entries) {
    for (let month = 0; month < 18; month++) {
      for (let i = 0; i < perMonth; i++) {
        const offset = Math.floor((spanDays * (month + rng.next())) / 18);
        const date = addDays(start, offset);
        if (date <= today) scheduled.push({ category, date, range: [min, max] });
      }
    }
  }
  scheduled.sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const { category, date, range } of scheduled) {
    const refNo = series.next("EX", iso(date));
    const amount = fromMajor(Math.round(rng.float(range[0], range[1]) / 50) * 50);
    const vatable = VATABLE_CATEGORIES.has(category) && rng.bool(0.85);
    const ewtConfig = EWT_CATEGORIES[category];
    const ageDays = differenceInCalendarDays(today, date);

    // Recent expenses are still working through approval; old ones are paid.
    // The approval queue needs a real backlog, so the window is three weeks —
    // which is about how long claims actually sit in a business this size.
    const status: Expense["status"] =
      ageDays < 5
        ? rng.weighted<Expense["status"]>([
            { value: "draft", weight: 25 },
            { value: "submitted", weight: 60 },
            { value: "approved", weight: 15 },
          ])
        : ageDays < 21
          ? rng.weighted<Expense["status"]>([
              { value: "submitted", weight: 30 },
              { value: "approved", weight: 30 },
              { value: "paid", weight: 35 },
              { value: "rejected", weight: 5 },
            ])
          : rng.bool(0.96)
            ? "paid"
            : "rejected";

    const payees = EXPENSE_PAYEES[category] ?? ["Miscellaneous"];

    expenses.push({
      id: `EX-${refNo}`,
      refNo,
      date: iso(date),
      category,
      payee: rng.pick(payees),
      amount,
      paymentMethod: rng.weighted<Expense["paymentMethod"]>([
        { value: "bank_transfer", weight: 40 },
        { value: "check", weight: 30 },
        { value: "petty_cash", weight: 15 },
        { value: "cash", weight: 10 },
        { value: "company_card", weight: 5 },
      ]),
      status,
      createdAt: stamp(date),
      createdById: "USR-004",
      createdByName: "Divina Ocampo",
      updatedAt: stamp(date),
      auditTrail: [],
      attachments:
        rng.bool(0.7)
          ? [
              {
                id: `at-${refNo}`,
                name: `OR-${rng.int(10000, 99999)}.jpg`,
                size: rng.int(180_000, 2_400_000),
                mimeType: "image/jpeg",
                uploadedAt: stamp(date),
                uploadedById: "USR-004",
                uploadedByName: "Divina Ocampo",
              },
            ]
          : [],
      ...(vatable
        ? {
            vatInput: applyBp(amount, 1200),
            payeeTin: `${rng.int(100, 999)}${rng.int(100, 999)}${rng.int(100, 999)}00000`,
          }
        : {}),
      ...(ewtConfig
        ? {
            ewt: {
              atcCode: ewtConfig.atcCode,
              rateBp: ewtConfig.rateBp,
              amount: applyBp(amount, ewtConfig.rateBp),
            },
          }
        : {}),
      ...(status === "approved" || status === "paid"
        ? {
            submittedById: "USR-004",
            submittedByName: "Divina Ocampo",
            approvedById: "USR-001",
            approvedByName: "Ramon Dimaculangan",
            approvedAt: stamp(addDays(date, rng.int(1, 5))),
          }
        : {}),
      ...(status === "submitted"
        ? { submittedById: "USR-004", submittedByName: "Divina Ocampo" }
        : {}),
      ...(status === "paid" ? { paidDate: iso(addDays(date, rng.int(2, 12))) } : {}),
      ...(status === "rejected"
        ? {
            rejectionReason: rng.pick([
              "No official receipt attached",
              "Duplicate of an earlier claim",
              "Outside the approved budget for the month",
            ]),
          }
        : {}),
    });
  }

  return expenses;
}

/**
 * Two reps sit on `collected` and the rest on `invoiced` — the distinction the
 * spec calls unmissable, so the seed makes sure both appear side by side.
 */
export function generateCommissionRules(rng: Rng, reps: SalesRep[]): CommissionRule[] {
  return reps.map((rep, index) => {
    const basis: CommissionBasis = index % 3 === 0 ? "collected" : "invoiced";
    return {
      id: `CR-${rep.id}`,
      salesRepId: rep.id,
      basis,
      tiers: [
        { id: `t-${rep.id}-1`, threshold: 0 as Centavos, rateBp: rng.pick([100, 125, 150]) },
        { id: `t-${rep.id}-2`, threshold: fromMajor(500_000), rateBp: rng.pick([175, 200, 225]) },
        { id: `t-${rep.id}-3`, threshold: fromMajor(1_500_000), rateBp: rng.pick([250, 275, 300]) },
      ],
      productOverrides: [],
      ewtRateBp: 1000,
      ewtAtcCode: "WI100",
      effectiveFrom: "2025-01-01",
      status: "active",
    };
  });
}

interface CommissionContext {
  rng: Rng;
  series: Series;
  today: Date;
  reps: SalesRep[];
  rules: CommissionRule[];
  invoices: Invoice[];
  payments: Payment[];
  customerNames: Map<string, string>;
  invoiceById: Map<string, Invoice>;
}

/** One run per rep per month, for the last six months. */
export function generateCommissionRuns(ctx: CommissionContext): CommissionRun[] {
  const { rng, series, today, reps, rules } = ctx;
  const runs: CommissionRun[] = [];

  for (let monthsBack = 6; monthsBack >= 0; monthsBack--) {
    const periodStart = subMonths(today, monthsBack);
    const from = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
    const to = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
    if (from > today) continue;

    for (const rep of reps) {
      const rule = rules.find((r) => r.salesRepId === rep.id);
      if (!rule) continue;

      const lines: CommissionLine[] = [];

      if (rule.basis === "invoiced") {
        for (const invoice of ctx.invoices) {
          if (invoice.salesRepId !== rep.id) continue;
          const date = new Date(invoice.invoiceDate);
          if (date < from || date > to) continue;
          lines.push({
            id: `cl-${invoice.id}`,
            sourceType: "invoice",
            sourceId: invoice.id,
            sourceDocNo: invoice.siNo,
            sourceDate: invoice.invoiceDate,
            customerId: invoice.customerId,
            customerName: ctx.customerNames.get(invoice.customerId) ?? "—",
            // Commission is earned on net sales, never on the VAT.
            baseAmount: invoice.subtotal,
            rateBp: 0,
            grossCommission: 0 as Centavos,
          });
        }
      } else {
        for (const payment of ctx.payments) {
          const date = new Date(payment.date);
          if (date < from || date > to) continue;
          for (const allocation of payment.allocations) {
            const invoice = ctx.invoiceById.get(allocation.invoiceId);
            if (!invoice || invoice.salesRepId !== rep.id) continue;
            // Only the net-of-VAT portion of the collection earns commission.
            const netShare =
              invoice.amountDue === 0
                ? (0 as Centavos)
                : (Math.round((allocation.amount * invoice.subtotal) / invoice.amountDue) as Centavos);
            lines.push({
              id: `cl-${payment.id}-${allocation.id}`,
              sourceType: "payment",
              sourceId: payment.id,
              sourceDocNo: payment.prNo,
              sourceDate: payment.date,
              customerId: payment.customerId,
              customerName: ctx.customerNames.get(payment.customerId) ?? "—",
              baseAmount: netShare,
              rateBp: 0,
              grossCommission: 0 as Centavos,
            });
          }
        }
      }

      if (lines.length === 0) continue;

      const totalBase = sum(lines.map((line) => line.baseAmount));
      const tier = tierFor(rule.tiers, totalBase);
      const rateBp = tier?.rateBp ?? 0;
      for (const line of lines) {
        line.rateBp = rateBp;
        line.grossCommission = applyBp(line.baseAmount, rateBp);
      }

      const grossCommission = sum(lines.map((line) => line.grossCommission));
      const ewtAmount = applyBp(grossCommission, rule.ewtRateBp);
      const runNo = series.next("CR", iso(to));

      // The newest period is the one left sitting for review.
      const status: CommissionRun["status"] =
        monthsBack === 0
          ? "draft"
          : monthsBack === 1
            ? "for_review"
            : monthsBack === 2
              ? "approved"
              : "paid";

      runs.push({
        id: `CR-${runNo}`,
        runNo,
        period: format(from, "yyyy-MM"),
        periodFrom: iso(from),
        periodTo: iso(to),
        salesRepId: rep.id,
        basis: rule.basis,
        lines,
        totalBase,
        grossCommission,
        ewt: { atcCode: rule.ewtAtcCode, rateBp: rule.ewtRateBp, amount: ewtAmount },
        netPayable: subtract(grossCommission, ewtAmount),
        status,
        createdAt: stamp(addDays(to, 2)),
        createdById: "USR-004",
        createdByName: "Divina Ocampo",
        updatedAt: stamp(addDays(to, 2)),
        auditTrail: [],
        attachments: [],
        ...(status === "approved" || status === "paid"
          ? {
              approvedById: "USR-001",
              approvedByName: "Ramon Dimaculangan",
              approvedAt: stamp(addDays(to, rng.int(3, 8))),
            }
          : {}),
        ...(status === "paid" ? { paidDate: iso(addDays(to, rng.int(8, 16))) } : {}),
      });
    }
  }

  return runs;
}
