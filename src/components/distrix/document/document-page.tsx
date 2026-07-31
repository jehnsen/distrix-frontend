"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { DocNumber, Field, FieldGrid } from "@/components/distrix/primitives";
import { StatusPill, type StatusKey } from "@/components/distrix/status-pill";
import {
  DocumentSideTabs,
  type AuditEntryView,
  type DocumentAttachment,
  type RelatedDocument,
} from "@/components/distrix/document/document-side-tabs";

export interface DocumentParty {
  /** "Customer" on sales documents, "Supplier" on purchase documents. */
  role: string;
  code: string;
  name: string;
  href: string;
  /** Terms, TIN, credit headroom — whatever the clerk needs on pick. */
  meta?: string;
}

export interface DocumentField {
  label: string;
  value: React.ReactNode;
  hint?: string;
}

export interface DocumentPageProps {
  docType: string;
  docNo: string;
  status: StatusKey;
  party: DocumentParty;
  fields: DocumentField[];
  /** Status-driven — the caller decides which buttons exist for this status. */
  actions?: React.ReactNode;
  /** Persistent notices: credit-limit breach, short-ship warning, FX note. */
  banner?: React.ReactNode;
  /** The LineItemsEditor, or a read-only lines table once posted. */
  children: React.ReactNode;
  totals?: React.ReactNode;
  attachments?: DocumentAttachment[];
  related?: RelatedDocument[];
  activity?: AuditEntryView[];
  className?: string;
}

/**
 * One layout for all ten document types (§6.3). The header carries the number,
 * status and party; the toolbar's buttons come from the caller because they
 * change by status; the body is lines then totals; the rail is always the same
 * three tabs.
 */
export function DocumentPage({
  docType,
  docNo,
  status,
  party,
  fields,
  actions,
  banner,
  children,
  totals,
  attachments = [],
  related = [],
  activity = [],
  className,
}: DocumentPageProps) {
  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>
      <header className="overflow-hidden rounded-lg border border-border bg-surface shadow-raised">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-4 pt-3.5 pb-3">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="th-label">{docType}</span>
              <DocNumber value={docNo} />
              <StatusPill status={status} size="md" />
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="th-label">{party.role}</span>
              <Link
                href={party.href}
                className="rounded-sm text-xl font-semibold tracking-heading text-ink underline-offset-2 outline-none hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              >
                {party.name}
              </Link>
              <span className="font-mono text-sm text-ink-muted">{party.code}</span>
              {party.meta && (
                <span className="text-sm text-ink-muted">· {party.meta}</span>
              )}
            </div>
          </div>

          {actions && (
            <div
              data-print="hide"
              className="flex shrink-0 flex-wrap items-center gap-1.5"
            >
              {actions}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-surface-sunken/40 px-4 py-3">
          <FieldGrid columns={4}>
            {fields.map((field) => (
              <Field key={field.label} label={field.label} hint={field.hint}>
                {field.value}
              </Field>
            ))}
          </FieldGrid>
        </div>
      </header>

      {banner}

      {/* Lines get the width; the rail is fixed so it never squeezes figures. */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {children}
          {totals && (
            <div className="flex justify-end">
              <div className="w-full max-w-sm">{totals}</div>
            </div>
          )}
        </div>

        <DocumentSideTabs
          attachments={attachments}
          related={related}
          activity={activity}
          className="h-fit xl:sticky xl:top-[calc(var(--topbar-h)+1rem)]"
        />
      </div>
    </div>
  );
}
