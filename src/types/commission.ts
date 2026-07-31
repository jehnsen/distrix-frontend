import type { Centavos } from "@/lib/money";
import type { DocumentBase, IsoDate, RecordStatus } from "@/types/common";
import type { WithholdingTax } from "@/types/tax";

/**
 * The single most consequential setting in this module. `invoiced` pays the rep
 * when the invoice is cut; `collected` pays only once the customer has actually
 * paid. It changes payout timing entirely, so the UI must never leave it
 * ambiguous which one a rule is on.
 */
export type CommissionBasis = "invoiced" | "collected";

export const COMMISSION_BASIS_LABEL: Record<CommissionBasis, string> = {
  invoiced: "On invoiced",
  collected: "On collected",
};

export const COMMISSION_BASIS_DESCRIPTION: Record<CommissionBasis, string> = {
  invoiced: "Paid when the invoice is issued, whether or not the customer has paid.",
  collected: "Paid only on amounts the customer has actually settled.",
};

/** Rate applies to sales at or above `threshold`, up to the next tier. */
export interface CommissionTier {
  id: string;
  threshold: Centavos;
  /** Basis points: 250 = 2.5%. Never a float. */
  rateBp: number;
}

/** Overrides the tiered rate for a specific product — usually a new line. */
export interface CommissionProductOverride {
  id: string;
  productId: string;
  sku: string;
  rateBp: number;
}

export interface CommissionRule {
  id: string;
  salesRepId: string;
  basis: CommissionBasis;
  tiers: CommissionTier[];
  productOverrides: CommissionProductOverride[];
  /** Withheld from the rep's commission and remitted to the BIR. */
  ewtRateBp: number;
  ewtAtcCode: string;
  effectiveFrom: IsoDate;
  status: RecordStatus;
}

/** Which tier a given period's sales fall into. */
export function tierFor(tiers: CommissionTier[], base: Centavos): CommissionTier | undefined {
  return [...tiers]
    .sort((a, b) => b.threshold - a.threshold)
    .find((tier) => base >= tier.threshold);
}

export type CommissionRunStatus = "draft" | "for_review" | "approved" | "paid";

export const COMMISSION_RUN_STATUSES: CommissionRunStatus[] = [
  "draft",
  "for_review",
  "approved",
  "paid",
];

/**
 * One row per source document, so a rep can see exactly which invoice or
 * payment earned them what. Fully drill-downable by design.
 */
export interface CommissionLine {
  id: string;
  /** `invoice` on an invoiced-basis run, `payment` on a collected-basis run. */
  sourceType: "invoice" | "payment";
  sourceId: string;
  sourceDocNo: string;
  sourceDate: IsoDate;
  customerId: string;
  customerName: string;
  /** The amount commission is computed on: net of VAT. */
  baseAmount: Centavos;
  rateBp: number;
  /** Set when a product override rather than the tier rate applied. */
  overrideProductId?: string;
  grossCommission: Centavos;
}

export interface CommissionRun extends DocumentBase {
  runNo: string;
  /** `2026-07` — the month being paid. */
  period: string;
  periodFrom: IsoDate;
  periodTo: IsoDate;
  salesRepId: string;
  basis: CommissionBasis;
  lines: CommissionLine[];
  /** Sum of line base amounts — what the tier was chosen from. */
  totalBase: Centavos;
  grossCommission: Centavos;
  ewt: WithholdingTax;
  /** grossCommission less EWT. What the rep is actually paid. */
  netPayable: Centavos;
  status: CommissionRunStatus;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  paidDate?: IsoDate;
}

export const COMMISSION_RUN_ACTIONS: Record<CommissionRunStatus, string[]> = {
  draft: ["recalculate", "submitForReview", "delete"],
  for_review: ["approve", "reject", "recalculate", "export"],
  approved: ["markPaid", "export", "print"],
  paid: ["export", "print"],
};
