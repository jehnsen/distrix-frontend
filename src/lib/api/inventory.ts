import {
  matchesAny,
  matchesQuery,
  paginate,
  read,
  requireRecord,
  sortRows,
  withinDates,
} from "@/lib/api/client";
import type { Centavos } from "@/lib/money";
import { stockHealth, type StockHealth } from "@/types/product";
import type {
  AdjustmentReason,
  AdjustmentStatus,
  Page,
  PageRequest,
  Product,
  ProductCategory,
  StockAdjustment,
  StockLevel,
  StockTransfer,
  TransferStatus,
  Warehouse,
} from "@/types";

/** One row per product per warehouse — the Stock Levels screen. */
export interface StockLevelRow extends StockLevel {
  sku: string;
  name: string;
  category: ProductCategory;
  uom: string;
  warehouseCode: string;
  warehouseName: string;
  reorderPoint: number;
  health: StockHealth;
  standardCost: Centavos;
  /** onHand valued at standard cost. */
  stockValue: Centavos;
}

export interface StockLevelFilters extends PageRequest {
  q?: string;
  warehouseId?: string;
  category?: ProductCategory[];
  health?: StockHealth[];
  /** Hides the long tail of products a branch has never stocked. */
  hideZero?: boolean;
}

export function listStockLevels(
  filters: StockLevelFilters = {},
): Promise<Page<StockLevelRow>> {
  return read("stock levels", (database) => {
    const products = new Map(database.products.map((p) => [p.id, p]));
    const warehouses = new Map(database.warehouses.map((w) => [w.id, w]));

    const rows = database.stockLevels
      .map<StockLevelRow | null>((level) => {
        const product = products.get(level.productId);
        const warehouse = warehouses.get(level.warehouseId);
        if (!product || !warehouse) return null;
        return {
          ...level,
          sku: product.sku,
          name: product.name,
          category: product.category,
          uom: product.uom,
          warehouseCode: warehouse.code,
          warehouseName: warehouse.name,
          reorderPoint: product.reorderPoint,
          health: stockHealth(level.available, product.reorderPoint),
          standardCost: product.standardCost,
          stockValue: (level.onHand * product.standardCost) as Centavos,
        };
      })
      .filter((row): row is StockLevelRow => row !== null)
      .filter(
        (row) =>
          matchesQuery(filters.q, row.sku, row.name) &&
          (!filters.warehouseId ||
            filters.warehouseId === "ALL" ||
            row.warehouseId === filters.warehouseId) &&
          matchesAny(filters.category, row.category) &&
          matchesAny(filters.health, row.health) &&
          (!filters.hideZero || row.onHand !== 0 || row.incoming !== 0),
      );

    return paginate(
      sortRows(rows, filters.sort ?? "sku", {
        sku: (row) => row.sku,
        name: (row) => row.name,
        warehouse: (row) => row.warehouseCode,
        onHand: (row) => row.onHand,
        reserved: (row) => row.reserved,
        available: (row) => row.available,
        incoming: (row) => row.incoming,
        reorderPoint: (row) => row.reorderPoint,
        stockValue: (row) => row.stockValue,
      }),
      filters,
    );
  });
}

/* -------------------------------------------------------------------------
   Adjustments
   ------------------------------------------------------------------------- */

export interface AdjustmentListRow extends StockAdjustment {
  warehouseCode: string;
  warehouseName: string;
  lineCount: number;
  /** Distinct reason codes on the document, for the list column. */
  reasons: AdjustmentReason[];
}

export interface AdjustmentFilters extends PageRequest {
  q?: string;
  warehouseId?: string;
  status?: AdjustmentStatus[];
  reason?: AdjustmentReason[];
  dateFrom?: string;
  dateTo?: string;
}

export function listAdjustments(
  filters: AdjustmentFilters = {},
): Promise<Page<AdjustmentListRow>> {
  return read("stock adjustments", (database) => {
    const warehouses = new Map(database.warehouses.map((w) => [w.id, w]));

    const rows = database.adjustments
      .map<AdjustmentListRow>((adjustment) => {
        const warehouse = warehouses.get(adjustment.warehouseId);
        return {
          ...adjustment,
          warehouseCode: warehouse?.code ?? "—",
          warehouseName: warehouse?.name ?? "—",
          lineCount: adjustment.lines.length,
          reasons: [...new Set(adjustment.lines.map((line) => line.reason))],
        };
      })
      .filter(
        (row) =>
          matchesQuery(filters.q, row.adjNo, row.warehouseName, row.notes) &&
          (!filters.warehouseId ||
            filters.warehouseId === "ALL" ||
            row.warehouseId === filters.warehouseId) &&
          matchesAny(filters.status, row.status) &&
          (!filters.reason ||
            filters.reason.length === 0 ||
            row.reasons.some((reason) => filters.reason?.includes(reason))) &&
          withinDates(row.date, filters.dateFrom, filters.dateTo),
      );

    return paginate(
      sortRows(rows, filters.sort ?? "-date", {
        adjNo: (row) => row.adjNo,
        date: (row) => row.date,
        warehouse: (row) => row.warehouseCode,
        lineCount: (row) => row.lineCount,
        totalVarianceValue: (row) => row.totalVarianceValue,
        status: (row) => row.status,
      }),
      filters,
    );
  });
}

