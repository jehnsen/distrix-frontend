import type { Centavos } from "@/lib/money";
import type { AuditEntry, IsoDate, IsoDateTime, RecordStatus } from "@/types/common";
import type { VatType } from "@/types/tax";

export type ProductCategory =
  | "ambient_grocery"
  | "canned_goods"
  | "pasta_sauces"
  | "oils_condiments"
  | "beverages"
  | "confectionery"
  | "dairy_chilled"
  | "baking"
  | "rice_grains";

export const PRODUCT_CATEGORY_LABEL: Record<ProductCategory, string> = {
  ambient_grocery: "Ambient grocery",
  canned_goods: "Canned goods",
  pasta_sauces: "Pasta & sauces",
  oils_condiments: "Oils & condiments",
  beverages: "Beverages",
  confectionery: "Confectionery",
  dairy_chilled: "Dairy & chilled",
  baking: "Baking",
  rice_grains: "Rice & grains",
};

/** Base unit the warehouse counts in. */
export type Uom = "PCS" | "CS" | "SACK" | "BOX" | "PACK" | "BTL" | "KG";

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: ProductCategory;
  brand: string;
  uom: Uom;
  /** Selling unit above the base, e.g. CS. Absent when the SKU sells loose. */
  altUom?: Uom;
  /** Base units per altUom, e.g. 24 pieces to a case. */
  altUomConversion?: number;
  reorderPoint: number;
  vatType: VatType;
  isImported: boolean;
  /** Weighted average landed cost for imports, purchase cost for local. */
  standardCost: Centavos;
  /** Default list price; price lists override per customer. */
  listPrice: Centavos;
  /** Grams per base unit. Used by the by-weight landed cost basis. */
  weightGrams: number;
  primarySupplierId: string;
  status: RecordStatus;
  createdAt: IsoDateTime;
  createdById: string;
  createdByName: string;
  auditTrail: AuditEntry[];
}

export type StockHealth = "in_stock" | "low_stock" | "out_of_stock";

export function stockHealth(available: number, reorderPoint: number): StockHealth {
  if (available <= 0) return "out_of_stock";
  if (available <= reorderPoint) return "low_stock";
  return "in_stock";
}

/** Gross margin as a fraction of price. Negative when sold below cost. */
export function grossMarginPct(price: Centavos, cost: Centavos): number {
  if (price === 0) return 0;
  return ((price - cost) / price) * 100;
}

/**
 * What an import actually cost once freight, duty, brokerage and insurance are
 * spread over it. One row per receipt, so the history shows cost drift.
 */
export interface LandedCostHistoryEntry {
  id: string;
  productId: string;
  purchaseOrderId: string;
  poNo: string;
  receivedDate: IsoDate;
  qty: number;
  /** Supplier's price converted at the PO's FX rate. */
  baseCost: Centavos;
  /** Allocated share of freight, duty, brokerage, insurance and other. */
  allocatedCost: Centavos;
  /** (baseCost + allocatedCost) / qty, per base unit. */
  unitLandedCost: Centavos;
}
