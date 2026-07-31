import {
  matchesAny,
  matchesQuery,
  paginate,
  read,
  requireRecord,
  sortRows,
  withinDates,
  write,
} from "@/lib/api/client";
import { allocateLandedCosts } from "@/lib/mock/generate-purchasing";
import { sum, type Centavos } from "@/lib/money";
import { currentStage, receiptProgress } from "@/types/purchase-order";
import type {
  AllocationBasis,
  ExpenseCategory,
  ExpenseStatus,
  Page,
  PageRequest,
  PurchaseOrder,
  PurchaseOrderStatus,
  ShipmentStage,
  Supplier,
  SupplierType,
  Expense,
} from "@/types";

export interface PurchaseOrderListRow extends PurchaseOrder {
  supplierName: string;
  warehouseCode: string;
  progress: number;
  stage: ShipmentStage;
  hasVariance: boolean;
  landedCostAllocated: boolean;
}

export interface PurchaseOrderFilters extends PageRequest {
  q?: string;
  status?: PurchaseOrderStatus[];
  type?: SupplierType;
  supplierId?: string;
  orderDateFrom?: string;
  orderDateTo?: string;
  /** Imports arriving within N days — feeds the dashboard tile. */
  arrivingWithinDays?: number;
}

export function listPurchaseOrders(
  filters: PurchaseOrderFilters = {},
): Promise<Page<PurchaseOrderListRow>> {
  return read("purchase orders", (database) => {
    const suppliers = new Map(database.suppliers.map((s) => [s.id, s.name]));
    const warehouses = new Map(database.warehouses.map((w) => [w.id, w.code]));

    const horizon = filters.arrivingWithinDays
      ? new Date(database.today.getTime() + filters.arrivingWithinDays * 86_400_000)
          .toISOString()
          .slice(0, 10)
      : undefined;
    const todayIso = database.today.toISOString().slice(0, 10);

    const rows = database.purchaseOrders
      .map<PurchaseOrderListRow>((po) => ({
        ...po,
        supplierName: suppliers.get(po.supplierId) ?? "—",
        warehouseCode: warehouses.get(po.warehouseId) ?? "—",
        progress: receiptProgress(po),
        stage: currentStage(po),
        hasVariance: po.receipts.some((receipt) =>
          receipt.lines.some((line) => line.varianceQty !== 0),
        ),
        landedCostAllocated: po.lines.some((line) => line.unitLandedCost !== undefined),
      }))
      .filter(
        (row) =>
          matchesQuery(filters.q, row.poNo, row.supplierName) &&
          matchesAny(filters.status, row.status) &&
          (!filters.type || row.type === filters.type) &&
          (!filters.supplierId || row.supplierId === filters.supplierId) &&
          withinDates(row.orderDate, filters.orderDateFrom, filters.orderDateTo) &&
          (!horizon || (row.eta !== undefined && row.eta >= todayIso && row.eta <= horizon)),
      );

    const sorted = sortRows(rows, filters.sort ?? "-orderDate", {
      poNo: (row) => row.poNo,
      orderDate: (row) => row.orderDate,
      eta: (row) => row.eta ?? null,
      supplier: (row) => row.supplierName,
      totalPhp: (row) => row.totalPhp,
      progress: (row) => row.progress,
      status: (row) => row.status,
    });

    return paginate(sorted, filters);
  });
}

export function getPurchaseOrder(id: string): Promise<{
  purchaseOrder: PurchaseOrder;
  supplier: Supplier;
  warehouseName: string;
}> {
  return read("purchase order", (database) => {
    const po = requireRecord(
      database.purchaseOrders.find((row) => row.id === id || row.poNo === id),
      "purchase order",
      id,
    );
    return {
      purchaseOrder: po,
      supplier: requireRecord(
        database.suppliers.find((row) => row.id === po.supplierId),
        "supplier",
        po.supplierId,
      ),
      warehouseName: database.warehouses.find((w) => w.id === po.warehouseId)?.name ?? "—",
    };
  });
}

/**
 * Previews the per-unit landed cost for a basis without posting it, so the user
 * can compare "by value" against "by weight" before committing. The spec calls
 * for this preview to be live — hence a read, not a write.
 */
export interface LandedCostPreviewLine {
  purchaseOrderLineId: string;
  sku: string;
  description: string;
  qty: number;
  baseCostPhp: Centavos;
  allocatedCost: Centavos;
  unitLandedCost: Centavos;
  /** Against the product's current standard cost, as a percentage. */
  variancePct: number;
}

