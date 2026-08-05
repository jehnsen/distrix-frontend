"use client";

import Link from "next/link";
import { Mail, Phone, Star } from "lucide-react";

import type { CustomerDetail } from "@/lib/api";
import { formatDate, formatTin, initials } from "@/lib/format";
import { termsLabel } from "@/types/common";
import { creditHeadroom, creditUtilisation } from "@/types/customer";
import { cn } from "@/lib/utils";
import { Money } from "@/components/distrix/money";
import { Card, CardHeader, Field, FieldGrid } from "@/components/distrix/primitives";
import { StatusPill } from "@/components/distrix/status-pill";
import { UtilisationBar } from "@/components/distrix/utilisation-bar";

/* --- Open invoices ------------------------------------------------------ */

export function OpenInvoicesPanel({ detail }: { detail: CustomerDetail }) {
  if (detail.openInvoices.length === 0) {
    return (
      <Card padded={false}>
        <CardHeader title="Open invoices" />
        <p className="px-4 py-10 text-center text-base text-ink-muted">
          Nothing outstanding — every invoice on this account is settled.
        </p>
      </Card>
    );
  }

  return (
    <Card padded={false}>
      <CardHeader
        title="Open invoices"
        description="Oldest first — this is the order a payment auto-allocates in."
      />
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-base">
          <thead>
            <tr>
              {["Invoice", "Issued", "Due", "Amount", "Paid", "Balance", "Status"].map(
                (label, index) => (
                  <th
                    key={label}
                    scope="col"
                    className={cn(
                      "th-label h-8 border-b border-border bg-surface-sunken px-3",
                      index >= 3 && index <= 5 && "text-right",
                    )}
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {detail.openInvoices.map((invoice) => {
              const balance = (invoice.amountDue -
                invoice.amountPaid -
                invoice.creditApplied) as typeof invoice.amountDue;
              return (
                <tr key={invoice.id} className="transition-colors hover:bg-surface-sunken">
                  <td className="h-row border-b border-border px-3">
                    <Link
                      href={`/invoices/${invoice.siNo}`}
                      className="font-mono font-medium text-ink underline-offset-2 hover:text-accent hover:underline"
                    >
                      {invoice.siNo}
                    </Link>
                  </td>
                  <td className="h-row border-b border-border px-3 font-mono text-ink-muted tabular-nums">
                    {formatDate(invoice.invoiceDate)}
                  </td>
                  <td className="h-row border-b border-border px-3 font-mono tabular-nums">
                    {formatDate(invoice.dueDate)}
                  </td>
                  <td className="h-row border-b border-border px-3 text-right">
                    <Money amount={invoice.amountDue} />
                  </td>
                  <td className="h-row border-b border-border px-3 text-right">
                    <Money
                      amount={(invoice.amountPaid + invoice.creditApplied) as typeof invoice.amountDue}
                      tone="muted"
                    />
                  </td>
                  <td className="h-row border-b border-border px-3 text-right">
                    <Money
                      amount={balance}
                      weight="medium"
                      tone={invoice.status === "overdue" ? "variance" : "plain"}
                    />
                  </td>
                  <td className="h-row border-b border-border px-3">
                    <StatusPill status={invoice.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* --- Contacts ----------------------------------------------------------- */

export function ContactsPanel({ detail }: { detail: CustomerDetail }) {
  const { customer } = detail;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card padded={false}>
        <CardHeader title="Contacts" description={`${customer.contacts.length} on file`} />
        <ul role="list" className="divide-y divide-border">
          {customer.contacts.map((contact) => (
            <li key={contact.id} className="flex items-start gap-3 px-4 py-3">
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-sunken text-xs font-medium text-ink-muted"
              >
                {initials(contact.name)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-base font-medium text-ink">
                  {contact.name}
                  {contact.isPrimary && (
                    <Star
                      aria-label="Primary contact"
                      size={12}
                      strokeWidth={2}
                      className="fill-partial text-partial"
                    />
                  )}
                </span>
                <span className="text-sm text-ink-muted">{contact.role}</span>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 pt-0.5">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent"
                    >
                      <Mail size={12} strokeWidth={1.75} />
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <span className="flex items-center gap-1.5 font-mono text-sm text-ink-muted">
                      <Phone size={12} strokeWidth={1.75} />
                      {contact.phone}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className="th-label pb-3">Registered details</h3>
        <FieldGrid columns={2}>
          <Field label="TIN">
            <span className="font-mono">{formatTin(customer.tin)}</span>
          </Field>
          <Field label="Account opened">{formatDate(customer.createdAt)}</Field>
          <Field label="Address" className="sm:col-span-2">
            {customer.address.line1}
            {customer.address.line2 ? `, ${customer.address.line2}` : ""}
            <br />
            {customer.address.city}, {customer.address.province}{" "}
            <span className="font-mono">{customer.address.postalCode}</span>
          </Field>
        </FieldGrid>
      </Card>
    </div>
  );
}

/* --- Credit ------------------------------------------------------------- */

export function CreditPanel({ detail }: { detail: CustomerDetail }) {
  const { customer } = detail;
  const headroom = creditHeadroom(customer);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h3 className="th-label pb-3">Credit position</h3>
        <div className="flex flex-col gap-3">
          <UtilisationBar value={creditUtilisation(customer)} className="h-6" />
          <FieldGrid columns={2}>
            <Field label="Credit limit">
              <Money amount={customer.creditLimit} symbol weight="medium" />
            </Field>
            <Field label="Current balance">
              <Money
                amount={customer.currentBalance}
                symbol
                weight="medium"
                tone={customer.currentBalance > customer.creditLimit ? "variance" : "plain"}
              />
            </Field>
            <Field
              label="Headroom"
              hint={headroom < 0 ? "Over limit — new orders need approval" : undefined}
            >
              <Money
                amount={headroom}
                symbol
                weight="medium"
                tone={headroom < 0 ? "variance" : "plain"}
              />
            </Field>
            <Field label="Terms">{termsLabel(customer.terms)}</Field>
          </FieldGrid>
        </div>
      </Card>

      <Card>
        <h3 className="th-label pb-3">Pricing</h3>
        <FieldGrid columns={2}>
          <Field label="Price list">{detail.priceList?.name ?? "—"}</Field>
          <Field label="Sales rep">{detail.salesRep?.name ?? "—"}</Field>
          <Field label="Territory">{detail.salesRep?.territory ?? "—"}</Field>
          <Field label="Segment">{customer.segment.replace(/_/g, " ")}</Field>
        </FieldGrid>
        <p className="mt-3 border-t border-border pt-3 text-sm text-ink-muted">
          {detail.priceList?.description ??
            "This account is billed at the standard list price."}
        </p>
      </Card>
    </div>
  );
}

