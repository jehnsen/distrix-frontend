import {
  matchesAny,
  matchesQuery,
  paginate,
  read,
  requireRecord,
  sortRows,
  withinAmount,
  withinDates,
} from "@/lib/api/client";
import type { Centavos } from "@/lib/money";
import { creditHeadroom, isOverCreditLimit } from "@/types/customer";
import { fulfilmentProgress } from "@/types/sales-order";
import type {
  Customer,
  DeliveryReceipt,
  DeliveryReceiptStatus,
  Invoice,
  Page,
  PageRequest,
  Payment,
  SalesOrder,
  SalesOrderStatus,
} from "@/types";

export interface OrderListRow extends SalesOrder {
  customerName: string;
  customerCode: string;
  salesRepName: string;
  warehouseCode: string;
  /** 0–1, drives the fulfilment progress bar. */
  progress: number;
}

export interface OrderFilters extends PageRequest {
  q?: string;
  status?: SalesOrderStatus[];
  customerId?: string;
  salesRepId?: string;
  warehouseId?: string;
  orderDateFrom?: string;
  orderDateTo?: string;
  totalMin?: number | null;
  totalMax?: number | null;
  /** Confirmed or part-delivered — what the warehouse still owes. */
  awaitingDispatchOnly?: boolean;
}

export function listOrders(filters: OrderFilters = {}): Promise<Page<OrderListRow>> {
  return read("sales orders", (database) => {
    const customers = new Map(database.customers.map((c) => [c.id, c]));
    const reps = new Map(database.salesReps.map((r) => [r.id, r.name]));
    const warehouses = new Map(database.warehouses.map((w) => [w.id, w.code]));

    const rows = database.orders
      .map<OrderListRow>((order) => {
        const customer = customers.get(order.customerId);
        return {
          ...order,
          customerName: customer?.name ?? "—",
          customerCode: customer?.code ?? "—",
          salesRepName: reps.get(order.salesRepId) ?? "—",
          warehouseCode: warehouses.get(order.warehouseId) ?? "—",
          progress: fulfilmentProgress(order),
        };
      })
      .filter(
        (row) =>
          matchesQuery(filters.q, row.soNo, row.customerName, row.customerCode, row.customerRef) &&
          matchesAny(filters.status, row.status) &&
          (!filters.customerId || row.customerId === filters.customerId) &&
          (!filters.salesRepId || row.salesRepId === filters.salesRepId) &&
          (!filters.warehouseId ||
            filters.warehouseId === "ALL" ||
            row.warehouseId === filters.warehouseId) &&
          withinDates(row.orderDate, filters.orderDateFrom, filters.orderDateTo) &&
          withinAmount(row.total, filters.totalMin, filters.totalMax) &&
          (!filters.awaitingDispatchOnly ||
            row.status === "confirmed" ||
            row.status === "partially_delivered"),
      );

    const sorted = sortRows(rows, filters.sort ?? "-orderDate", {
      soNo: (row) => row.soNo,
      orderDate: (row) => row.orderDate,
      requiredDate: (row) => row.requiredDate,
      customer: (row) => row.customerName,
      salesRep: (row) => row.salesRepName,
      total: (row) => row.total,
      progress: (row) => row.progress,
      status: (row) => row.status,
    });

    return paginate(sorted, filters);
  });
}

/**
 * The order plus the whole document trail hanging off it. The order detail page
 * renders SO → DRs → Invoices → Payments as clickable nodes, so it all arrives
 * in one call rather than four waterfalled ones.
 */
export interface OrderDetail {
  order: SalesOrder;
  customer: Customer;
  customerHeadroom: Centavos;
  customerOverLimit: boolean;
  salesRepName: string;
  warehouseName: string;
  deliveries: DeliveryReceipt[];
  invoices: Invoice[];
  payments: Payment[];
}

export function getOrder(id: string): Promise<OrderDetail> {
  return read("sales order", (database) => {
    const order = requireRecord(
      database.orders.find((row) => row.id === id || row.soNo === id),
      "sales order",
      id,
    );
    const customer = requireRecord(
      database.customers.find((row) => row.id === order.customerId),
      "customer",
      order.customerId,
    );

    const deliveries = database.deliveries
      .filter((dr) => dr.salesOrderId === order.id)
      .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));

    const invoices = database.invoices.filter((invoice) => invoice.salesOrderId === order.id);
    const invoiceIds = new Set(invoices.map((invoice) => invoice.id));

    const payments = database.payments.filter((payment) =>
      payment.allocations.some((allocation) => invoiceIds.has(allocation.invoiceId)),
    );

    return {
      order,
      customer,
      customerHeadroom: creditHeadroom(customer),
      customerOverLimit: isOverCreditLimit(customer),
      salesRepName:
        database.salesReps.find((rep) => rep.id === order.salesRepId)?.name ?? "—",
      warehouseName:
        database.warehouses.find((w) => w.id === order.warehouseId)?.name ?? "—",
      deliveries,
      invoices,
      payments,
    };
  });
}

