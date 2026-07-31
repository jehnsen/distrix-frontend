import { z } from "zod";

import {
  zCentavos,
  zId,
  zIsoDate,
  zLines,
  zPaymentTerms,
  zPercent,
  zPositiveCentavos,
  zPositiveQty,
  zQty,
  zVatType,
  zWithholdingTax,
} from "@/lib/schemas/common";

/** One schema per document type, shared by the form and the mock layer. */

export const salesOrderLineSchema = z.object({
  id: zId,
  productId: zId.min(1, "Choose a product"),
  sku: z.string(),
  description: z.string(),
  qty: zPositiveQty,
  uom: z.string().min(1),
  unitPrice: zPositiveCentavos,
  discountPct: zPercent,
  vatType: zVatType,
});

export const salesOrderSchema = z
  .object({
    customerId: zId.min(1, "Choose a customer"),
    warehouseId: zId.min(1, "Choose the shipping warehouse"),
    salesRepId: zId.min(1, "Assign a sales rep"),
    orderDate: zIsoDate,
    requiredDate: zIsoDate,
    terms: zPaymentTerms,
    customerRef: z.string().optional(),
    lines: zLines(salesOrderLineSchema),
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (Date.parse(value.requiredDate) < Date.parse(value.orderDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The required date cannot precede the order date",
        path: ["requiredDate"],
      });
    }
    // Two lines for the same SKU is nearly always a double-entry.
    const skus = value.lines.map((line) => line.productId);
    const duplicate = skus.find((id, index) => id !== "" && skus.indexOf(id) !== index);
    if (duplicate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The same product appears on more than one line",
        path: ["lines"],
      });
    }
  });

export type SalesOrderInput = z.infer<typeof salesOrderSchema>;

export const deliveryReceiptLineSchema = z
  .object({
    id: zId,
    salesOrderLineId: zId,
    productId: zId,
    sku: z.string(),
    description: z.string(),
    qtyOrdered: zQty,
    qtyShipped: zQty,
    uom: z.string(),
    shortReason: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.qtyShipped > value.qtyOrdered) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot ship more than the order calls for",
        path: ["qtyShipped"],
      });
    }
    // A short-ship without a reason leaves the clerk guessing next week.
    if (value.qtyShipped < value.qtyOrdered && !value.shortReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Give a reason for the short shipment",
        path: ["shortReason"],
      });
    }
  });

export const deliveryReceiptSchema = z
  .object({
    salesOrderId: zId.min(1, "Choose the order to deliver against"),
    warehouseId: zId.min(1),
    deliveryDate: zIsoDate,
    driver: z.string().min(2, "Name the driver"),
    plateNo: z
      .string()
      .regex(/^[A-Z]{3}[- ]?\d{3,4}$/i, "Plate numbers look like NCR 1234"),
    dropSequence: z.number().int().min(1),
    lines: zLines(deliveryReceiptLineSchema),
    notes: z.string().optional(),
  })
  .refine((value) => value.lines.some((line) => line.qtyShipped > 0), {
    message: "At least one line must ship something",
    path: ["lines"],
  });

export type DeliveryReceiptInput = z.infer<typeof deliveryReceiptSchema>;

export const acknowledgementSchema = z.object({
  receivedBy: z.string().min(2, "Who signed for the delivery?"),
  receivedAt: z.string(),
  signatureRef: z.string().optional(),
  lines: z.array(
    z.object({
      id: zId,
      qtyAccepted: zQty,
      shortReason: z.string().optional(),
    }),
  ),
});

export const invoiceSchema = z
  .object({
    customerId: zId.min(1),
    salesOrderId: zId.min(1),
    drIds: z.array(zId).min(1, "Invoice against at least one delivery receipt"),
    invoiceDate: zIsoDate,
    dueDate: zIsoDate,
    terms: zPaymentTerms,
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (Date.parse(value.dueDate) < Date.parse(value.invoiceDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The due date cannot precede the invoice date",
        path: ["dueDate"],
      });
    }
  });

export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const paymentAllocationSchema = z.object({
  id: zId,
  invoiceId: zId,
  siNo: z.string(),
  amount: zPositiveCentavos,
});

export const paymentSchema = z
  .object({
    customerId: zId.min(1, "Choose a customer"),
    date: zIsoDate,
    method: z.enum(["cash", "check", "bank_transfer", "online", "offset"]),
    reference: z.string().min(1, "Enter the cheque or transfer reference"),
    checkDate: zIsoDate.optional(),
    bank: z.string().optional(),
    amount: zPositiveCentavos.refine((value) => value > 0, "Enter the amount received"),
    allocations: z.array(paymentAllocationSchema),
    withholdingTax: zWithholdingTax.optional(),
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.method === "check" && !value.checkDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A cheque needs its date — post-dated cheques are not yet collected",
        path: ["checkDate"],
      });
    }
    // Over-allocation silently corrupts the statement, so it is a hard stop.
    const allocated = value.allocations.reduce((sum, a) => sum + a.amount, 0);
    const credited = value.amount + (value.withholdingTax?.amount ?? 0);
    if (allocated > credited) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Allocated more than was received",
        path: ["allocations"],
      });
    }
  });

export type PaymentInput = z.infer<typeof paymentSchema>;

export const salesReturnLineSchema = z.object({
  id: zId,
  productId: zId.min(1, "Choose a product"),
  sku: z.string(),
  description: z.string(),
  qtyClaimed: zPositiveQty,
  uom: z.string(),
  unitPrice: zPositiveCentavos,
  vatType: zVatType,
  reason: z.enum(["damaged", "wrong_item", "expired", "short_delivery", "other"]),
  disposition: z.enum(["restock", "scrap", "supplier_claim"]),
});

export const salesReturnSchema = z.object({
  customerId: zId.min(1, "Choose a customer"),
  invoiceId: zId.optional(),
  warehouseId: zId.min(1, "Which warehouse receives the goods?"),
  date: zIsoDate,
  lines: zLines(salesReturnLineSchema),
  notes: z.string().optional(),
});

export type SalesReturnInput = z.infer<typeof salesReturnSchema>;

/** The warehouse step: what actually came back and what is fit to resell. */
export const returnInspectionSchema = z.object({
  lines: z.array(
    z
      .object({
        id: zId,
        qtyClaimed: zQty,
        qtyReceived: zQty,
        qtyGood: zQty,
        inspectionNote: z.string().optional(),
      })
      .superRefine((value, ctx) => {
        if (value.qtyGood > value.qtyReceived) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Cannot pass more than was received",
            path: ["qtyGood"],
          });
        }
        if (value.qtyReceived !== value.qtyClaimed && !value.inspectionNote) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Note why the count differs from the claim",
            path: ["inspectionNote"],
          });
        }
      }),
  ),
});

/** Voiding, cancelling and other destructive posts. */
export const destructivePostSchema = z.object({
  docNo: z.string(),
  typed: z.string(),
  reason: z.string().min(8, "State why — this goes on the audit trail"),
});

export const creditNoteSchema = z.object({
  salesReturnId: zId,
  creditNoteDate: zIsoDate,
  amount: zCentavos,
});
