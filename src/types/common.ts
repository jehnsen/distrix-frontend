/**
 * Shared vocabulary for every entity. Dates are ISO-8601 strings rather than
 * Date objects so records stay serialisable and comparable; rendering goes
 * through `formatDate` in `src/lib/format.ts`, which applies Asia/Manila.
 */

/** ISO-8601 date, `2026-07-24`. */
export type IsoDate = string;
/** ISO-8601 instant with offset, `2026-07-24T09:12:00+08:00`. */
export type IsoDateTime = string;

export type RecordStatus = "active" | "inactive" | "on_hold";

/** Distributor terms. `COD` is settled on delivery; the rest are days net. */
export type PaymentTerms = "COD" | "7" | "15" | "30" | "45" | "60";

export const PAYMENT_TERMS: PaymentTerms[] = ["COD", "7", "15", "30", "45", "60"];

export function termsDays(terms: PaymentTerms): number {
  return terms === "COD" ? 0 : Number(terms);
}

export function termsLabel(terms: PaymentTerms): string {
  return terms === "COD" ? "Cash on delivery" : `${terms} days`;
}

/** PHP for everything except international purchasing. */
export type CurrencyCode = "PHP" | "USD" | "CNY" | "THB" | "MYR";

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
}

/** What happened to a document, who did it and when. Never edited, only added. */
export interface AuditEntry {
  id: string;
  at: IsoDateTime;
  actorId: string;
  actorName: string;
  /** Past tense, reads as a sentence after the actor's name. */
  action: string;
  detail?: string;
}

export interface Attachment {
  id: string;
  name: string;
  /** Bytes. Rendered by the UI, never used for arithmetic. */
  size: number;
  mimeType: string;
  uploadedAt: IsoDateTime;
  uploadedById: string;
  uploadedByName: string;
}

/**
 * Every document in §4 carries these. Master records (customers, products)
 * carry `createdAt`/`createdBy` but not the document lifecycle.
 */
export interface DocumentBase {
  id: string;
  createdAt: IsoDateTime;
  createdById: string;
  createdByName: string;
  updatedAt: IsoDateTime;
  auditTrail: AuditEntry[];
  attachments: Attachment[];
  notes?: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: RecordStatus;
}

export type UserRole =
  | "owner"
  | "sales_admin"
  | "sales_rep"
  | "warehouse"
  | "accounting"
  | "purchasing";

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  sales_admin: "Sales Admin",
  sales_rep: "Sales Rep",
  warehouse: "Warehouse",
  accounting: "Accounting",
  purchasing: "Purchasing",
};

export interface SalesRep {
  id: string;
  code: string;
  name: string;
  email: string;
  /** Territory shown on the commission run and the rep-facing summary. */
  territory: string;
  status: RecordStatus;
}

/** Shape every list endpoint returns, so swapping in a real API changes nothing. */
export interface Page<T> {
  rows: T[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface PageRequest {
  pageIndex?: number;
  pageSize?: number;
  /** Column id; prefix with `-` for descending, e.g. `-dueDate`. */
  sort?: string;
}
