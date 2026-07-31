import type { Centavos } from "@/lib/money";
import type { DocumentBase, IsoDate } from "@/types/common";
import type { WithholdingTax } from "@/types/tax";

export type PaymentMethod = "cash" | "check" | "bank_transfer" | "online" | "offset";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  check: "Cheque",
  bank_transfer: "Bank transfer",
  online: "Online / e-wallet",
  offset: "Offset against credit note",
};

export type PaymentStatus = "draft" | "posted" | "voided";

/** One payment settles many invoices; this is a single settlement. */
export interface PaymentAllocation {
  id: string;
  invoiceId: string;
  siNo: string;
  amount: Centavos;
}

export interface Payment extends DocumentBase {
  prNo: string;
  customerId: string;
  date: IsoDate;
  method: PaymentMethod;
  /** Cheque number, transfer reference or e-wallet reference. */
  reference: string;
  /** Cheques only — a post-dated cheque is not collected until it clears. */
  checkDate?: IsoDate;
  bank?: string;
  /** Gross amount received before withholding. */
  amount: Centavos;
  allocations: PaymentAllocation[];
  /** Customers who withhold deduct EWT and remit it to the BIR themselves. */
  withholdingTax?: WithholdingTax;
  status: PaymentStatus;
  receivedById: string;
  receivedByName: string;
}

/** Gross plus the withheld portion — what the invoices are credited by. */
export function creditedAmount(payment: Payment): Centavos {
  return (payment.amount + (payment.withholdingTax?.amount ?? 0)) as Centavos;
}

export function allocatedTotal(payment: Payment): Centavos {
  return payment.allocations.reduce<number>((sum, a) => sum + a.amount, 0) as Centavos;
}

/** Left to allocate. Positive means the payment is not fully applied. */
export function unallocatedAmount(payment: Payment): Centavos {
  return (creditedAmount(payment) - allocatedTotal(payment)) as Centavos;
}

export function isFullyAllocated(payment: Payment): boolean {
  return unallocatedAmount(payment) === 0;
}

/** A row on the Statement of Account ledger, in chronological order. */
export type StatementEntryType =
  | "opening"
  | "invoice"
  | "payment"
  | "credit_note"
  | "closing";

export interface StatementEntry {
  id: string;
  date: IsoDate;
  type: StatementEntryType;
  docNo: string;
  docId?: string;
  description: string;
  /** Invoices increase the balance. */
  debit: Centavos;
  /** Payments and credit notes reduce it. */
  credit: Centavos;
  runningBalance: Centavos;
}

export interface Statement {
  customerId: string;
  periodFrom: IsoDate;
  periodTo: IsoDate;
  openingBalance: Centavos;
  entries: StatementEntry[];
  closingBalance: Centavos;
  generatedAt: string;
}
