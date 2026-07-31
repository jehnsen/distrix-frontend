import type { Centavos } from "@/lib/money";

/**
 * Philippine tax vocabulary. VAT is 12% and applies per line, which is why
 * `vatType` lives on the product and is copied onto every line that sells it.
 */
export type VatType = "vatable" | "exempt" | "zero-rated";

export const VAT_TYPES: VatType[] = ["vatable", "exempt", "zero-rated"];

export const VAT_TYPE_LABEL: Record<VatType, string> = {
  vatable: "VATable",
  exempt: "VAT-exempt",
  "zero-rated": "Zero-rated",
};

/** Short form for dense line grids. */
export const VAT_TYPE_SHORT: Record<VatType, string> = {
  vatable: "V",
  exempt: "E",
  "zero-rated": "Z",
};

/**
 * The block every invoice must print: sales split by treatment, then the VAT
 * itself. Kept as a value object so it can be stored on the document rather
 * than recomputed differently in two places.
 */
export interface VatBreakdown {
  vatableSales: Centavos;
  vatExemptSales: Centavos;
  zeroRatedSales: Centavos;
  vatAmount: Centavos;
}

export function emptyVatBreakdown(): VatBreakdown {
  return {
    vatableSales: 0 as Centavos,
    vatExemptSales: 0 as Centavos,
    zeroRatedSales: 0 as Centavos,
    vatAmount: 0 as Centavos,
  };
}

/**
 * Expanded withholding tax. Rate is basis points so the rate itself is never a
 * float: 200 = 2%, 500 = 5%, 1000 = 10%.
 */
export interface WithholdingTax {
  /** BIR ATC code, e.g. WI010 for professional fees. */
  atcCode: string;
  rateBp: number;
  amount: Centavos;
}

/** The EWT rates this business actually encounters. */
export const EWT_RATES = [
  { atcCode: "WC158", rateBp: 200, label: "Goods — 1%" },
  { atcCode: "WC160", rateBp: 200, label: "Services — 2%" },
  { atcCode: "WI010", rateBp: 500, label: "Professional fees — 5%" },
  { atcCode: "WC100", rateBp: 500, label: "Commission — 5%" },
  { atcCode: "WI100", rateBp: 1000, label: "Commission, individual — 10%" },
] as const;

export type EwtAtcCode = (typeof EWT_RATES)[number]["atcCode"];

/**
 * Where BIR e-invoicing submission status attaches once EIS is wired.
 * EIS: submission id, response code, QR payload and timestamp land here.
 */
export interface EisStatus {
  state: "not_submitted" | "queued" | "accepted" | "rejected";
  submittedAt?: string;
  referenceNo?: string;
  message?: string;
}

export function notSubmitted(): EisStatus {
  return { state: "not_submitted" };
}
