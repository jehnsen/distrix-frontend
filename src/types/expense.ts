import type { Centavos } from "@/lib/money";
import type { DocumentBase, IsoDate } from "@/types/common";
import type { WithholdingTax } from "@/types/tax";

export type ExpenseCategory =
  | "fuel_transport"
  | "warehouse_rent"
  | "utilities"
  | "salaries_wages"
  | "repairs_maintenance"
  | "brokerage_fees"
  | "office_supplies"
  | "professional_fees"
  | "marketing"
  | "permits_licenses"
  | "representation"
  | "other";

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  fuel_transport: "Fuel & transport",
  warehouse_rent: "Warehouse rent",
  utilities: "Utilities",
  salaries_wages: "Salaries & wages",
  repairs_maintenance: "Repairs & maintenance",
  brokerage_fees: "Brokerage & customs fees",
  office_supplies: "Office supplies",
  professional_fees: "Professional fees",
  marketing: "Marketing & trade support",
  permits_licenses: "Permits & licences",
  representation: "Representation",
  other: "Other",
};

export type ExpenseStatus = "draft" | "submitted" | "approved" | "paid" | "rejected";

export const EXPENSE_STATUSES: ExpenseStatus[] = [
  "draft",
  "submitted",
  "approved",
  "paid",
  "rejected",
];

export type ExpensePaymentMethod =
  | "cash"
  | "check"
  | "bank_transfer"
  | "petty_cash"
  | "company_card";

export const EXPENSE_PAYMENT_METHOD_LABEL: Record<ExpensePaymentMethod, string> = {
  cash: "Cash",
  check: "Cheque",
  bank_transfer: "Bank transfer",
  petty_cash: "Petty cash",
  company_card: "Company card",
};

export interface Expense extends DocumentBase {
  refNo: string;
  date: IsoDate;
  category: ExpenseCategory;
  payee: string;
  /** Supplier TIN where one exists — required to claim input VAT. */
  payeeTin?: string;
  /** Net of VAT. */
  amount: Centavos;
  /** Claimable input VAT. Absent when the payee is not VAT-registered. */
  vatInput?: Centavos;
  /** Withheld from the payee and remitted to the BIR. */
  ewt?: WithholdingTax;
  paymentMethod: ExpensePaymentMethod;
  /** Set when the expense relates to a specific shipment's brokerage. */
  purchaseOrderId?: string;
  status: ExpenseStatus;
  submittedById?: string;
  submittedByName?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  paidDate?: IsoDate;
}

/** Cash out of the door: net plus input VAT, less anything withheld. */
export function expenseNetPayable(expense: Expense): Centavos {
  return (expense.amount + (expense.vatInput ?? 0) - (expense.ewt?.amount ?? 0)) as Centavos;
}

/** Gross cost including VAT, before withholding. */
export function expenseGross(expense: Expense): Centavos {
  return (expense.amount + (expense.vatInput ?? 0)) as Centavos;
}

export const EXPENSE_ACTIONS: Record<ExpenseStatus, string[]> = {
  draft: ["edit", "submit", "delete"],
  submitted: ["approve", "reject", "edit"],
  approved: ["markPaid", "print"],
  paid: ["print", "viewAttachments"],
  rejected: ["edit", "resubmit"],
};
