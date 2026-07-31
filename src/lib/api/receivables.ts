import { addMonths, formatISO } from "date-fns";

import {
  matchesAny,
  matchesQuery,
  paginate,
  read,
  requireRecord,
  sortRows,
  withinAmount,
  withinDates,
  write,
  ApiError,
  ValidationError,
} from "@/lib/api/client";
import { bucketFor, type AgingBucketKey } from "@/lib/aging";
import { min as minMoney, sum, type Centavos } from "@/lib/money";
import { paymentSchema } from "@/lib/schemas/sales";
import { invoiceBalance } from "@/types/invoice";
import type {
  Customer,
  Invoice,
  InvoiceStatus,
  Page,
  PageRequest,
  Payment,
  PaymentAllocation,
  PaymentMethod,
  SalesReturn,
  Statement,
  StatementEntry,
} from "@/types";

export interface InvoiceListRow extends Invoice {
  customerName: string;
  customerCode: string;
  salesRepName: string;
  balance: Centavos;
  bucket: AgingBucketKey;
  daysOverdue: number;
}

export interface InvoiceFilters extends PageRequest {
  q?: string;
  status?: InvoiceStatus[];
  customerId?: string;
  salesRepId?: string;
  bucket?: AgingBucketKey[];
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  amountMin?: number | null;
  amountMax?: number | null;
  openOnly?: boolean;
}

function decorate(
  invoice: Invoice,
  customers: Map<string, Customer>,
  reps: Map<string, string>,
  today: Date,
): InvoiceListRow {
  const customer = customers.get(invoice.customerId);
  const balance = invoiceBalance(invoice);
  const due = new Date(invoice.dueDate);
  return {
    ...invoice,
    customerName: customer?.name ?? "—",
    customerCode: customer?.code ?? "—",
    salesRepName: reps.get(invoice.salesRepId) ?? "—",
    balance,
    bucket: bucketFor(invoice.dueDate, today),
    daysOverdue: Math.max(
      0,
      Math.round((today.getTime() - due.getTime()) / 86_400_000),
    ),
  };
}

export function listInvoices(filters: InvoiceFilters = {}): Promise<Page<InvoiceListRow>> {
  return read("invoices", (database) => {
    const customers = new Map(database.customers.map((c) => [c.id, c]));
    const reps = new Map(database.salesReps.map((r) => [r.id, r.name]));

    const rows = database.invoices
      .map((invoice) => decorate(invoice, customers, reps, database.today))
      .filter(
        (row) =>
          matchesQuery(filters.q, row.siNo, row.soNo, row.customerName, row.customerCode) &&
          matchesAny(filters.status, row.status) &&
          matchesAny(filters.bucket, row.bucket) &&
          (!filters.customerId || row.customerId === filters.customerId) &&
          (!filters.salesRepId || row.salesRepId === filters.salesRepId) &&
          withinDates(row.invoiceDate, filters.invoiceDateFrom, filters.invoiceDateTo) &&
          withinDates(row.dueDate, filters.dueDateFrom, filters.dueDateTo) &&
          withinAmount(row.amountDue, filters.amountMin, filters.amountMax) &&
          (!filters.openOnly || row.balance > 0),
      );

    const sorted = sortRows(rows, filters.sort ?? "-invoiceDate", {
      siNo: (row) => row.siNo,
      invoiceDate: (row) => row.invoiceDate,
      dueDate: (row) => row.dueDate,
      customer: (row) => row.customerName,
      salesRep: (row) => row.salesRepName,
      amountDue: (row) => row.amountDue,
      balance: (row) => row.balance,
      daysOverdue: (row) => row.daysOverdue,
      status: (row) => row.status,
    });

    return paginate(sorted, filters);
  });
}

export function getInvoice(id: string): Promise<{
  invoice: Invoice;
  customer: Customer;
  payments: Payment[];
  credits: SalesReturn[];
}> {
  return read("invoice", (database) => {
    const invoice = requireRecord(
      database.invoices.find((row) => row.id === id || row.siNo === id),
      "invoice",
      id,
    );
    return {
      invoice,
      customer: requireRecord(
        database.customers.find((row) => row.id === invoice.customerId),
        "customer",
        invoice.customerId,
      ),
      payments: database.payments.filter((payment) =>
        payment.allocations.some((allocation) => allocation.invoiceId === invoice.id),
      ),
      credits: database.returns.filter(
        (sr) => sr.invoiceId === invoice.id && sr.status === "credited",
      ),
    };
  });
}

