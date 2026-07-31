import { z } from "zod";

import { stripTin } from "@/lib/format";
import { PAYMENT_TERMS } from "@/types/common";

/**
 * Shared Zod primitives. Every document schema builds on these, so a rule like
 * "money is an integer number of centavos" is stated once.
 */

/** Money. Integer centavos — never a float, never a formatted string. */
export const zCentavos = z
  .number({ message: "Enter an amount" })
  .int("Amounts are held in centavos and must be whole")
  .finite();

export const zPositiveCentavos = zCentavos.nonnegative("Cannot be negative");

export const zQty = z
  .number({ message: "Enter a quantity" })
  .finite()
  .nonnegative("Quantity cannot be negative");

export const zPositiveQty = zQty.positive("Quantity must be more than zero");

/** Whole percent as typed, e.g. 7.5 for 7.5%. */
export const zPercent = z
  .number()
  .min(0, "Cannot be negative")
  .max(100, "Cannot exceed 100%");

/** Basis points: 1200 = 12%. Integer so the rate is never a float. */
export const zBasisPoints = z.number().int().min(0).max(10_000);

export const zIsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Use a valid date");

export const zIsoDateTime = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Use a valid date and time");

export const zId = z.string().min(1, "Required");

/**
 * BIR TIN: 9 digits plus a 5-digit branch code. Accepts the masked form and
 * normalises to bare digits, so the field and the record never disagree.
 */
export const zTin = z
  .string()
  .transform(stripTin)
  .refine((digits) => digits.length === 14, {
    message: "A TIN is 9 digits plus a 5-digit branch code",
  });

export const zOptionalTin = z
  .string()
  .transform(stripTin)
  .refine((digits) => digits.length === 0 || digits.length === 14, {
    message: "A TIN is 9 digits plus a 5-digit branch code",
  })
  .optional();

export const zPaymentTerms = z.enum(
  PAYMENT_TERMS as [string, ...string[]],
  { message: "Choose payment terms" },
);

export const zCurrency = z.enum(["PHP", "USD", "CNY", "THB", "MYR"]);

export const zRecordStatus = z.enum(["active", "inactive", "on_hold"]);

export const zVatType = z.enum(["vatable", "exempt", "zero-rated"]);

export const zAddress = z.object({
  line1: z.string().min(1, "Street address is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
  postalCode: z.string().regex(/^\d{4}$/, "PSA postal codes are 4 digits"),
  country: z.string().min(1),
});

export const zContact = z.object({
  id: zId,
  name: z.string().min(1, "Contact name is required"),
  role: z.string().min(1, "Role is required"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  isPrimary: z.boolean(),
});

export const zVatBreakdown = z.object({
  vatableSales: zCentavos,
  vatExemptSales: zCentavos,
  zeroRatedSales: zCentavos,
  vatAmount: zCentavos,
});

export const zWithholdingTax = z.object({
  atcCode: z.string().min(1, "Choose an ATC code"),
  rateBp: zBasisPoints,
  amount: zCentavos,
});

/** At least one contact, exactly one of them primary. */
export const zContactList = z
  .array(zContact)
  .min(1, "Add at least one contact")
  .refine(
    (contacts) => contacts.filter((contact) => contact.isPrimary).length === 1,
    { message: "Mark exactly one contact as primary" },
  );

/** A document must have lines; an empty order is a mistake, not a draft. */
export function zLines<T extends z.ZodTypeAny>(line: T) {
  return z.array(line).min(1, "Add at least one line");
}

/** `to` must not precede `from`. Attach to any object with both fields. */
export function refineDateOrder<T extends { [K in F | U]: string }, F extends string, U extends string>(
  from: F,
  to: U,
  message: string,
) {
  return (value: T, ctx: z.RefinementCtx): void => {
    if (Date.parse(value[to]) < Date.parse(value[from])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [to] });
    }
  };
}
