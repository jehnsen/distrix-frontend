import { summariseAging, type AgingSummary } from "@/lib/aging";
import {
  matchesAny,
  matchesQuery,
  paginate,
  read,
  requireRecord,
  sortRows,
  withinAmount,
  write,
  ValidationError,
} from "@/lib/api/client";
import { customerSchema, creditSettingsSchema } from "@/lib/schemas/masters";
import type { Centavos } from "@/lib/money";
import { invoiceBalance } from "@/types/invoice";
import type {
  Customer,
  CustomerSegment,
  Invoice,
  Page,
  PageRequest,
  PriceList,
  RecordStatus,
  SalesRep,
} from "@/types";

export interface CustomerListRow extends Customer {
  salesRepName: string;
  aging: AgingSummary;
  openInvoiceCount: number;
}

export interface CustomerFilters extends PageRequest {
  q?: string;
  segment?: CustomerSegment[];
  status?: RecordStatus[];
  salesRepId?: string;
  balanceMin?: number | null;
  balanceMax?: number | null;
  /** Only accounts whose balance exceeds their limit. */
  overLimitOnly?: boolean;
}

function agingFor(invoices: Invoice[], customerId: string, today: Date): AgingSummary {
  return summariseAging(
    invoices
      .filter((invoice) => invoice.customerId === customerId && invoice.status !== "cancelled")
      .map((invoice) => ({ dueDate: invoice.dueDate, balance: invoiceBalance(invoice) })),
    today,
  );
}

export function listCustomers(filters: CustomerFilters = {}): Promise<Page<CustomerListRow>> {
  return read("customers", (database) => {
    const repNames = new Map(database.salesReps.map((rep) => [rep.id, rep.name]));

    const rows = database.customers
      .filter(
        (customer) =>
          matchesQuery(filters.q, customer.name, customer.code, customer.tin) &&
          matchesAny(filters.segment, customer.segment) &&
          matchesAny(filters.status, customer.status) &&
          (!filters.salesRepId || customer.salesRepId === filters.salesRepId) &&
          withinAmount(customer.currentBalance, filters.balanceMin, filters.balanceMax) &&
          (!filters.overLimitOnly || customer.currentBalance > customer.creditLimit),
      )
      .map<CustomerListRow>((customer) => ({
        ...customer,
        salesRepName: repNames.get(customer.salesRepId) ?? "—",
        aging: agingFor(database.invoices, customer.id, database.today),
        openInvoiceCount: database.invoices.filter(
          (invoice) => invoice.customerId === customer.id && invoiceBalance(invoice) > 0,
        ).length,
      }));

    const sorted = sortRows(rows, filters.sort ?? "name", {
      code: (row) => row.code,
      name: (row) => row.name,
      balance: (row) => row.currentBalance,
      creditLimit: (row) => row.creditLimit,
      utilisation: (row) => (row.creditLimit === 0 ? 0 : row.currentBalance / row.creditLimit),
      lastOrderDate: (row) => row.lastOrderDate,
      terms: (row) => row.terms,
      salesRep: (row) => row.salesRepName,
    });

    return paginate(sorted, filters);
  });
}

export interface CustomerDetail {
  customer: Customer;
  salesRep: SalesRep | undefined;
  priceList: PriceList | undefined;
  aging: AgingSummary;
  openInvoices: Invoice[];
  /** The date the buckets were computed against — never the browser's clock. */
  asOf: string;
}

export function getCustomer(id: string): Promise<CustomerDetail> {
  return read("customer", (database) => {
    const customer = requireRecord(
      database.customers.find((row) => row.id === id || row.code === id),
      "customer",
      id,
    );

    const openInvoices = database.invoices
      .filter((invoice) => invoice.customerId === customer.id && invoiceBalance(invoice) > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return {
      customer,
      salesRep: database.salesReps.find((rep) => rep.id === customer.salesRepId),
      priceList: database.priceLists.find((list) => list.id === customer.priceListId),
      aging: agingFor(database.invoices, customer.id, database.today),
      openInvoices,
      asOf: database.today.toISOString().slice(0, 10),
    };
  });
}

/** Aging for the whole book — the dashboard rail. */
export function getPortfolioAging(salesRepId?: string): Promise<AgingSummary> {
  return read("the aging summary", (database) => {
    const scoped = salesRepId
      ? database.invoices.filter((invoice) => invoice.salesRepId === salesRepId)
      : database.invoices;

    return summariseAging(
      scoped
        .filter((invoice) => invoice.status !== "cancelled")
        .map((invoice) => ({ dueDate: invoice.dueDate, balance: invoiceBalance(invoice) })),
      database.today,
    );
  });
}

export function createCustomer(input: unknown): Promise<Customer> {
  return write("customer", (database) => {
    const parsed = customerSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("customer", parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const customer: Customer = {
      ...parsed.data,
      id: `CUS-${String(database.customers.length + 1).padStart(4, "0")}`,
      segment: parsed.data.segment,
      currentBalance: 0 as Centavos,
      firstOrderDate: null,
      lastOrderDate: null,
      createdAt: new Date().toISOString(),
      createdById: "USR-002",
      createdByName: "Marisol Bituin",
      auditTrail: [],
      // Zod validates the shape; the brand is re-applied on the way in.
      creditLimit: parsed.data.creditLimit as Centavos,
      terms: parsed.data.terms as Customer["terms"],
      status: parsed.data.status,
    };

    database.customers.push(customer);
    return customer;
  });
}

/** Credit changes are audited separately — the reason goes on the record. */
export function updateCreditSettings(id: string, input: unknown): Promise<Customer> {
  return write("credit settings", (database) => {
    const parsed = creditSettingsSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "credit settings",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }

    const customer = requireRecord(
      database.customers.find((row) => row.id === id),
      "customer",
      id,
    );

    const previousLimit = customer.creditLimit;
    customer.creditLimit = parsed.data.creditLimit as Centavos;
    customer.terms = parsed.data.terms as Customer["terms"];
    customer.auditTrail.push({
      id: `au-${customer.id}-${customer.auditTrail.length + 1}`,
      at: new Date().toISOString(),
      actorId: "USR-001",
      actorName: "Ramon Dimaculangan",
      action: "changed the credit settings",
      detail: `Limit ${previousLimit / 100} → ${customer.creditLimit / 100}. ${parsed.data.reason}`,
    });

    return customer;
  });
}
