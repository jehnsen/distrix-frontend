import { bucketFor, summariseAging, agingOverdueTotal } from "@/lib/aging";
import { read, requireRecord } from "@/lib/api/client";
import type { Centavos } from "@/lib/money";
import { creditHeadroom } from "@/types/customer";
import { invoiceBalance } from "@/types/invoice";
import { stockHealth, type StockHealth } from "@/types/product";
import type { PaymentTerms, SalesOrder, VatType } from "@/types";

/**
 * Data for the comboboxes on document forms. The spec asks that picking a
 * customer surface terms, credit headroom and aging (§7) — so those travel with
 * the option rather than needing a second round trip after selection.
 */

export interface CustomerOption {
  id: string;
  code: string;
  name: string;
  terms: PaymentTerms;
  creditLimit: Centavos;
  currentBalance: Centavos;
  headroom: Centavos;
  isOverLimit: boolean;
  /** Everything past due, so the picker can warn before the order is taken. */
  pastDue: Centavos;
  worstBucket: string | null;
  priceListId: string;
  salesRepId: string;
  salesRepName: string;
  status: string;
  /** The site that normally serves this customer's province. */
  defaultWarehouseId: string;
}

function warehouseForProvince(province: string): string {
  if (["Cebu", "Iloilo", "Negros Occidental", "Bohol"].includes(province)) return "WH-CEB";
  if (
    province.startsWith("Davao") ||
    ["Misamis Oriental", "South Cotabato", "Zamboanga del Sur", "Agusan del Norte"].includes(
      province,
    )
  ) {
    return "WH-DVO";
  }
  return "WH-PRQ";
}