export function previewLandedCost(
  purchaseOrderId: string,
  basis: AllocationBasis,
): Promise<{ lines: LandedCostPreviewLine[]; total: Centavos }> {
  return read("the landed cost preview", (database) => {
    const po = requireRecord(
      database.purchaseOrders.find((row) => row.id === purchaseOrderId),
      "purchase order",
      purchaseOrderId,
    );
    const productMap = new Map(database.products.map((p) => [p.id, p]));

    // Clone so the preview never mutates the stored order.
    const clonedLines = po.lines.map((line) => ({ ...line }));
    const costs = po.landedCosts.map((cost) => ({ ...cost, basis }));
    allocateLandedCosts(clonedLines, costs, productMap);

    return {
      lines: clonedLines.map((line) => {
        const product = productMap.get(line.productId);
        const unit = line.unitLandedCost ?? (0 as Centavos);
        return {
          purchaseOrderLineId: line.id,
          sku: line.sku,
          description: line.description,
          qty: line.qty,
          baseCostPhp: line.lineTotalPhp,
          allocatedCost: line.allocatedLandedCost ?? (0 as Centavos),
          unitLandedCost: unit,
          variancePct:
            product && product.standardCost > 0
              ? ((unit - product.standardCost) / product.standardCost) * 100
              : 0,
        };
      }),
      total: sum(po.landedCosts.map((cost) => cost.amount)),
    };
  });
}

export function postLandedCostAllocation(
  purchaseOrderId: string,
  basis: AllocationBasis,
): Promise<PurchaseOrder> {
  return write("the landed cost allocation", (database) => {
    const po = requireRecord(
      database.purchaseOrders.find((row) => row.id === purchaseOrderId),
      "purchase order",
      purchaseOrderId,
    );
    const productMap = new Map(database.products.map((p) => [p.id, p]));

    for (const cost of po.landedCosts) cost.basis = basis;
    allocateLandedCosts(po.lines, po.landedCosts, productMap);

    // Landed cost is the new standard cost for imports — that is the number
    // margin gets measured against from here on.
    for (const line of po.lines) {
      const product = productMap.get(line.productId);
      if (product && line.unitLandedCost !== undefined && product.isImported) {
        product.standardCost = line.unitLandedCost;
      }
    }

    po.updatedAt = new Date().toISOString();
    po.auditTrail.push({
      id: `au-${po.poNo}-${po.auditTrail.length + 1}`,
      at: po.updatedAt,
      actorId: "USR-005",
      actorName: "Joel Fajardo",
      action: "allocated landed cost",
      detail: `Basis: ${basis}`,
    });

    return po;
  });
}

/* -------------------------------------------------------------------------
   Expenses
   ------------------------------------------------------------------------- */

export interface ExpenseFilters extends PageRequest {
  q?: string;
  category?: ExpenseCategory[];
  status?: ExpenseStatus[];
  dateFrom?: string;
  dateTo?: string;
  pendingApprovalOnly?: boolean;
}

export function listExpenses(filters: ExpenseFilters = {}): Promise<Page<Expense>> {
  return read("expenses", (database) => {
    const rows = database.expenses.filter(
      (expense) =>
        matchesQuery(filters.q, expense.refNo, expense.payee, expense.notes) &&
        matchesAny(filters.category, expense.category) &&
        matchesAny(filters.status, expense.status) &&
        withinDates(expense.date, filters.dateFrom, filters.dateTo) &&
        (!filters.pendingApprovalOnly || expense.status === "submitted"),
    );

    const sorted = sortRows(rows, filters.sort ?? "-date", {
      refNo: (row) => row.refNo,
      date: (row) => row.date,
      category: (row) => row.category,
      payee: (row) => row.payee,
      amount: (row) => row.amount,
      status: (row) => row.status,
    });

    return paginate(sorted, filters);
  });
}

/** Bulk approve, as the approval queue offers. */
export function approveExpenses(ids: string[]): Promise<Expense[]> {
  return write("the expense approvals", (database) => {
    const now = new Date().toISOString();
    const approved: Expense[] = [];

    for (const id of ids) {
      const expense = database.expenses.find((row) => row.id === id);
      if (!expense || expense.status !== "submitted") continue;
      expense.status = "approved";
      expense.approvedById = "USR-001";
      expense.approvedByName = "Ramon Dimaculangan";
      expense.approvedAt = now;
      expense.updatedAt = now;
      expense.auditTrail.push({
        id: `au-${expense.refNo}-${expense.auditTrail.length + 1}`,
        at: now,
        actorId: "USR-001",
        actorName: "Ramon Dimaculangan",
        action: "approved the expense",
      });
      approved.push(expense);
    }

    return approved;
  });
}

/** Spend by category and month, for the expense report and its trend chart. */
export interface ExpenseTrendPoint {
  month: string;
  total: Centavos;
  byCategory: Record<string, Centavos>;
}

export function getExpenseTrend(months = 12): Promise<ExpenseTrendPoint[]> {
  return read("the expense trend", (database) => {
    const buckets = new Map<string, Map<string, Centavos>>();

    for (const expense of database.expenses) {
      if (expense.status === "rejected" || expense.status === "draft") continue;
      const month = expense.date.slice(0, 7);
      const byCategory = buckets.get(month) ?? new Map<string, Centavos>();
      byCategory.set(
        expense.category,
        ((byCategory.get(expense.category) ?? 0) + expense.amount) as Centavos,
      );
      buckets.set(month, byCategory);
    }

    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-months)
      .map(([month, byCategory]) => ({
        month,
        total: sum([...byCategory.values()]),
        byCategory: Object.fromEntries(byCategory),
      }));
  });
}
