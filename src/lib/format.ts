import { format as formatDateFns, isValid, parseISO } from "date-fns";
import { tz } from "@date-fns/tz";

import { abs, toMajor, type Centavos } from "@/lib/money";

/** The business runs in Manila. Every date the user sees is rendered in it. */
export const MANILA = "Asia/Manila";
const manila = tz(MANILA);

export const DATE_FORMAT = "dd MMM yyyy";
export const DATETIME_FORMAT = "dd MMM yyyy HH:mm";

function toDate(value: Date | string): Date | null {
  const date = typeof value === "string" ? parseISO(value) : value;
  return isValid(date) ? date : null;
}

/** `dd MMM yyyy` in Manila time. Returns an em dash for absent dates. */
export function formatDate(value: Date | string | null | undefined): string {
  if (value == null) return "—";
  const date = toDate(value);
  if (!date) return "—";
  return formatDateFns(date, DATE_FORMAT, { in: manila });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (value == null) return "—";
  const date = toDate(value);
  if (!date) return "—";
  return formatDateFns(date, DATETIME_FORMAT, { in: manila });
}

/** Machine-readable value for <time dateTime>. */
export function isoDate(value: Date | string): string {
  const date = toDate(value);
  return date ? date.toISOString() : "";
}

const groupedDecimal = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export interface MoneyFormatOptions {
  /** Render negatives as (1,234.56) rather than -1,234.56. Default true. */
  parens?: boolean;
  /** Prefix with ₱. Default false — the column header carries the unit. */
  symbol?: boolean;
  /** Always show a leading + on positives. For deltas. Default false. */
  signed?: boolean;
}

/**
 * The single money-to-string function. Components must not call
 * `toFixed`/`toLocaleString` on an amount directly.
 */
export function formatMoney(amount: Centavos, options: MoneyFormatOptions = {}): string {
  const { parens = true, symbol = false, signed = false } = options;
  const negative = amount < 0;
  const body = groupedDecimal.format(toMajor(abs(amount)));
  const prefix = symbol ? "₱" : "";

  if (negative) return parens ? `(${prefix}${body})` : `-${prefix}${body}`;
  return `${signed ? "+" : ""}${prefix}${body}`;
}

export interface QtyFormatOptions {
  /** Decimal places. Default 0 — distribution counts whole cases and pieces. */
  decimals?: number;
  uom?: string;
  signed?: boolean;
}

export function formatQty(value: number, options: QtyFormatOptions = {}): string {
  const { decimals = 0, uom, signed = false } = options;
  const negative = value < 0;
  const body = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));
  const sign = negative ? "-" : signed ? "+" : "";
  return uom ? `${sign}${body} ${uom}` : `${sign}${body}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/* -------------------------------------------------------------------------
   BIR TIN — 000-000-000-00000
   9 digits of TIN plus a 5-digit branch code. Stored unformatted.
   ------------------------------------------------------------------------- */

export const TIN_MASK = "000-000-000-00000";
const TIN_GROUPS = [3, 3, 3, 5] as const;

export function stripTin(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14);
}

/** Formats progressively, so it can drive an input's onChange directly. */
export function formatTin(value: string): string {
  const digits = stripTin(value);
  if (digits === "") return "";
  const parts: string[] = [];
  let cursor = 0;
  for (const size of TIN_GROUPS) {
    if (cursor >= digits.length) break;
    parts.push(digits.slice(cursor, cursor + size));
    cursor += size;
  }
  return parts.join("-");
}

export function isCompleteTin(value: string): boolean {
  return stripTin(value).length === 14;
}

/* ------------------------------------------------------------------------- */

/** "Jose Rizal Mercado" -> "JM". Used by the avatar and activity log. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Compact relative label for activity feeds: "2h ago", "Yesterday". */
export function relativeDay(value: Date | string, now: Date = new Date()): string {
  const date = toDate(value);
  if (!date) return "—";
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date);
}