/* -------------------------------------------------------------------------
   Payments
   ------------------------------------------------------------------------- */

export interface PaymentListRow extends Payment {
  customerName: string;
  customerCode: string;
  allocatedTo: string;
}

export interface PaymentFilters extends PageRequest {
  q?: string;
  customerId?: string;
  method?: PaymentMethod[];
  dateFrom?: string;
  dateTo?: string;
}

export function listPayments(filters: PaymentFilters = {}): Promise<Page<PaymentListRow>> {
  return read("payments", (database) => {
    const customers = new Map(database.customers.map((c) => [c.id, c]));

    const rows = database.payments
      .map<PaymentListRow>((payment) => {
        const customer = customers.get(payment.customerId);
        return {
          ...payment,
          customerName: customer?.name ?? "—",
          customerCode: customer?.code ?? "—",
          allocatedTo: payment.allocations.map((a) => a.siNo).join(", "),
        };
      })
      .filter(
        (row) =>
          matchesQuery(filters.q, row.prNo, row.reference, row.customerName, row.allocatedTo) &&
          matchesAny(filters.method, row.method) &&
          (!filters.customerId || row.customerId === filters.customerId) &&
          withinDates(row.date, filters.dateFrom, filters.dateTo),
      );

    const sorted = sortRows(rows, filters.sort ?? "-date", {
      prNo: (row) => row.prNo,
      date: (row) => row.date,
      customer: (row) => row.customerName,
      amount: (row) => row.amount,
      method: (row) => row.method,
    });

    return paginate(sorted, filters);
  });
}

/**
 * Auto-allocation, oldest first. Returns proposed allocations without posting,
 * so the payment screen can show them and let the user adjust before saving.
 */
export function proposeAllocation(
  customerId: string,
  amount: Centavos,
): Promise<{ allocations: PaymentAllocation[]; unallocated: Centavos }> {
  return read("open invoices", (database) => {
    const open = database.invoices
      .filter((invoice) => invoice.customerId === customerId && invoiceBalance(invoice) > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const allocations: PaymentAllocation[] = [];
    let remaining = amount;

    for (const invoice of open) {
      if (remaining <= 0) break;
      const applied = minMoney(remaining, invoiceBalance(invoice));
      if (applied <= 0) continue;
      allocations.push({
        id: `pa-new-${allocations.length + 1}`,
        invoiceId: invoice.id,
        siNo: invoice.siNo,
        amount: applied,
      });
      remaining = (remaining - applied) as Centavos;
    }

    return { allocations, unallocated: remaining };
  });
}

/**
 * Posts a payment. The invoices it settles, the customer's balance and the
 * aging rail all move as part of this call — that is the point of routing every
 * write through one place.
 */
export function recordPayment(input: unknown): Promise<Payment> {
  return write("payment", (database) => {
    const parsed = paymentSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "payment",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }

    const data = parsed.data;
    const customer = requireRecord(
      database.customers.find((row) => row.id === data.customerId),
      "customer",
      data.customerId,
    );

    // Guard against allocating to an invoice that has since been settled.
    for (const allocation of data.allocations) {
      const invoice = database.invoices.find((row) => row.id === allocation.invoiceId);
      if (!invoice) throw new ApiError("payment", `Invoice ${allocation.siNo} no longer exists.`, 409);
      if (allocation.amount > invoiceBalance(invoice)) {
        throw new ApiError(
          "payment",
          `${allocation.siNo} only has ${invoiceBalance(invoice) / 100} outstanding.`,
          409,
        );
      }
    }

    const year = data.date.slice(0, 4);
    const sequence = database.payments.length + 1;
    const prNo = `PR-${year}-${String(sequence).padStart(4, "0")}`;
    const now = new Date().toISOString();

    const payment: Payment = {
      id: `PR-${prNo}`,
      prNo,
      customerId: customer.id,
      date: data.date,
      method: data.method,
      reference: data.reference,
      amount: data.amount as Centavos,
      allocations: data.allocations.map((allocation, index) => ({
        id: `pa-${prNo}-${index + 1}`,
        invoiceId: allocation.invoiceId,
        siNo: allocation.siNo,
        amount: allocation.amount as Centavos,
      })),
      status: "posted",
      receivedById: "USR-004",
      receivedByName: "Divina Ocampo",
      createdAt: now,
      createdById: "USR-004",
      createdByName: "Divina Ocampo",
      updatedAt: now,
      auditTrail: [
        {
          id: `au-${prNo}-1`,
          at: now,
          actorId: "USR-004",
          actorName: "Divina Ocampo",
          action: "posted the payment",
          detail: `Allocated across ${data.allocations.length} invoice(s)`,
        },
      ],
      attachments: [],
      ...(data.checkDate ? { checkDate: data.checkDate } : {}),
      ...(data.bank ? { bank: data.bank } : {}),
      ...(data.withholdingTax
        ? {
            withholdingTax: {
              ...data.withholdingTax,
              amount: data.withholdingTax.amount as Centavos,
            },
          }
        : {}),
    };

    for (const allocation of payment.allocations) {
      const invoice = database.invoices.find((row) => row.id === allocation.invoiceId);
      if (invoice) {
        invoice.amountPaid = (invoice.amountPaid + allocation.amount) as Centavos;
        invoice.updatedAt = now;
      }
    }

    database.payments.push(payment);
    return payment;
  });
}