export function getAdjustment(id: string): Promise<{
  adjustment: StockAdjustment;
  warehouse: Warehouse;
  /** Cloned across the API boundary, so a Map would not survive — use pairs. */
  products: [string, Product][];
}> {
  return read("stock adjustment", (database) => {
    const adjustment = requireRecord(
      database.adjustments.find((row) => row.id === id || row.adjNo === id),
      "stock adjustment",
      id,
    );
    const ids = new Set(adjustment.lines.map((line) => line.productId));
    return {
      adjustment,
      warehouse: requireRecord(
        database.warehouses.find((row) => row.id === adjustment.warehouseId),
        "warehouse",
        adjustment.warehouseId,
      ),
      products: database.products
        .filter((product) => ids.has(product.id))
        .map((product) => [product.id, product] as [string, Product]),
    };
  });
}

/* -------------------------------------------------------------------------
   Transfers
   ------------------------------------------------------------------------- */

export interface TransferListRow extends StockTransfer {
  fromCode: string;
  toCode: string;
  lineCount: number;
  qtySent: number;
  qtyReceived: number;
  hasVariance: boolean;
}

export interface TransferFilters extends PageRequest {
  q?: string;
  status?: TransferStatus[];
  fromWarehouseId?: string;
  toWarehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function listTransfers(filters: TransferFilters = {}): Promise<Page<TransferListRow>> {
  return read("stock transfers", (database) => {
    const warehouses = new Map(database.warehouses.map((w) => [w.id, w.code]));

    const rows = database.transfers
      .map<TransferListRow>((transfer) => {
        const qtySent = transfer.lines.reduce((acc, line) => acc + line.qtySent, 0);
        const qtyReceived = transfer.lines.reduce((acc, line) => acc + line.qtyReceived, 0);
        return {
          ...transfer,
          fromCode: warehouses.get(transfer.fromWarehouseId) ?? "—",
          toCode: warehouses.get(transfer.toWarehouseId) ?? "—",
          lineCount: transfer.lines.length,
          qtySent,
          qtyReceived,
          hasVariance: transfer.status === "received" && qtyReceived !== qtySent,
        };
      })
      .filter(
        (row) =>
          matchesQuery(filters.q, row.trNo, row.fromCode, row.toCode) &&
          matchesAny(filters.status, row.status) &&
          (!filters.fromWarehouseId || row.fromWarehouseId === filters.fromWarehouseId) &&
          (!filters.toWarehouseId || row.toWarehouseId === filters.toWarehouseId) &&
          withinDates(row.dispatchDate, filters.dateFrom, filters.dateTo),
      );

    return paginate(
      sortRows(rows, filters.sort ?? "-dispatchDate", {
        trNo: (row) => row.trNo,
        dispatchDate: (row) => row.dispatchDate,
        expectedDate: (row) => row.expectedDate,
        from: (row) => row.fromCode,
        to: (row) => row.toCode,
        qtySent: (row) => row.qtySent,
        status: (row) => row.status,
      }),
      filters,
    );
  });
}

export function getTransfer(id: string): Promise<{
  transfer: StockTransfer;
  from: Warehouse;
  to: Warehouse;
  products: [string, Product][];
}> {
  return read("stock transfer", (database) => {
    const transfer = requireRecord(
      database.transfers.find((row) => row.id === id || row.trNo === id),
      "stock transfer",
      id,
    );
    const ids = new Set(transfer.lines.map((line) => line.productId));
    return {
      transfer,
      from: requireRecord(
        database.warehouses.find((row) => row.id === transfer.fromWarehouseId),
        "warehouse",
        transfer.fromWarehouseId,
      ),
      to: requireRecord(
        database.warehouses.find((row) => row.id === transfer.toWarehouseId),
        "warehouse",
        transfer.toWarehouseId,
      ),
      products: database.products
        .filter((product) => ids.has(product.id))
        .map((product) => [product.id, product] as [string, Product]),
    };
  });
}
