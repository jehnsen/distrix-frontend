import { differenceInCalendarDays } from "date-fns";

import type { Centavos } from "@/lib/money";
import type { DocumentBase, IsoDate, PaymentTerms } from "@/types/common";
import type { EisStatus, VatBreakdown, VatType } from "@/types/tax";

export type InvoiceStatus = "open" | "partial" | "paid" | "overdue" | "cancelled";

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "open",
  "partial",
  "paid",
  "overdue",
  "cancelled",
];

export interface InvoiceLine {
  id: string;
  productId: string;
  sku: string;
  description: string;
  qty: number;
  uom: string;
  unitPrice: Centavos;
  discountPct: number;
  vatType: VatType;
  lineNet: Centavos;
  lineVat: Centavos;
  lineTotal: Centavos;
}

export interface Invoice extends DocumentBase {
  siNo: string;
  customerId: string;
  salesOrderId: string;
  soNo: string;
  /** One invoice can consolidate several delivery receipts. */
  drIds: string[];
  drNos: string[];
  salesRepId: string;
  invoiceDate: IsoDate;
  dueDate: IsoDate;
  terms: PaymentTerms;
  lines: InvoiceLine[];
  subtotal: Centavos;
  discount: Centavos;
  vatBreakdown: VatBreakdown;
  /** Face value of the invoice. */
  amountDue: Centavos;
  /** Sum of payment allocations plus credit notes applied. */
  amountPaid: Centavos;
  /** Credit notes applied from sales returns. */
  creditApplied: Centavos;
  status: InvoiceStatus;
  // EIS: BIR e-invoicing submission status attaches here.
  eis: EisStatus;
}

/** What is still owed. Never negative. */
export function invoiceBalance(invoice: Invoice): Centavos {
  return Math.max(
    0,
    invoice.amountDue - invoice.amountPaid - invoice.creditApplied,
  ) as Centavos;
}

export function isSettled(invoice: Invoice): boolean {
  return invoiceBalance(invoice) === 0;
}

/** Negative until the due date passes. */
export function daysOverdue(invoice: Invoice, asOf: Date): number {
  return differenceInCalendarDays(asOf, new Date(invoice.dueDate));
}

/**
 * Status is derived, not stored blindly: an open invoice becomes overdue the
 * moment its due date passes, without anything having to run.
 */
export function deriveInvoiceStatus(invoice: Invoice, asOf: Date): InvoiceStatus {
  if (invoice.status === "cancelled") return "cancelled";
  const balance = invoiceBalance(invoice);
  if (balance === 0) return "paid";
  if (daysOverdue(invoice, asOf) > 0) return "overdue";
  return invoice.amountPaid > 0 || invoice.creditApplied > 0 ? "partial" : "open";
}

export const INVOICE_ACTIONS: Record<InvoiceStatus, string[]> = {
  open: ["recordPayment", "print", "email", "creditNote", "cancel"],
  partial: ["recordPayment", "print", "email", "creditNote"],
  paid: ["print", "email", "viewPayments"],
  overdue: ["recordPayment", "print", "email", "sendReminder", "creditNote"],
  cancelled: ["print"],
};