/* -------------------------------------------------------------------------
   Delivery receipts
   ------------------------------------------------------------------------- */

export interface DeliveryListRow extends DeliveryReceipt {
  customerName: string;
  customerCode: string;
  warehouseCode: string;
  lineCount: number;
  hasShortShip: boolean;
}

export interface DeliveryFilters extends PageRequest {
  q?: string;
  status?: DeliveryReceiptStatus[];
  warehouseId?: string;
  customerId?: string;
  deliveryDateFrom?: string;
  deliveryDateTo?: string;
  driver?: string;
  /** Delivered or acknowledged but not yet billed. */
  unbilledOnly?: boolean;
}

export function listDeliveries(filters: DeliveryFilters = {}): Promise<Page<DeliveryListRow>> {
  return read("delivery receipts", (database) => {
    const customers = new Map(database.customers.map((c) => [c.id, c]));
    const warehouses = new Map(database.warehouses.map((w) => [w.id, w.code]));

    const rows = database.deliveries
      .map<DeliveryListRow>((dr) => {
        const customer = customers.get(dr.customerId);
        return {
          ...dr,
          customerName: customer?.name ?? "—",
          customerCode: customer?.code ?? "—",
          warehouseCode: warehouses.get(dr.warehouseId) ?? "—",
          lineCount: dr.lines.length,
          hasShortShip: dr.lines.some((line) => line.qtyShipped < line.qtyOrdered),
        };
      })
      .filter(
        (row) =>
          matchesQuery(filters.q, row.drNo, row.soNo, row.customerName, row.driver, row.plateNo) &&
          matchesAny(filters.status, row.status) &&
          (!filters.warehouseId ||
            filters.warehouseId === "ALL" ||
            row.warehouseId === filters.warehouseId) &&
          (!filters.customerId || row.customerId === filters.customerId) &&
          (!filters.driver || row.driver === filters.driver) &&
          withinDates(row.deliveryDate, filters.deliveryDateFrom, filters.deliveryDateTo) &&
          (!filters.unbilledOnly ||
            (row.invoiceId === undefined &&
              (row.status === "delivered" || row.status === "acknowledged"))),
      );

    const sorted = sortRows(rows, filters.sort ?? "-deliveryDate", {
      drNo: (row) => row.drNo,
      deliveryDate: (row) => row.deliveryDate,
      customer: (row) => row.customerName,
      driver: (row) => row.driver,
      dropSequence: (row) => row.dropSequence,
      status: (row) => row.status,
    });

    return paginate(sorted, filters);
  });
}

/** Dispatch board: the next few days, grouped by delivery date. */
export interface DispatchDay {
  date: string;
  drops: DeliveryListRow[];
}

export function getDispatchBoard(warehouseId?: string): Promise<DispatchDay[]> {
  return read("the dispatch board", (database) => {
    const customers = new Map(database.customers.map((c) => [c.id, c]));
    const warehouses = new Map(database.warehouses.map((w) => [w.id, w.code]));
    const from = new Date(database.today);
    from.setDate(from.getDate() - 2);
    const fromIso = from.toISOString().slice(0, 10);

    const rows = database.deliveries
      .filter(
        (dr) =>
          dr.deliveryDate >= fromIso &&
          dr.status !== "acknowledged" &&
          (!warehouseId || warehouseId === "ALL" || dr.warehouseId === warehouseId),
      )
      .map<DeliveryListRow>((dr) => {
        const customer = customers.get(dr.customerId);
        return {
          ...dr,
          customerName: customer?.name ?? "—",
          customerCode: customer?.code ?? "—",
          warehouseCode: warehouses.get(dr.warehouseId) ?? "—",
          lineCount: dr.lines.length,
          hasShortShip: dr.lines.some((line) => line.qtyShipped < line.qtyOrdered),
        };
      });

    const byDate = new Map<string, DeliveryListRow[]>();
    for (const row of rows) {
      const bucket = byDate.get(row.deliveryDate) ?? [];
      bucket.push(row);
      byDate.set(row.deliveryDate, bucket);
    }

    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, drops]) => ({
        date,
        drops: drops.sort((a, b) => a.dropSequence - b.dropSequence),
      }));
  });
}

export function getDelivery(id: string): Promise<{
  delivery: DeliveryReceipt;
  customer: Customer;
  order: SalesOrder | undefined;
}> {
  return read("delivery receipt", (database) => {
    const delivery = requireRecord(
      database.deliveries.find((row) => row.id === id || row.drNo === id),
      "delivery receipt",
      id,
    );
    return {
      delivery,
      customer: requireRecord(
        database.customers.find((row) => row.id === delivery.customerId),
        "customer",
        delivery.customerId,
      ),
      order: database.orders.find((row) => row.id === delivery.salesOrderId),
    };
  });
}
