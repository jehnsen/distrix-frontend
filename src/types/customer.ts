import type { Centavos } from "@/lib/money";
import type {
  Address,
  AuditEntry,
  Contact,
  IsoDate,
  IsoDateTime,
  PaymentTerms,
  RecordStatus,
} from "@/types/common";

/** Sari-sari consolidator, supermarket, restaurant group — drives pricing. */
export type CustomerSegment =
  | "consolidator"
  | "supermarket"
  | "restaurant"
  | "convenience"
  | "hotel"
  | "distributor";

export const CUSTOMER_SEGMENT_LABEL: Record<CustomerSegment, string> = {
  consolidator: "Sari-sari consolidator",
  supermarket: "Supermarket",
  restaurant: "Restaurant group",
  convenience: "Convenience chain",
  hotel: "Hotel & resort",
  distributor: "Sub-distributor",
};

export interface Customer {
  id: string;
  code: string;
  name: string;
  /** Unformatted 14 digits. Rendered with `formatTin`. */
  tin: string;
  segment: CustomerSegment;
  address: Address;
  contacts: Contact[];
  terms: PaymentTerms;
  creditLimit: Centavos;
  /** Sum of open invoice balances. Maintained by the mock layer on post. */
  currentBalance: Centavos;
  priceListId: string;
  salesRepId: string;
  status: RecordStatus;
  /** Null until the first order. */
  firstOrderDate: IsoDate | null;
  lastOrderDate: IsoDate | null;
  createdAt: IsoDateTime;
  createdById: string;
  createdByName: string;
  auditTrail: AuditEntry[];
}

/** Headroom is negative when the customer is over its limit. */
export function creditHeadroom(customer: Customer): Centavos {
  return (customer.creditLimit - customer.currentBalance) as Centavos;
}

export function isOverCreditLimit(customer: Customer): boolean {
  return customer.currentBalance > customer.creditLimit;
}

/** 0–1+, where >1 means over limit. Drives the utilisation bar on the list. */
export function creditUtilisation(customer: Customer): number {
  if (customer.creditLimit === 0) return customer.currentBalance > 0 ? 1 : 0;
  return customer.currentBalance / customer.creditLimit;
}

export interface PriceList {
  id: string;
  code: string;
  name: string;
  description: string;
  status: RecordStatus;
}

export interface PriceListEntry {
  priceListId: string;
  productId: string;
  unitPrice: Centavos;
  /** Volume break: this price applies from `minQty` upward. */
  minQty: number;
}
