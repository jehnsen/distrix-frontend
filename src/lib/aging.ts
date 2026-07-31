import { differenceInCalendarDays } from "date-fns";

import { sum, type Centavos } from "@/lib/money";

export type AgingBucketKey = "current" | "d1_30" | "d31_60" | "d61_90" | "d90_plus";

export interface AgingBucketMeta {
  key: AgingBucketKey;
  label: string;
  /** Inclusive lower bound of days past due; `current` is anything <= 0. */
  from: number;
  to: number | null;
  /** Tailwind classes for the rail segment, figure and bucket rule. */
  fill: string;
  text: string;
  border: string;
}

/** Order matters — the rail renders left to right in exactly this order. */
export const AGING_BUCKETS: AgingBucketMeta[] = [
  {
    key: "current",
    label: "Current",
    from: -Infinity,
    to: 0,
    fill: "bg-aging-current",
    text: "text-aging-current",
    border: "border-l-aging-current",
  },
  {
    key: "d1_30",
    label: "1–30",
    from: 1,
    to: 30,
    fill: "bg-aging-1-30",
    text: "text-aging-1-30",
    border: "border-l-aging-1-30",
  },
  {
    key: "d31_60",
    label: "31–60",
    from: 31,
    to: 60,
    fill: "bg-aging-31-60",
    text: "text-aging-31-60",
    border: "border-l-aging-31-60",
  },
  {
    key: "d61_90",
    label: "61–90",
    from: 61,
    to: 90,
    fill: "bg-aging-61-90",
    text: "text-aging-61-90",
    border: "border-l-aging-61-90",
  },
  {
    key: "d90_plus",
    label: "90+",
    from: 91,
    to: null,
    fill: "bg-aging-90-plus",
    text: "text-aging-90-plus",
    border: "border-l-aging-90-plus",
  },
];

export const AGING_BUCKET_KEYS = AGING_BUCKETS.map((b) => b.key);

export function isAgingBucketKey(value: string): value is AgingBucketKey {
  return AGING_BUCKET_KEYS.includes(value as AgingBucketKey);
}

export function agingBucketMeta(key: AgingBucketKey): AgingBucketMeta {
  const meta = AGING_BUCKETS.find((b) => b.key === key);
  if (!meta) throw new Error(`Unknown aging bucket: ${key}`);
  return meta;
}

/** Days past due. Negative means not yet due. */
export function daysPastDue(dueDate: Date | string, asOf: Date): number {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return differenceInCalendarDays(asOf, due);
}

export function bucketFor(dueDate: Date | string, asOf: Date): AgingBucketKey {
  const days = daysPastDue(dueDate, asOf);
  if (days <= 0) return "current";
  if (days <= 30) return "d1_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "d90_plus";
}

export interface AgingBucketValue {
  amount: Centavos;
  /** How many open invoices sit in this bucket. */
  count: number;
}

export type AgingSummary = Record<AgingBucketKey, AgingBucketValue>;

export function emptyAgingSummary(): AgingSummary {
  return {
    current: { amount: 0 as Centavos, count: 0 },
    d1_30: { amount: 0 as Centavos, count: 0 },
    d31_60: { amount: 0 as Centavos, count: 0 },
    d61_90: { amount: 0 as Centavos, count: 0 },
    d90_plus: { amount: 0 as Centavos, count: 0 },
  };
}

export interface AgeableInvoice {
  dueDate: Date | string;
  /** Outstanding balance, not the invoice face value. */
  balance: Centavos;
}

/** Buckets a set of open invoices as at a date. */
export function summariseAging(
  invoices: readonly AgeableInvoice[],
  asOf: Date,
): AgingSummary {
  const summary = emptyAgingSummary();
  for (const invoice of invoices) {
    if (invoice.balance === 0) continue;
    const bucket = summary[bucketFor(invoice.dueDate, asOf)];
    bucket.amount = (bucket.amount + invoice.balance) as Centavos;
    bucket.count += 1;
  }
  return summary;
}

export function agingTotal(summary: AgingSummary): Centavos {
  return sum(AGING_BUCKET_KEYS.map((key) => summary[key].amount));
}

/** Everything past due — the figure the owner actually asks about. */
export function agingOverdueTotal(summary: AgingSummary): Centavos {
  return sum(
    AGING_BUCKET_KEYS.filter((key) => key !== "current").map((key) => summary[key].amount),
  );
}
