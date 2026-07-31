import type { Centavos } from "@/lib/money";
import { createSeries } from "@/lib/mock/doc-numbers";
import { applyEdgeCases, type EdgeCaseTargets } from "@/lib/mock/edge-cases";
import {
  generateCommissionRules,
  generateCommissionRuns,
  generateExpenses,
} from "@/lib/mock/generate-money";
import {
  generateCustomers,
  generatePriceListEntries,
  generatePriceLists,
  generateProducts,
  generateSalesReps,
  generateSuppliers,
  generateUsers,
  generateWarehouses,
} from "@/lib/mock/generate-masters";
import { generatePurchaseOrders } from "@/lib/mock/generate-purchasing";
import { generateReturns } from "@/lib/mock/generate-returns";
import { generateSalesChain, type PaymentBehaviour } from "@/lib/mock/generate-sales";
import { generateStock } from "@/lib/mock/generate-stock";
import { createRng, SEED } from "@/lib/mock/rng";
import { deriveInvoiceStatus, invoiceBalance } from "@/types/invoice";
import type {
  CommissionRule,
  CommissionRun,
  Customer,
  DeliveryReceipt,
  Expense,
  Invoice,
  Payment,
  PriceList,
  PriceListEntry,
  Product,
  SalesOrder,
  SalesRep,
  SalesReturn,
  PurchaseOrder,
  StockAdjustment,
  StockLevel,
  StockMovement,
  StockTransfer,
  Supplier,
  UserRecord,
  Warehouse,
} from "@/types";

/**
 * The in-memory database. Built once from a single seed, then mutated in place
 * by the API layer so a posted payment really does move the statement and the
 * aging rail without a reload.
 */
export interface Database {
  today: Date;
  warehouses: Warehouse[];
  users: UserRecord[];
  salesReps: SalesRep[];
  priceLists: PriceList[];
  priceListEntries: PriceListEntry[];
  suppliers: Supplier[];
  products: Product[];
  customers: Customer[];
  orders: SalesOrder[];
  deliveries: DeliveryReceipt[];
  invoices: Invoice[];
  payments: Payment[];
  returns: SalesReturn[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
  commissionRules: CommissionRule[];
  commissionRuns: CommissionRun[];
  stockLevels: StockLevel[];
  stockMovements: StockMovement[];
  adjustments: StockAdjustment[];
  transfers: StockTransfer[];
  behaviours: Map<string, PaymentBehaviour>;
  edgeCases: EdgeCaseTargets;
}

/** "Today" is fixed so aging buckets do not drift between sessions. */
export const TODAY = new Date("2026-07-31T09:00:00+08:00");

function build(): Database {
  const rng = createRng(SEED);
  const series = createSeries();
  const today = TODAY;

  const warehouses = generateWarehouses();
  const users = generateUsers();
  const salesReps = generateSalesReps();
  const priceLists = generatePriceLists();
  const suppliers = generateSuppliers(rng);
  const products = generateProducts(rng, suppliers);
  const priceListEntries = generatePriceListEntries(rng, products, priceLists);
  const customers = generateCustomers(rng, salesReps);

  const chain = generateSalesChain({
    rng,
    series,
    today,
    customers,
    products,
    warehouses,
    priceEntries: priceListEntries,
  });

  const returns = generateReturns(rng, series, today, chain.invoices);

  const purchaseOrders = generatePurchaseOrders({
    rng,
    series,
    today,
    suppliers,
    products,
    warehouses,
  });

  const edgeCases = applyEdgeCases({
    rng,
    series,
    today,
    customers,
    products,
    orders: chain.orders,
    deliveries: chain.deliveries,
    invoices: chain.invoices,
    returns,
    purchaseOrders,
    commissionRuns: [],
  });

  const stock = generateStock({
    rng,
    series,
    today,
    products,
    warehouses,
    orders: chain.orders,
    deliveries: chain.deliveries,
    purchaseOrders,
    returns,
  });

  const expenses = generateExpenses(rng, series, today);
  const commissionRules = generateCommissionRules(rng, salesReps);
  const commissionRuns = generateCommissionRuns({
    rng,
    series,
    today,
    reps: salesReps,
    rules: commissionRules,
    invoices: chain.invoices,
    payments: chain.payments,
    customerNames: new Map(customers.map((c) => [c.id, c.name])),
    invoiceById: new Map(chain.invoices.map((i) => [i.id, i])),
  });

  // The commission run for review is forced after runs exist.
  const forReview = commissionRuns.find((run) => run.status === "for_review");
  edgeCases.commissionRunForReviewId = forReview?.id ?? commissionRuns.at(-1)?.id ?? "";
  if (!forReview) {
    const last = commissionRuns.at(-1);
    if (last) last.status = "for_review";
  }

  const db: Database = {
    today,
    warehouses,
    users,
    salesReps,
    priceLists,
    priceListEntries,
    suppliers,
    products,
    customers,
    orders: chain.orders,
    deliveries: chain.deliveries,
    invoices: chain.invoices,
    payments: chain.payments,
    returns,
    purchaseOrders,
    expenses,
    commissionRules,
    commissionRuns,
    stockLevels: stock.levels,
    stockMovements: stock.movements,
    adjustments: stock.adjustments,
    transfers: stock.transfers,
    behaviours: chain.behaviours,
    edgeCases,
  };

  recalculate(db);
  return db;
}

/**
 * Re-derives everything that hangs off invoice balances: invoice status, each
 * customer's current balance and their first/last order dates. Called after the
 * build and after every mutation the API layer makes.
 */
export function recalculate(db: Database): void {
  for (const invoice of db.invoices) {
    invoice.status = deriveInvoiceStatus(invoice, db.today);
  }

  const balances = new Map<string, Centavos>();
  for (const invoice of db.invoices) {
    if (invoice.status === "cancelled") continue;
    const current = balances.get(invoice.customerId) ?? (0 as Centavos);
    balances.set(invoice.customerId, (current + invoiceBalance(invoice)) as Centavos);
  }

  const firstOrder = new Map<string, string>();
  const lastOrder = new Map<string, string>();
  for (const order of db.orders) {
    if (order.status === "cancelled") continue;
    const first = firstOrder.get(order.customerId);
    if (!first || order.orderDate < first) firstOrder.set(order.customerId, order.orderDate);
    const last = lastOrder.get(order.customerId);
    if (!last || order.orderDate > last) lastOrder.set(order.customerId, order.orderDate);
  }

  for (const customer of db.customers) {
    customer.currentBalance = balances.get(customer.id) ?? (0 as Centavos);
    customer.firstOrderDate = firstOrder.get(customer.id) ?? null;
    customer.lastOrderDate = lastOrder.get(customer.id) ?? null;
  }
}

let instance: Database | null = null;

/**
 * The single database instance. Built lazily so the cost is paid once, on the
 * first request, rather than at module load in every worker.
 */
export function db(): Database {
  instance ??= build();
  return instance;
}

/** Test and story hook: rebuild from scratch. */
export function resetDb(): Database {
  instance = build();
  return instance;
}
