import type { Centavos } from "@/lib/money";
import type { DocumentBase, IsoDate } from "@/types/common";
import type { EisStatus, VatBreakdown, VatType } from "@/types/tax";

export type ReturnReason =
  | "damaged"
  | "wrong_item"
  | "expired"
  | "short_delivery"
  | "other";

export const RETURN_REASON_LABEL: Record<ReturnReason, string> = {
  damaged: "Damaged",
  wrong_item: "Wrong item",
  expired: "Expired",
  short_delivery: "Short delivery",
  other: "Other",
};

/** What happens to the goods, which decides whether stock comes back. */
export type ReturnDisposition = "restock" | "scrap" | "supplier_claim";

export const RETURN_DISPOSITION_LABEL: Record<ReturnDisposition, string> = {
  restock: "Return to stock",
  scrap: "Scrap — write off",
  supplier_claim: "Claim against supplier",
};

export type SalesReturnStatus =
  | "draft"
  | "inspecting"
  | "approved"
  | "credited"
  | "rejected";

export const SALES_RETURN_STATUSES: SalesReturnStatus[] = [
  "draft",
  "inspecting",
  "approved",
  "credited",
  "rejected",
];

export interface SalesReturnLine {
  id: string;
  productId: string;
  sku: string;
  description: string;
  /** What the customer says they are sending back. */
  qtyClaimed: number;
  /** What the warehouse counted at inspection. Set at the inspecting step. */
  qtyReceived?: number;
  /** Of what was received, how much is fit to resell. */
  qtyGood?: number;
  uom: string;
  unitPrice: Centavos;
  vatType: VatType;
  reason: ReturnReason;
  disposition: ReturnDisposition;
  /** Credit is raised on the accepted quantity, not the claimed one. */
  lineNet: Centavos;
  lineVat: Centavos;
  lineTotal: Centavos;
  inspectionNote?: string;
}

export interface SalesReturn extends DocumentBase {
  srNo: string;
  customerId: string;
  /** Absent on standalone returns taken without a reference invoice. */
  invoiceId?: string;
  siNo?: string;
  warehouseId: string;
  date: IsoDate;
  lines: SalesReturnLine[];
  subtotal: Centavos;
  vatBreakdown: VatBreakdown;
  total: Centavos;
  status: SalesReturnStatus;
  /** Issued on approval; flows to the statement as a credit. */
  creditNoteNo?: string;
  creditNoteDate?: IsoDate;
  /**
   * How much of the credit note was actually offset against the source
   * invoice. A credit larger than the invoice's remaining balance leaves the
   * difference sitting unapplied on the account rather than overpaying it, so
   * the statement must credit this figure and not `total`.
   */
  creditApplied?: Centavos;
  inspectedById?: string;
  inspectedByName?: string;
  inspectedAt?: string;
  approvedById?: string;
  approvedByName?: string;
  rejectionReason?: string;
  // EIS: credit notes are submitted to BIR e-invoicing alongside invoices.
  eis: EisStatus;
}

/** Quantity that actually goes back on the shelf. */
export function restockQty(line: SalesReturnLine): number {
  return line.disposition === "restock" ? (line.qtyGood ?? 0) : 0;
}

/** Quantity written off — scrapped or held for a supplier claim. */
export function writeOffQty(line: SalesReturnLine): number {
  const received = line.qtyReceived ?? 0;
  return line.disposition === "restock" ? received - (line.qtyGood ?? 0) : received;
}

export const SALES_RETURN_ACTIONS: Record<SalesReturnStatus, string[]> = {
  draft: ["edit", "sendToInspection", "delete"],
  inspecting: ["recordInspection", "reject"],
  approved: ["issueCreditNote", "print"],
  credited: ["print", "viewCreditNote"],
  rejected: ["print", "reopen"],
};
