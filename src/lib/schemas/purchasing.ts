import { z } from "zod";

import {
  zBasisPoints,
  zCentavos,
  zCurrency,
  zId,
  zIsoDate,
  zLines,
  zPositiveCentavos,
  zPositiveQty,
  zQty,
  zWithholdingTax,
} from "@/lib/schemas/common";

export const purchaseOrderLineSchema = z.object({
  id: zId,
  productId: zId.min(1, "Choose a product"),
  sku: z.string(),
  description: z.string(),
  qty: zPositiveQty,
  uom: z.string().min(1),
  unitPrice: zPositiveCentavos,
});

export const landedCostSchema = z.object({
  id: zId,
  type: z.enum(["freight", "duty", "brokerage", "insurance", "other"]),
  description: z.string().min(1, "Describe the charge"),
  amount: zPositiveCentavos,
  basis: z.enum(["value", "qty", "weight"]),
});

/**
 * Local and international POs share this schema; the superRefine is where the
 * two flows diverge. FX rate, incoterms and ETD/ETA are meaningless on a local
 * PO and mandatory on an international one.
 */
export const purchaseOrderSchema = z
  .object({
    supplierId: zId.min(1, "Choose a supplier"),
    type: z.enum(["local", "international"]),
    warehouseId: zId.min(1, "Which warehouse receives this?"),
    currency: zCurrency,
    fxRate: z.number().positive("FX rate must be greater than zero"),
    incoterms: z.enum(["EXW", "FOB", "CIF", "CFR", "DDP", "FCA"]).optional(),
    orderDate: zIsoDate,
    etd: zIsoDate.optional(),
    eta: zIsoDate.optional(),
    lines: zLines(purchaseOrderLineSchema),
    landedCosts: z.array(landedCostSchema),
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "international") {
      if (!value.incoterms) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Incoterms are required on an import",
          path: ["incoterms"],
        });
      }
      if (!value.etd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Give an estimated departure date",
          path: ["etd"],
        });
      }
      if (!value.eta) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Give an estimated arrival date",
          path: ["eta"],
        });
      }
      if (value.etd && value.eta && Date.parse(value.eta) < Date.parse(value.etd)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Arrival cannot precede departure",
          path: ["eta"],
        });
      }
      if (value.currency === "PHP") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "An import priced in PHP should be a local purchase order",
          path: ["currency"],
        });
      }
    } else {
      if (value.currency !== "PHP") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Local purchase orders are priced in PHP",
          path: ["currency"],
        });
      }
      if (value.fxRate !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A local purchase order has an FX rate of exactly 1",
          path: ["fxRate"],
        });
      }
    }
  });

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

export const goodsReceiptLineSchema = z
  .object({
    id: zId,
    purchaseOrderLineId: zId,
    productId: zId,
    sku: z.string(),
    qtyExpected: zQty,
    qtyReceived: zQty,
    varianceNote: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    // Over and short receipts are both allowed, but both must be explained.
    if (value.qtyReceived !== value.qtyExpected && !value.varianceNote) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          value.qtyReceived > value.qtyExpected
            ? "Note why more arrived than was ordered"
            : "Note why the receipt is short",
        path: ["varianceNote"],
      });
    }
  });

export const goodsReceiptSchema = z.object({
  purchaseOrderId: zId,
  warehouseId: zId.min(1),
  receivedDate: zIsoDate,
  lines: zLines(goodsReceiptLineSchema),
});

export type GoodsReceiptInput = z.infer<typeof goodsReceiptSchema>;

/** Allocation is posted separately from the PO, once the charges are known. */
export const landedCostAllocationSchema = z.object({
  purchaseOrderId: zId,
  basis: z.enum(["value", "qty", "weight"]),
  costs: z.array(landedCostSchema).min(1, "Add at least one charge to allocate"),
});

export const expenseSchema = z
  .object({
    date: zIsoDate,
    category: z.enum([
      "fuel_transport",
      "warehouse_rent",
      "utilities",
      "salaries_wages",
      "repairs_maintenance",
      "brokerage_fees",
      "office_supplies",
      "professional_fees",
      "marketing",
      "permits_licenses",
      "representation",
      "other",
    ]),
    payee: z.string().min(2, "Who was paid?"),
    payeeTin: z.string().optional(),
    amount: zPositiveCentavos.refine((value) => value > 0, "Enter the amount"),
    vatInput: zCentavos.optional(),
    ewt: zWithholdingTax.optional(),
    paymentMethod: z.enum([
      "cash",
      "check",
      "bank_transfer",
      "petty_cash",
      "company_card",
    ]),
    purchaseOrderId: zId.optional(),
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    // Input VAT cannot be claimed without the payee's TIN on the receipt.
    if (value.vatInput && value.vatInput > 0 && !value.payeeTin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Input VAT needs the payee's TIN to be claimable",
        path: ["payeeTin"],
      });
    }
  });

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const commissionTierSchema = z.object({
  id: zId,
  threshold: zPositiveCentavos,
  rateBp: zBasisPoints,
});

export const commissionRuleSchema = z
  .object({
    salesRepId: zId.min(1, "Choose a sales rep"),
    basis: z.enum(["invoiced", "collected"]),
    tiers: z.array(commissionTierSchema).min(1, "Add at least one tier"),
    productOverrides: z.array(
      z.object({ id: zId, productId: zId, sku: z.string(), rateBp: zBasisPoints }),
    ),
    ewtRateBp: zBasisPoints,
    ewtAtcCode: z.string().min(1, "Choose an ATC code"),
    effectiveFrom: zIsoDate,
  })
  .superRefine((value, ctx) => {
    const thresholds = value.tiers.map((tier) => tier.threshold);
    if (new Set(thresholds).size !== thresholds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Two tiers share the same threshold",
        path: ["tiers"],
      });
    }
    // A rule with no zero-threshold tier pays nothing on the first peso.
    if (!thresholds.includes(0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The first tier must start at zero",
        path: ["tiers"],
      });
    }
  });

export type CommissionRuleInput = z.infer<typeof commissionRuleSchema>;

export const commissionRunSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Period looks like 2026-07"),
  salesRepId: zId,
});
