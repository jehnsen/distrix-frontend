import type {
  Address,
  AuditEntry,
  Contact,
  CurrencyCode,
  IsoDateTime,
  PaymentTerms,
  RecordStatus,
} from "@/types/common";

export type SupplierType = "local" | "international";

/**
 * Incoterms this business trades on. FOB and CIF dominate the China/Thailand/
 * Malaysia lanes; EXW appears on smaller consolidated shipments.
 */
export type Incoterm = "EXW" | "FOB" | "CIF" | "CFR" | "DDP" | "FCA";

export const INCOTERMS: Incoterm[] = ["EXW", "FOB", "CIF", "CFR", "DDP", "FCA"];

export const INCOTERM_LABEL: Record<Incoterm, string> = {
  EXW: "EXW — Ex Works",
  FOB: "FOB — Free on Board",
  CIF: "CIF — Cost, Insurance & Freight",
  CFR: "CFR — Cost & Freight",
  DDP: "DDP — Delivered Duty Paid",
  FCA: "FCA — Free Carrier",
};

export interface Supplier {
  id: string;
  code: string;
  name: string;
  /** Local suppliers only; foreign suppliers have no BIR TIN. */
  tin?: string;
  type: SupplierType;
  currency: CurrencyCode;
  /** International only. */
  incoterms?: Incoterm;
  /** Port of loading for international, city for local. */
  origin: string;
  /** Order to arrival. Drives the reorder report's cover calculation. */
  leadTimeDays: number;
  terms: PaymentTerms;
  address: Address;
  contacts: Contact[];
  status: RecordStatus;
  createdAt: IsoDateTime;
  createdById: string;
  createdByName: string;
  auditTrail: AuditEntry[];
}

export function isInternational(supplier: Supplier): boolean {
  return supplier.type === "international";
}
