import { format, subMonths } from "date-fns";

import {
  matchesAny,
  matchesQuery,
  paginate,
  read,
  requireRecord,
  sortRows,
} from "@/lib/api/client";
import { agingOverdueTotal, agingTotal, summariseAging, type AgingSummary } from "@/lib/aging";
import { fuzzyScore } from "@/lib/command-registry";
import { sum, type Centavos } from "@/lib/money";
import { isOverCreditLimit } from "@/types/customer";
import { invoiceBalance } from "@/types/invoice";
import { stockHealth } from "@/types/product";
import type {
  CommissionRun,
  CommissionRunStatus,
  Page,
  PageRequest,
  SalesReturn,
  SalesReturnStatus,
} from "@/types";

/* -------------------------------------------------------------------------
   Sales returns
   ------------------------------------------------------------------------- */

export interface ReturnListRow extends SalesReturn {
  customerName: string;
  customerCode: string;
}

export interface ReturnFilters extends PageRequest {
  q?: string;
  status?: SalesReturnStatus[];
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function listReturns(filters: ReturnFilters = {}): Promise<Page<ReturnListRow>> {
  return read("sales returns", (database) => {
    const customers = new Map(database.customers.map((c) => [c.id, c]));

    const rows = database.returns
      .map<ReturnListRow>((sr) => {
        const customer = customers.get(sr.customerId);
        return {
          ...sr,
          customerName: customer?.name ?? "—",
          customerCode: customer?.code ?? "—",
        };
      })
      .filter(
        (row) =>
          matchesQuery(filters.q, row.srNo, row.siNo, row.customerName, row.creditNoteNo) &&
          matchesAny(filters.status, row.status) &&
          (!filters.customerId || row.customerId === filters.customerId) &&
          (!filters.dateFrom || row.date >= filters.dateFrom) &&
          (!filters.dateTo || row.date <= filters.dateTo),
      );

    return paginate(
      sortRows(rows, filters.sort ?? "-date", {
        srNo: (row) => row.srNo,
        date: (row) => row.date,
        customer: (row) => row.customerName,
        total: (row) => row.total,
        status: (row) => row.status,
      }),
      filters,
    );
  });
}

/** Damage analysis: what is coming back, why, and from whom. */
export interface DamageAnalysisRow {
  key: string;
  label: string;
  qty: number;
  value: Centavos;
  returnCount: number;
}

export function getDamageAnalysis(
  dimension: "product" | "reason" | "customer",
): Promise<DamageAnalysisRow[]> {
  return read("the damage analysis", (database) => {
    const customers = new Map(database.customers.map((c) => [c.id, c.name]));
    const buckets = new Map<string, DamageAnalysisRow>();

    for (const sr of database.returns) {
      if (sr.status === "draft" || sr.status === "rejected") continue;
      for (const line of sr.lines) {
        const qty = line.qtyReceived ?? line.qtyClaimed;
        const [key, label] =
          dimension === "product"
            ? [line.productId, `${line.sku} · ${line.description}`]
            : dimension === "reason"
              ? [line.reason, line.reason]
              : [sr.customerId, customers.get(sr.customerId) ?? "—"];

        const bucket = buckets.get(key) ?? { key, label, qty: 0, value: 0 as Centavos, returnCount: 0 };
        bucket.qty += qty;
        bucket.value = (bucket.value + line.lineTotal) as Centavos;
        bucket.returnCount += 1;
        buckets.set(key, bucket);
      }
    }

    return [...buckets.values()].sort((a, b) => b.value - a.value);
  });
}

/* -------------------------------------------------------------------------
   Commissions
   ------------------------------------------------------------------------- */

export interface CommissionRunListRow extends CommissionRun {
  salesRepName: string;
}

export function listCommissionRuns(
  filters: PageRequest & { status?: CommissionRunStatus[]; salesRepId?: string } = {},
): Promise<Page<CommissionRunListRow>> {
  return read("commission runs", (database) => {
    const reps = new Map(database.salesReps.map((r) => [r.id, r.name]));

    const rows = database.commissionRuns
      .map<CommissionRunListRow>((run) => ({
        ...run,
        salesRepName: reps.get(run.salesRepId) ?? "—",
      }))
      .filter(
        (row) =>
          matchesAny(filters.status, row.status) &&
          (!filters.salesRepId || row.salesRepId === filters.salesRepId),
      );

    return paginate(
      sortRows(rows, filters.sort ?? "-period", {
        runNo: (row) => row.runNo,
        period: (row) => row.period,
        salesRep: (row) => row.salesRepName,
        basis: (row) => row.basis,
        grossCommission: (row) => row.grossCommission,
        netPayable: (row) => row.netPayable,
        status: (row) => row.status,
      }),
      filters,
    );
  });
}

export function getCommissionRun(id: string): Promise<CommissionRunListRow> {
  return read("commission run", (database) => {
    const run = requireRecord(
      database.commissionRuns.find((row) => row.id === id || row.runNo === id),
      "commission run",
      id,
    );
    return {
      ...run,
      salesRepName: database.salesReps.find((r) => r.id === run.salesRepId)?.name ?? "—",
    };
  });
}

/* -------------------------------------------------------------------------
   Dashboard
   ------------------------------------------------------------------------- */

export interface SalesTrendPoint {
  month: string;
  invoiced: Centavos;
  collected: Centavos;
}

export interface AttentionItem {
  id: string;
  kind: "return_inspection" | "expense_approval" | "over_credit_limit" | "commission_review";
  title: string;
  detail: string;
  href: string;
  amount?: Centavos;
}

export interface DashboardSummary {
  aging: AgingSummary;
  arTotal: Centavos;
  arOverdue: Centavos;
  collectedThisMonth: Centavos;
  collectedLastMonth: Centavos;
  ordersAwaitingDispatch: number;
  invoicesDueThisWeek: { count: number; amount: Centavos };
  belowReorderPoint: number;
  posArrivingIn14Days: number;
  salesTrend: SalesTrendPoint[];
  attention: AttentionItem[];
}

export function getDashboard(): Promise<DashboardSummary> {
  return read("the dashboard", (database) => {
    const today = database.today;
    const todayIso = today.toISOString().slice(0, 10);
    const thisMonth = format(today, "yyyy-MM");
    const lastMonth = format(subMonths(today, 1), "yyyy-MM");

    const openInvoices = database.invoices.filter(
      (invoice) => invoice.status !== "cancelled" && invoiceBalance(invoice) > 0,
    );

    const aging = summariseAging(
      openInvoices.map((invoice) => ({
        dueDate: invoice.dueDate,
        balance: invoiceBalance(invoice),
      })),
      today,
    );

    const collectedIn = (month: string): Centavos =>
      sum(
        database.payments
          .filter((payment) => payment.status === "posted" && payment.date.startsWith(month))
          .flatMap((payment) => payment.allocations.map((a) => a.amount)),
      );

    const weekEnd = new Date(today.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
    const dueThisWeek = openInvoices.filter(
      (invoice) => invoice.dueDate >= todayIso && invoice.dueDate <= weekEnd,
    );

    // 12 months of invoiced against collected, the one trend chart on the page.
    const trend = new Map<string, SalesTrendPoint>();
    for (let i = 11; i >= 0; i--) {
      const month = format(subMonths(today, i), "yyyy-MM");
      trend.set(month, { month, invoiced: 0 as Centavos, collected: 0 as Centavos });
    }
    for (const invoice of database.invoices) {
      const point = trend.get(invoice.invoiceDate.slice(0, 7));
      if (point) point.invoiced = (point.invoiced + invoice.amountDue) as Centavos;
    }
    for (const payment of database.payments) {
      const point = trend.get(payment.date.slice(0, 7));
      if (point) {
        point.collected = (point.collected +
          sum(payment.allocations.map((a) => a.amount))) as Centavos;
      }
    }

    const lowStock = database.products.filter((product) => {
      const available = database.stockLevels
        .filter((level) => level.productId === product.id)
        .reduce((acc, level) => acc + level.available, 0);
      return product.status === "active" && stockHealth(available, product.reorderPoint) !== "in_stock";
    }).length;

    const horizon = new Date(today.getTime() + 14 * 86_400_000).toISOString().slice(0, 10);

    /* --- One queue combining everything that needs a decision ----------- */
    const attention: AttentionItem[] = [];

    for (const sr of database.returns.filter((row) => row.status === "inspecting")) {
      attention.push({
        id: sr.id,
        kind: "return_inspection",
        title: `${sr.srNo} awaiting inspection`,
        detail: `${database.customers.find((c) => c.id === sr.customerId)?.name ?? "—"} · ${sr.lines.length} line(s)`,
        href: `/returns/${sr.srNo}`,
        amount: sr.total,
      });
    }

    const pendingExpenses = database.expenses.filter((row) => row.status === "submitted");
    if (pendingExpenses.length > 0) {
      attention.push({
        id: "expenses-pending",
        kind: "expense_approval",
        title: `${pendingExpenses.length} expenses awaiting approval`,
        detail: `Oldest submitted ${pendingExpenses[0]?.date ?? "—"}`,
        href: "/expenses?status=submitted",
        amount: sum(pendingExpenses.map((row) => row.amount)),
      });
    }

    for (const customer of database.customers.filter(isOverCreditLimit)) {
      attention.push({
        id: customer.id,
        kind: "over_credit_limit",
        title: `${customer.name} is over its credit limit`,
        detail: `Balance against a ${customer.creditLimit / 100} limit`,
        href: `/customers/${customer.code}`,
        amount: customer.currentBalance,
      });
    }

    for (const run of database.commissionRuns.filter((row) => row.status === "for_review")) {
      attention.push({
        id: run.id,
        kind: "commission_review",
        title: `${run.runNo} awaiting review`,
        detail: `${database.salesReps.find((r) => r.id === run.salesRepId)?.name ?? "—"} · ${run.period}`,
        href: `/commissions/${run.runNo}`,
        amount: run.netPayable,
      });
    }

    return {
      aging,
      arTotal: agingTotal(aging),
      arOverdue: agingOverdueTotal(aging),
      collectedThisMonth: collectedIn(thisMonth),
      collectedLastMonth: collectedIn(lastMonth),
      ordersAwaitingDispatch: database.orders.filter(
        (order) => order.status === "confirmed" || order.status === "partially_delivered",
      ).length,
      invoicesDueThisWeek: {
        count: dueThisWeek.length,
        amount: sum(dueThisWeek.map(invoiceBalance)),
      },
      belowReorderPoint: lowStock,
      posArrivingIn14Days: database.purchaseOrders.filter(
        (po) => po.eta !== undefined && po.eta >= todayIso && po.eta <= horizon,
      ).length,
      salesTrend: [...trend.values()],
      attention,
    };
  });
}

/* -------------------------------------------------------------------------
   Global search — the command palette
   ------------------------------------------------------------------------- */

export interface SearchHit {
  id: string;
  kind: "customer" | "product" | "document";
  code: string;
  name: string;
  meta?: string;
  href: string;
}

export function searchEverything(query: string, limit = 24): Promise<SearchHit[]> {
  return read("search results", (database) => {
    if (query.trim() === "") return [];

    const hits: { hit: SearchHit; score: number }[] = [];
    const push = (hit: SearchHit) => {
      const score = Math.max(
        fuzzyScore(query, hit.code) ?? -Infinity,
        fuzzyScore(query, hit.name) ?? -Infinity,
      );
      if (score > -Infinity) hits.push({ hit, score });
    };

    for (const customer of database.customers) {
      push({
        id: customer.id,
        kind: "customer",
        code: customer.code,
        name: customer.name,
        meta: `₱${(customer.currentBalance / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
        href: `/customers/${customer.code}`,
      });
    }

    for (const product of database.products) {
      const available = database.stockLevels
        .filter((level) => level.productId === product.id)
        .reduce((acc, level) => acc + level.available, 0);
      push({
        id: product.id,
        kind: "product",
        code: product.sku,
        name: product.name,
        meta: `${available.toLocaleString("en-PH")} ${product.uom}`,
        href: `/products/${product.sku}`,
      });
    }

    // Only recent documents — searching 3,000 invoices by name helps nobody.
    for (const invoice of database.invoices.slice(-250)) {
      push({
        id: invoice.id,
        kind: "document",
        code: invoice.siNo,
        name: database.customers.find((c) => c.id === invoice.customerId)?.name ?? "—",
        meta: invoice.status,
        href: `/invoices/${invoice.siNo}`,
      });
    }
    for (const order of database.orders.slice(-250)) {
      push({
        id: order.id,
        kind: "document",
        code: order.soNo,
        name: database.customers.find((c) => c.id === order.customerId)?.name ?? "—",
        meta: order.status,
        href: `/orders/${order.soNo}`,
      });
    }

    return hits
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((row) => row.hit);
  });
}