export function listCustomerOptions(): Promise<CustomerOption[]> {
  return read("the customer list", (database) => {
    const reps = new Map(database.salesReps.map((rep) => [rep.id, rep.name]));

    return database.customers
      .filter((customer) => customer.status !== "inactive")
      .map<CustomerOption>((customer) => {
        const open = database.invoices.filter(
          (invoice) =>
            invoice.customerId === customer.id &&
            invoice.status !== "cancelled" &&
            invoiceBalance(invoice) > 0,
        );
        const aging = summariseAging(
          open.map((invoice) => ({
            dueDate: invoice.dueDate,
            balance: invoiceBalance(invoice),
          })),
          database.today,
        );
        const worst = open
          .map((invoice) => bucketFor(invoice.dueDate, database.today))
          .filter((bucket) => bucket !== "current")
          .sort()
          .pop();

        return {
          id: customer.id,
          code: customer.code,
          name: customer.name,
          terms: customer.terms,
          creditLimit: customer.creditLimit,
          currentBalance: customer.currentBalance,
          headroom: creditHeadroom(customer),
          isOverLimit: customer.currentBalance > customer.creditLimit,
          pastDue: agingOverdueTotal(aging),
          worstBucket: worst ?? null,
          priceListId: customer.priceListId,
          salesRepId: customer.salesRepId,
          salesRepName: reps.get(customer.salesRepId) ?? "—",
          status: customer.status,
          defaultWarehouseId: warehouseForProvince(customer.address.province),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });
}

/**
 * Products shaped for `<LineItemsEditor>`: the SKU, what is available in the
 * chosen warehouse and the price this customer's list gives them. The editor
 * warns when a quantity exceeds `available` — it never blocks the order.
 */
export interface ProductOption {
  id: string;
  sku: string;
  name: string;
  uom: string;
  altUom?: string;
  altUomConversion?: number;
  unitPrice: Centavos;
  available: number;
  onHand: number;
  incoming: number;
  reorderPoint: number;
  health: StockHealth;
  vatType: VatType;
}

export function listProductOptions(
  warehouseId: string,
  priceListId?: string,
): Promise<ProductOption[]> {
  return read("the product list", (database) => {
    return database.products
      .filter((product) => product.status === "active")
      .map<ProductOption>((product) => {
        const levels = database.stockLevels.filter(
          (level) =>
            level.productId === product.id &&
            (warehouseId === "ALL" || level.warehouseId === warehouseId),
        );
        const available = levels.reduce((acc, level) => acc + level.available, 0);
        const onHand = levels.reduce((acc, level) => acc + level.onHand, 0);
        const incoming = levels.reduce((acc, level) => acc + level.incoming, 0);

        // Best applicable break at quantity one; the editor re-prices on qty.
        const entry = database.priceListEntries
          .filter(
            (row) =>
              row.productId === product.id &&
              row.priceListId === (priceListId ?? "PL-STD") &&
              row.minQty === 0,
          )
          .at(0);

        return {
          id: product.id,
          sku: product.sku,
          name: product.name,
          uom: product.uom,
          unitPrice: entry?.unitPrice ?? product.listPrice,
          available,
          onHand,
          incoming,
          reorderPoint: product.reorderPoint,
          health: stockHealth(available, product.reorderPoint),
          vatType: product.vatType,
          ...(product.altUom ? { altUom: product.altUom } : {}),
          ...(product.altUomConversion
            ? { altUomConversion: product.altUomConversion }
            : {}),
        };
      })
      .sort((a, b) => a.sku.localeCompare(b.sku));
  });
}

/** Volume-break lookup, so the line editor can re-price as quantity changes. */
export function priceFor(
  productId: string,
  priceListId: string,
  qty: number,
): Promise<Centavos> {
  return read("the price", (database) => {
    const applicable = database.priceListEntries.filter(
      (entry) =>
        entry.productId === productId &&
        entry.priceListId === priceListId &&
        qty >= entry.minQty,
    );
    if (applicable.length > 0) {
      return applicable.reduce((best, entry) =>
        entry.minQty > best.minQty ? entry : best,
      ).unitPrice;
    }
    const product = database.products.find((row) => row.id === productId);
    return product?.listPrice ?? (0 as Centavos);
  });
}

/**
 * Orders a delivery can be raised against: confirmed or part-delivered, with
 * something still outstanding.
 */
export interface DeliverableOrder {
  order: SalesOrder;
  customerName: string;
  customerCode: string;
  warehouseCode: string;
  outstandingQty: number;
}

export function listDeliverableOrders(warehouseId?: string): Promise<DeliverableOrder[]> {
  return read("open orders", (database) => {
    const customers = new Map(database.customers.map((c) => [c.id, c]));
    const warehouses = new Map(database.warehouses.map((w) => [w.id, w.code]));

    return database.orders
      .filter(
        (order) =>
          (order.status === "confirmed" || order.status === "partially_delivered") &&
          (!warehouseId || warehouseId === "ALL" || order.warehouseId === warehouseId) &&
          order.lines.some((line) => line.qty > line.deliveredQty),
      )
      .map((order) => {
        const customer = customers.get(order.customerId);
        return {
          order,
          customerName: customer?.name ?? "—",
          customerCode: customer?.code ?? "—",
          warehouseCode: warehouses.get(order.warehouseId) ?? "—",
          outstandingQty: order.lines.reduce(
            (acc, line) => acc + Math.max(0, line.qty - line.deliveredQty),
            0,
          ),
        };
      })
      .sort((a, b) => a.order.requiredDate.localeCompare(b.order.requiredDate));
  });
}

/** Delivered or acknowledged receipts that have not been billed yet. */
export function listBillableDeliveries(customerId?: string): Promise<
  { id: string; drNo: string; soNo: string; deliveryDate: string; qty: number }[]
> {
  return read("unbilled deliveries", (database) =>
    database.deliveries
      .filter(
        (dr) =>
          dr.invoiceId === undefined &&
          (dr.status === "delivered" || dr.status === "acknowledged") &&
          (!customerId || dr.customerId === customerId),
      )
      .map((dr) => ({
        id: dr.id,
        drNo: dr.drNo,
        soNo: dr.soNo,
        deliveryDate: dr.deliveryDate,
        qty: dr.lines.reduce((acc, line) => acc + line.qtyShipped, 0),
      }))
      .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate)),
  );
}

export function getDrivers(): Promise<{ name: string; plate: string }[]> {
  return read("the driver list", (database) => {
    const seen = new Map<string, string>();
    for (const dr of database.deliveries) {
      if (!seen.has(dr.driver)) seen.set(dr.driver, dr.plateNo);
    }
    return [...seen.entries()].map(([name, plate]) => ({ name, plate }));
  });
}

export function requireOrder(id: string) {
  return read("sales order", (database) =>
    requireRecord(
      database.orders.find((row) => row.id === id || row.soNo === id),
      "sales order",
      id,
    ),
  );
}
