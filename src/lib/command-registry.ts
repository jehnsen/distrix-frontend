import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Coins,
  FileText,
  PackageSearch,
  Receipt,
  ShoppingCart,
  Truck,
  Undo2,
  UserPlus,
} from "lucide-react";

/** Verb actions — what the user came to do, not where they want to go. */
export interface CommandAction {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Extra terms the fuzzy matcher should hit, e.g. "SO" for a sales order. */
  keywords: string;
  shortcut?: readonly string[];
}

export const COMMAND_ACTIONS: CommandAction[] = [
  {
    id: "new-so",
    label: "New sales order",
    href: "/orders/new",
    icon: ShoppingCart,
    keywords: "so create sell order",
  },
  {
    id: "new-dr",
    label: "New delivery receipt",
    href: "/deliveries/new",
    icon: Truck,
    keywords: "dr dispatch ship deliver",
  },
  {
    id: "new-si",
    label: "New invoice",
    href: "/invoices/new",
    icon: FileText,
    keywords: "si bill charge sales invoice",
  },
  {
    id: "record-payment",
    label: "Record payment",
    href: "/payments/new",
    icon: Banknote,
    keywords: "pr collect receipt allocate cheque check",
  },
  {
    id: "new-return",
    label: "New sales return",
    href: "/returns/new",
    icon: Undo2,
    keywords: "sr credit note damaged rma",
  },
  {
    id: "new-po",
    label: "New purchase order",
    href: "/purchase-orders/new",
    icon: Receipt,
    keywords: "po buy import supplier",
  },
  {
    id: "receive-po",
    label: "Receive a shipment",
    href: "/receiving",
    icon: PackageSearch,
    keywords: "grn receipt arrival landed",
  },
  {
    id: "new-expense",
    label: "New expense",
    href: "/expenses/new",
    icon: Coins,
    keywords: "spend payee reimburse ewt",
  },
  {
    id: "new-customer",
    label: "New customer",
    href: "/customers/new",
    icon: UserPlus,
    keywords: "account buyer tin terms credit",
  },
];

/* -------------------------------------------------------------------------
   Document-number jump
   Typing "SO-2026-0142" should go straight there, not make the user search.
   ------------------------------------------------------------------------- */

interface DocSeries {
  prefix: string;
  label: string;
  route: string;
}

const DOC_SERIES: DocSeries[] = [
  { prefix: "SO", label: "Sales order", route: "/orders" },
  { prefix: "DR", label: "Delivery receipt", route: "/deliveries" },
  { prefix: "SI", label: "Invoice", route: "/invoices" },
  { prefix: "PR", label: "Payment", route: "/payments" },
  { prefix: "SR", label: "Sales return", route: "/returns" },
  { prefix: "CN", label: "Credit note", route: "/returns" },
  { prefix: "PO", label: "Purchase order", route: "/purchase-orders" },
  { prefix: "EX", label: "Expense", route: "/expenses" },
];

export interface DocumentJump {
  docNo: string;
  label: string;
  href: string;
}

const DOC_PATTERN = /^([A-Za-z]{2})[-\s]?(\d[\d-]*)$/;

/** Returns a jump target when the query looks like a document number. */
export function matchDocumentNumber(query: string): DocumentJump | null {
  const match = DOC_PATTERN.exec(query.trim());
  if (!match) return null;

  const [, rawPrefix, rawDigits] = match;
  if (!rawPrefix || !rawDigits) return null;

  const prefix = rawPrefix.toUpperCase();
  const series = DOC_SERIES.find((s) => s.prefix === prefix);
  if (!series) return null;

  const docNo = `${prefix}-${rawDigits}`;
  return { docNo, label: series.label, href: `${series.route}/${docNo}` };
}

/* -------------------------------------------------------------------------
   Fuzzy matching
   ------------------------------------------------------------------------- */

/**
 * Subsequence match with a bonus for contiguous runs and word starts, so
 * "sanmig" ranks "San Miguel Foods" above "Sandra's Mini Grocery".
 * Returns null when the query is not a subsequence of the target at all.
 *
 * A literal substring hit scores far above any scattered match — without that,
 * "rossi" matches "Bayfront Resorts Inc." letter by letter and outranks the
 * customer actually called Rossi.
 */
export function fuzzyScore(query: string, target: string): number | null {
  const q = query.toLowerCase().replace(/\s+/g, "");
  if (q === "") return 0;
  const t = target.toLowerCase();

  const substringAt = t.indexOf(q);
  if (substringAt !== -1) {
    const atWordStart =
      substringAt === 0 || /[\s\-/_.]/.test(t[substringAt - 1] ?? "");
    return 1000 + q.length * 10 + (atWordStart ? 50 : 0) - t.length * 0.05;
  }

  let score = 0;
  let cursor = 0;
  let streak = 0;
  let firstAt = -1;

  for (const char of q) {
    const found = t.indexOf(char, cursor);
    if (found === -1) return null;
    if (firstAt === -1) firstAt = found;

    const atWordStart = found === 0 || /[\s\-/_.]/.test(t[found - 1] ?? "");
    if (found === cursor) streak += 1;
    else streak = 0;

    score += 1 + streak * 2 + (atWordStart ? 3 : 0);
    cursor = found + 1;
  }

  // Penalise a match strung out across the whole string: the tighter the span,
  // the more the user meant it.
  const span = cursor - firstAt;
  const spread = span / q.length;
  return score - spread * 2 - t.length * 0.01;
}
