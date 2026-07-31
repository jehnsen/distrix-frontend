import { z } from "zod";

import {
  zAddress,
  zCentavos,
  zContactList,
  zCurrency,
  zId,
  zOptionalTin,
  zPaymentTerms,
  zPositiveCentavos,
  zQty,
  zRecordStatus,
  zTin,
  zVatType,
} from "@/lib/schemas/common";

/**
 * Master-record schemas. Each is the single source of truth for its form and
 * for the mock layer's write validation — the same object validates both.
 */

export const customerSchema = z.object({
  code: z
    .string()
    .regex(/^C-\d{4}$/, "Customer codes look like C-0104"),
  name: z.string().min(2, "Enter the registered business name"),
  tin: zTin,
  segment: z.enum([
    "consolidator",
    "supermarket",
    "restaurant",
    "convenience",
    "hotel",
    "distributor",
  ]),
  address: zAddress,
  contacts: zContactList,
  terms: zPaymentTerms,
  creditLimit: zPositiveCentavos,
  priceListId: zId,
  salesRepId: zId,
  status: zRecordStatus,
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const supplierSchema = z
  .object({
    code: z.string().regex(/^S-\d{3}$/, "Supplier codes look like S-004"),
    name: z.string().min(2, "Enter the supplier name"),
    tin: zOptionalTin,
    type: z.enum(["local", "international"]),
    currency: zCurrency,
    incoterms: z.enum(["EXW", "FOB", "CIF", "CFR", "DDP", "FCA"]).optional(),
    origin: z.string().min(1, "Enter the port or city of origin"),
    leadTimeDays: z
      .number()
      .int()
      .min(0)
      .max(365, "A lead time over a year is almost certainly a typo"),
    terms: zPaymentTerms,
    address: zAddress,
    contacts: zContactList,
    status: zRecordStatus,
  })
  .superRefine((value, ctx) => {
    if (value.type === "international") {
      if (!value.incoterms) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Incoterms are required on international suppliers",
          path: ["incoterms"],
        });
      }
      if (value.currency === "PHP") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "International suppliers bill in a foreign currency",
          path: ["currency"],
        });
      }
    } else {
      // A local supplier billing in anything but pesos means the wrong type.
      if (value.currency !== "PHP") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Local suppliers bill in PHP",
          path: ["currency"],
        });
      }
      if (!value.tin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A TIN is required to claim input VAT on local purchases",
          path: ["tin"],
        });
      }
    }
  });

export type SupplierInput = z.infer<typeof supplierSchema>;

export const productSchema = z
  .object({
    sku: z
      .string()
      .regex(
        /^(IMP|LOC|EXP)-[A-Z]{3}-[A-Z0-9]+$/,
        "SKUs look like IMP-OLV-500",
      ),
    barcode: z.string().regex(/^\d{8,14}$/, "Barcodes are 8 to 14 digits"),
    name: z.string().min(3, "Enter the full product name"),
    category: z.enum([
      "ambient_grocery",
      "canned_goods",
      "pasta_sauces",
      "oils_condiments",
      "beverages",
      "confectionery",
      "dairy_chilled",
      "baking",
      "rice_grains",
    ]),
    brand: z.string().min(1, "Brand is required"),
    uom: z.enum(["PCS", "CS", "SACK", "BOX", "PACK", "BTL", "KG"]),
    altUom: z.enum(["PCS", "CS", "SACK", "BOX", "PACK", "BTL", "KG"]).optional(),
    altUomConversion: z.number().int().positive().optional(),
    reorderPoint: zQty,
    vatType: zVatType,
    isImported: z.boolean(),
    standardCost: zPositiveCentavos,
    listPrice: zPositiveCentavos,
    weightGrams: z.number().positive("Weight drives by-weight landed cost"),
    primarySupplierId: zId,
    status: zRecordStatus,
  })
  .superRefine((value, ctx) => {
    if (value.altUom && !value.altUomConversion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "State how many base units are in one alternate unit",
        path: ["altUomConversion"],
      });
    }
    if (value.listPrice < value.standardCost) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "List price is below standard cost — this SKU sells at a loss",
        path: ["listPrice"],
      });
    }
  });

export type ProductInput = z.infer<typeof productSchema>;

export const priceListEntrySchema = z.object({
  priceListId: zId,
  productId: zId,
  unitPrice: zPositiveCentavos,
  minQty: zQty,
});

export const warehouseSchema = z.object({
  code: z.string().regex(/^[A-Z]{3}$/, "Warehouse codes are three letters"),
  name: z.string().min(2),
  address: zAddress,
  isDefault: z.boolean(),
});

export const salesRepSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2, "Enter the rep's full name"),
  email: z.string().email("Enter a valid email"),
  territory: z.string().min(1, "Assign a territory"),
  status: zRecordStatus,
});

/** Credit-limit change is audited separately, so it has its own schema. */
export const creditSettingsSchema = z.object({
  creditLimit: zPositiveCentavos,
  terms: zPaymentTerms,
  reason: z.string().min(8, "Explain why the limit is changing"),
});

export const stockAdjustmentLineSchema = z.object({
  id: zId,
  productId: zId,
  systemQty: zQty,
  countedQty: zQty,
  varianceQty: z.number().finite(),
  reason: z.enum([
    "cycle_count",
    "damage",
    "expiry",
    "pilferage",
    "found",
    "sample",
    "repack",
  ]),
  varianceValue: zCentavos,
});

export const stockAdjustmentSchema = z.object({
  warehouseId: zId,
  date: z.string(),
  lines: z.array(stockAdjustmentLineSchema).min(1, "Add at least one counted line"),
  notes: z.string().optional(),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
