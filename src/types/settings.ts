import type { Address, RecordStatus, UserRole } from "@/types/common";

/** BIR-registered details, printed on every document. */
export interface CompanyProfile {
  name: string;
  tradeName?: string;
  tin: string;
  /** RDO code the business is registered with. */
  rdoCode: string;
  /** BIR Authority to Print / Permit to Use reference. */
  birPermitNo: string;
  vatRegistered: boolean;
  address: Address;
  phone: string;
  email: string;
  website?: string;
}

export type DocumentSeriesType =
  | "sales_order"
  | "delivery_receipt"
  | "invoice"
  | "payment"
  | "sales_return"
  | "credit_note"
  | "purchase_order"
  | "goods_receipt"
  | "expense"
  | "stock_adjustment"
  | "stock_transfer"
  | "commission_run";

export const DOCUMENT_SERIES_LABEL: Record<DocumentSeriesType, string> = {
  sales_order: "Sales order",
  delivery_receipt: "Delivery receipt",
  invoice: "Sales invoice",
  payment: "Official receipt",
  sales_return: "Sales return",
  credit_note: "Credit note",
  purchase_order: "Purchase order",
  goods_receipt: "Goods receipt",
  expense: "Expense voucher",
  stock_adjustment: "Stock adjustment",
  stock_transfer: "Stock transfer",
  commission_run: "Commission run",
};

/**
 * Configurable per document type. Numbers render read-only, mono and
 * right-aligned wherever they appear.
 */
export interface DocumentSeries {
  type: DocumentSeriesType;
  prefix: string;
  /** Zero-padded width of the sequence part. */
  padding: number;
  /** Whether the year is embedded, e.g. SO-2026-0142. */
  includeYear: boolean;
  nextNumber: number;
  /** BIR-authorised range for invoice and receipt series. */
  birRangeFrom?: number;
  birRangeTo?: number;
}

export function formatDocNumber(series: DocumentSeries, sequence: number, year: number): string {
  const padded = String(sequence).padStart(series.padding, "0");
  return series.includeYear
    ? `${series.prefix}-${year}-${padded}`
    : `${series.prefix}-${padded}`;
}

/** Coarse-grained permissions; the matrix in Settings renders from these. */
export type Permission =
  | "sell.view"
  | "sell.edit"
  | "sell.approve_credit"
  | "collect.view"
  | "collect.post_payment"
  | "buy.view"
  | "buy.edit"
  | "buy.allocate_landed_cost"
  | "stock.view"
  | "stock.adjust"
  | "money.view"
  | "money.approve"
  | "settings.manage";

export const PERMISSION_LABEL: Record<Permission, string> = {
  "sell.view": "View orders, deliveries and invoices",
  "sell.edit": "Create and edit sales documents",
  "sell.approve_credit": "Approve credit-limit breaches",
  "collect.view": "View statements and aging",
  "collect.post_payment": "Record and post payments",
  "buy.view": "View purchase orders",
  "buy.edit": "Create and edit purchase orders",
  "buy.allocate_landed_cost": "Allocate landed cost",
  "stock.view": "View stock levels and movements",
  "stock.adjust": "Post adjustments and transfers",
  "money.view": "View expenses and commissions",
  "money.approve": "Approve expenses and commission runs",
  "settings.manage": "Manage company settings and users",
};

export type PermissionMatrix = Record<UserRole, Permission[]>;

export interface TaxRateSetting {
  id: string;
  name: string;
  /** Basis points. 1200 = 12%. */
  rateBp: number;
  isDefault: boolean;
  status: RecordStatus;
}

export interface ReasonCodeSetting {
  id: string;
  /** Which list this code belongs to. */
  scope: "return" | "adjustment" | "short_delivery";
  code: string;
  label: string;
  status: RecordStatus;
}