/* -------------------------------------------------------------------------
   Statement of Account
   ------------------------------------------------------------------------- */

export function getStatement(
  customerId: string,
  periodFrom?: string,
  periodTo?: string,
): Promise<Statement> {
  return read("the statement", (database) => {
    const customer = requireRecord(
      database.customers.find((row) => row.id === customerId || row.code === customerId),
      "customer",
      customerId,
    );

    const to = periodTo ?? formatISO(database.today, { representation: "date" });
    const from =
      periodFrom ?? formatISO(addMonths(new Date(to), -3), { representation: "date" });

    const invoices = database.invoices.filter(
      (invoice) => invoice.customerId === customer.id && invoice.status !== "cancelled",
    );
    const payments = database.payments.filter(
      (payment) => payment.customerId === customer.id && payment.status === "posted",
    );
    const credits = database.returns.filter(
      (sr) => sr.customerId === customer.id && sr.status === "credited" && sr.creditNoteDate,
    );

    // Opening balance is everything that happened before the window.
    const openingBalance = sum([
      ...invoices.filter((i) => i.invoiceDate < from).map((i) => i.amountDue),
      ...payments
        .filter((p) => p.date < from)
        .map((p) => -sum(p.allocations.map((a) => a.amount)) as Centavos),
      ...credits
        .filter((c) => (c.creditNoteDate ?? "") < from)
        // What was offset, not the face value — the rest is unapplied credit.
        .map((c) => -(c.creditApplied ?? c.total) as Centavos),
    ]);

    const raw: Omit<StatementEntry, "runningBalance">[] = [
      ...invoices
        .filter((i) => i.invoiceDate >= from && i.invoiceDate <= to)
        .map((i) => ({
          id: i.id,
          date: i.invoiceDate,
          type: "invoice" as const,
          docNo: i.siNo,
          docId: i.id,
          description: `Invoice · ${i.drNos.join(", ") || i.soNo}`,
          debit: i.amountDue,
          credit: 0 as Centavos,
        })),
      ...payments
        .filter((p) => p.date >= from && p.date <= to)
        .map((p) => ({
          id: p.id,
          date: p.date,
          type: "payment" as const,
          docNo: p.prNo,
          docId: p.id,
          description: `Payment · ${p.method} ${p.reference}`,
          debit: 0 as Centavos,
          credit: sum(p.allocations.map((a) => a.amount)),
        })),
      ...credits
        .filter((c) => (c.creditNoteDate ?? "") >= from && (c.creditNoteDate ?? "") <= to)
        .map((c) => ({
          id: c.id,
          date: c.creditNoteDate ?? c.date,
          type: "credit_note" as const,
          docNo: c.creditNoteNo ?? c.srNo,
          docId: c.id,
          description: `Credit note · against ${c.siNo ?? "—"}`,
          debit: 0 as Centavos,
          credit: c.creditApplied ?? c.total,
        })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.docNo.localeCompare(b.docNo));

    let running = openingBalance;
    const entries: StatementEntry[] = raw.map((entry) => {
      running = (running + entry.debit - entry.credit) as Centavos;
      return { ...entry, runningBalance: running };
    });

    return {
      customerId: customer.id,
      periodFrom: from,
      periodTo: to,
      openingBalance,
      entries,
      closingBalance: running,
      generatedAt: new Date().toISOString(),
    };
  });
}
