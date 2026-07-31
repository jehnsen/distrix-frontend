"use client";

import { cn } from "@/lib/utils";

/** Semantic tones. Nothing outside this file decides a status colour. */
export type StatusTone = "neutral" | "info" | "partial" | "paid" | "overdue" | "accent";

/**
 * Every status enum across every document type in §4, in one place.
 * Adding a document status means adding it here — there are no free-form
 * coloured spans anywhere in the app.
 */
export const STATUS_REGISTRY = {
  // Lifecycle shared by all documents
  draft: { tone: "neutral", label: "Draft" },
  cancelled: { tone: "overdue", label: "Cancelled" },
  voided: { tone: "overdue", label: "Voided" },
  posted: { tone: "paid", label: "Posted" },

  // Sales order
  confirmed: { tone: "info", label: "Confirmed" },
  partially_delivered: { tone: "partial", label: "Partly delivered" },
  delivered: { tone: "paid", label: "Delivered" },
  invoiced: { tone: "paid", label: "Invoiced" },

  // Delivery receipt
  dispatched: { tone: "info", label: "Dispatched" },
  acknowledged: { tone: "paid", label: "Acknowledged" },

  // Invoice
  open: { tone: "info", label: "Open" },
  partial: { tone: "partial", label: "Partly paid" },
  paid: { tone: "paid", label: "Paid" },
  overdue: { tone: "overdue", label: "Overdue" },

  // Sales return
  inspecting: { tone: "partial", label: "Inspecting" },
  approved: { tone: "info", label: "Approved" },
  credited: { tone: "paid", label: "Credited" },
  rejected: { tone: "overdue", label: "Rejected" },

  // Purchase order
  sent: { tone: "info", label: "Sent" },
  in_transit: { tone: "info", label: "In transit" },
  partially_received: { tone: "partial", label: "Partly received" },
  received: { tone: "paid", label: "Received" },
  closed: { tone: "paid", label: "Closed" },
  cleared: { tone: "info", label: "Cleared customs" },

  // Expense
  submitted: { tone: "partial", label: "For approval" },

  // Commission run
  for_review: { tone: "partial", label: "For review" },

  // Master records
  active: { tone: "paid", label: "Active" },
  inactive: { tone: "neutral", label: "Inactive" },
  on_hold: { tone: "partial", label: "On hold" },
  over_limit: { tone: "overdue", label: "Over credit limit" },

  // Stock
  in_stock: { tone: "paid", label: "In stock" },
  low_stock: { tone: "partial", label: "Low stock" },
  out_of_stock: { tone: "overdue", label: "Out of stock" },
} as const satisfies Record<string, { tone: StatusTone; label: string }>;

export type StatusKey = keyof typeof STATUS_REGISTRY;

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-border bg-neutral-wash text-ink-muted",
  info: "border-info/20 bg-info-wash text-info",
  partial: "border-partial/20 bg-partial-wash text-partial",
  paid: "border-paid/20 bg-paid-wash text-paid",
  overdue: "border-overdue/20 bg-overdue-wash text-overdue",
  accent: "border-accent/20 bg-accent-wash text-accent",
};

const DOT_CLASS: Record<StatusTone, string> = {
  neutral: "bg-ink-muted",
  info: "bg-info",
  partial: "bg-partial",
  paid: "bg-paid",
  overdue: "bg-overdue",
  accent: "bg-accent",
};

export function statusLabel(status: StatusKey): string {
  return STATUS_REGISTRY[status].label;
}

export function statusTone(status: StatusKey): StatusTone {
  return STATUS_REGISTRY[status].tone;
}

interface StatusPillProps {
  status: StatusKey;
  /** `md` for document page headers, `sm` everywhere else. */
  size?: "sm" | "md";
  /** Hide the leading dot when the pill sits in a dense numeric row. */
  dot?: boolean;
  className?: string;
}

export function StatusPill({
  status,
  size = "sm",
  dot = true,
  className,
}: StatusPillProps) {
  const { tone, label } = STATUS_REGISTRY[status];

  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "h-5 px-2 text-xs" : "h-6 px-2.5 text-sm",
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden
          className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASS[tone])}
        />
      )}
      {label}
    </span>
  );
}
