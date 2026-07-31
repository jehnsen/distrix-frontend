import {
  matchesAny,
  matchesQuery,
  paginate,
  read,
  requireRecord,
  sortRows,
} from "@/lib/api/client";
import type { Centavos } from "@/lib/money";
import { grossMarginPct, stockHealth, type StockHealth } from "@/types/product";
import type {
  Page,
  PageRequest,
  PriceListEntry,
  Product,
  ProductCategory,
  RecordStatus,
  StockLevel,
  StockMovement,
  Supplier,
  Warehouse,
} from "@/types";

/** A product plus its stock position, which is how it is always listed. */
export interface ProductListRow extends Product {
  onHand: number;
  reserved: number;
  available: number;
  incoming: number;
  health: StockHealth;
  marginPct: number;
  supplierName: string;
}

export interface ProductFilters extends PageRequest {
  q?: string;
  category?: ProductCategory[];
  status?: RecordStatus[];
  health?: StockHealth[];
  supplierId?: string;
  /** Scopes the stock figures; omit or pass "ALL" for the consolidated view. */
  warehouseId?: string;
  isImported?: boolean;
  belowReorderOnly?: boolean;
}

function rollUpStock(levels: StockLevel[], productId: string, warehouseId?: string) {
  const scoped = levels.filter(
    (level) =>
      level.productId === productId &&
      (!warehouseId || warehouseId === "ALL" || level.warehouseId === warehouseId),
  );
  return scoped.reduce(
    (acc, level) => ({
      onHand: acc.onHand + level.onHand,
      reserved: acc.reserved + level.reserved,
      available: acc.available + level.available,
      incoming: acc.incoming + level.incoming,
    }),
    { onHand: 0, reserved: 0, available: 0, incoming: 0 },
  );
}

export function listProducts(filters: ProductFilters = {}): Promise<Page<ProductListRow>> {
  return read("products", (database) => {
    const supplierNames = new Map(database.suppliers.map((s) => [s.id, s.name]));

    const rows = database.products
      .map<ProductListRow>((product) => {
        const stock = rollUpStock(database.stockLevels, product.id, filters.warehouseId);
        return {
          ...product,
          ...stock,
          health: stockHealth(stock.available, product.reorderPoint),
          marginPct: grossMarginPct(product.listPrice, product.standardCost),
          supplierName: supplierNames.get(product.primarySupplierId) ?? "—",
        };
      })
      .filter(
        (row) =>
          matchesQuery(filters.q, row.sku, row.name, row.brand, row.barcode) &&
          matchesAny(filters.category, row.category) &&
          matchesAny(filters.status, row.status) &&
          matchesAny(filters.health, row.health) &&
          (!filters.supplierId || row.primarySupplierId === filters.supplierId) &&
          (filters.isImported === undefined || row.isImported === filters.isImported) &&
          (!filters.belowReorderOnly || row.available <= row.reorderPoint),
      );

    const sorted = sortRows(rows, filters.sort ?? "sku", {
      sku: (row) => row.sku,
      name: (row) => row.name,
      category: (row) => row.category,
      onHand: (row) => row.onHand,
      available: (row) => row.available,
      incoming: (row) => row.incoming,
      reorderPoint: (row) => row.reorderPoint,
      standardCost: (row) => row.standardCost,
      listPrice: (row) => row.listPrice,
      marginPct: (row) => row.marginPct,
    });

    return paginate(sorted, filters);
  });
}

export interface ProductStockByWarehouse {
  warehouse: Warehouse;
  level: StockLevel;
  health: StockHealth;
}

export interface ProductDetail {
  product: Product;
  supplier: Supplier | undefined;
  stockByWarehouse: ProductStockByWarehouse[];
  movements: StockMovement[];
  priceListEntries: PriceListEntry[];
  /** Imported items only: what each receipt actually landed at. */
  landedCostHistory: {
    poNo: string;
    receivedDate: string;
    qty: number;
    unitLandedCost: Centavos;
  }[];
}

export function getProduct(id: string): Promise<ProductDetail> {
  return read("product", (database) => {
    const product = requireRecord(
      database.products.find((row) => row.id === id || row.sku === id),
      "product",
      id,
    );

    const stockByWarehouse = database.warehouses.map((warehouse) => {
      const level = database.stockLevels.find(
        (row) => row.productId === product.id && row.warehouseId === warehouse.id,
      ) ?? {
        productId: product.id,
        warehouseId: warehouse.id,
        onHand: 0,
        reserved: 0,
        available: 0,
        incoming: 0,
      };
      return { warehouse, level, health: stockHealth(level.available, product.reorderPoint) };
    });

    const landedCostHistory = database.purchaseOrders
      .filter((po) => po.lines.some((line) => line.productId === product.id))
      .flatMap((po) =>
        po.receipts.flatMap((receipt) =>
          receipt.lines
            .filter((line) => line.productId === product.id)
            .map((line) => {
              const poLine = po.lines.find((l) => l.id === line.purchaseOrderLineId);
              return {
                poNo: po.poNo,
                receivedDate: receipt.receivedDate,
                qty: line.qtyReceived,
                unitLandedCost: poLine?.unitLandedCost ?? poLine?.unitPricePhp ?? (0 as Centavos),
              };
            }),
        ),
      )
      .sort((a, b) => b.receivedDate.localeCompare(a.receivedDate));

    return {
      product,
      supplier: database.suppliers.find((s) => s.id === product.primarySupplierId),
      stockByWarehouse,
      movements: database.stockMovements
        .filter((movement) => movement.productId === product.id)
        .slice(0, 200),
      priceListEntries: database.priceListEntries.filter(
        (entry) => entry.productId === product.id,
      ),
      landedCostHistory,
    };
  });
}

/** What needs ordering, with cover in days against recent offtake. */
export interface ReorderRow {
  product: Product;
  available: number;
  incoming: number;
  reorderPoint: number;
  shortfall: number;
  supplierName: string;
  leadTimeDays: number;
}

export function getReorderReport(warehouseId?: string): Promise<ReorderRow[]> {
  return read("the reorder report", (database) => {
    const suppliers = new Map(database.suppliers.map((s) => [s.id, s]));

    return database.products
      .filter((product) => product.status === "active")
      .map((product) => {
        const stock = rollUpStock(database.stockLevels, product.id, warehouseId);
        const supplier = suppliers.get(product.primarySupplierId);
        return {
          product,
          available: stock.available,
          incoming: stock.incoming,
          reorderPoint: product.reorderPoint,
          shortfall: Math.max(0, product.reorderPoint - stock.available - stock.incoming),
          supplierName: supplier?.name ?? "—",
          leadTimeDays: supplier?.leadTimeDays ?? 0,
        };
      })
      .filter((row) => row.available + row.incoming <= row.reorderPoint)
      .sort((a, b) => b.shortfall - a.shortfall);
  });
}

export function listWarehouses(): Promise<Warehouse[]> {
  return read("warehouses", (database) => database.warehouses);
}

export function listSuppliers(): Promise<Supplier[]> {
  return read("suppliers", (database) => database.suppliers);
}
