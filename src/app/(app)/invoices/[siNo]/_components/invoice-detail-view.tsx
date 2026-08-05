"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, Mail, Printer, Undo2 } from "lucide-react";

import { getInvoice } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { termsLabel } from "@/types/common";
import { daysOverdue, INVOICE_ACTIONS, invoiceBalance } from "@/types/invoice";
import { isoToday } from "@/lib/dates";
import { useApiQuery } from "@/hooks/use-api-query";
import { DocumentPage } from "@/components/distrix/document/document-page";
import { TotalsPanel } from "@/components/distrix/document/totals-panel";
import { Money } from "@/components/distrix/money";
import { Card, InlineBanner } from "@/components/distrix/primitives";
import { ErrorState, PanelSkeleton } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";
import { InvoiceLinesTable } from "@/app/(app)/invoices/[siNo]/_components/invoice-lines-table";

export function InvoiceDetailView({ siNo }: { siNo: string }) {
  const router = useRouter();
  const { data, error, isInitialLoading, refetch } = useApiQuery(`invoice:${siNo}`, () =>
    getInvoice(siNo),
  );

  if (error) {
    return (
      <div className="p-4">
        <Card padded={false}>
          <ErrorState
            what={`invoice ${siNo}`}
            detail={error.message}
            onRetry={error.status === 404 ? undefined : refetch}
          />
        </Card>
      </div>
    );
  }

  if (isInitialLoading || !data) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Card>
          <PanelSkeleton lines={4} />
        </Card>
        <Card>
          <PanelSkeleton lines={8} />
        </Card>
      </div>
    );
  }

  const { invoice, customer, payments, credits } = data;
  const balance = invoiceBalance(invoice);
  const overdueDays = daysOverdue(invoice, isoToday());
  const allowed = INVOICE_ACTIONS[invoice.status];

  return (
    <DocumentPage
      docType="Sales invoice"
      docNo={invoice.siNo}
      status={invoice.status}
      party={{
        role: "Customer",
        code: customer.code,
        name: customer.name,
        href: `/customers/${customer.code}`,
        meta: termsLabel(invoice.terms),
      }}
      fields={[
        { label: "Invoice date", value: formatDate(invoice.invoiceDate) },
        {
          label: "Due date",
          value: (
            <span className={overdueDays > 0 && balance > 0 ? "text-overdue" : undefined}>
              {formatDate(invoice.dueDate)}
            </span>
          ),
          ...(balance > 0 && overdueDays > 0 ? { hint: `${overdueDays} days overdue` } : {}),
        },
        {
          label: "Against order",
          value: (
            <Link
              href={`/orders/${invoice.soNo}`}
              className="font-mono text-ink underline-offset-2 hover:text-accent hover:underline"
            >
              {invoice.soNo}
            </Link>
          ),
        },
        {
          label: "Delivery receipts",
          value: (
            <span className="flex flex-wrap gap-x-2">
              {invoice.drNos.map((drNo) => (
                <Link
                  key={drNo}
                  href={`/deliveries/${drNo}`}
                  className="font-mono text-ink underline-offset-2 hover:text-accent hover:underline"
                >
                  {drNo}
                </Link>
              ))}
            </span>
          ),
        },
        { label: "Amount due", value: <Money amount={invoice.amountDue} symbol /> },
        {
          label: "Settled",
          value: (
            <Money
              amount={(invoice.amountPaid + invoice.creditApplied) as typeof invoice.amountDue}
              symbol
              tone="muted"
            />
          ),
        },
        {
          label: "Balance",
          value: (
            <Money
              amount={balance}
              symbol
              weight="medium"
              tone={invoice.status === "overdue" ? "variance" : "plain"}
            />
          ),
        },
        {
          // EIS: BIR e-invoicing submission state surfaces here once wired.
          label: "BIR e-invoicing",
          value: <span className="text-ink-muted">Not submitted</span>,
          hint: "EIS hook point",
        },
      ]}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/print/invoice/${invoice.siNo}`} target="_blank">
                <Printer size={16} strokeWidth={1.75} />
                Print
              </Link>
            }
          />
          {allowed.includes("email") && (
            <Button variant="outline" size="sm">
              <Mail size={16} strokeWidth={1.75} />
              Email
            </Button>
          )}
          {allowed.includes("creditNote") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/returns/new?invoice=${invoice.siNo}`)}
            >
              <Undo2 size={16} strokeWidth={1.75} />
              Credit note
            </Button>
          )}
          {allowed.includes("recordPayment") && (
            <Button
              size="sm"
              onClick={() => router.push(`/payments/new?customer=${customer.code}`)}
            >
              <Banknote size={16} strokeWidth={1.75} />
              Record payment
            </Button>
          )}
        </>
      }
      banner={
        invoice.status === "overdue" ? (
          <InlineBanner
            tone="overdue"
            title={`${overdueDays} days overdue`}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/payments/new?customer=${customer.code}`)}
              >
                Record payment
              </Button>
            }
          >
            The customer&apos;s terms were {termsLabel(invoice.terms).toLowerCase()} from{" "}
            {formatDate(invoice.invoiceDate)}.
          </InlineBanner>
        ) : invoice.creditApplied > 0 ? (
          <InlineBanner tone="info" title="A credit note has been applied">
            Part of this invoice was settled by a credit note rather than by payment.
          </InlineBanner>
        ) : undefined
      }
      totals={
        <TotalsPanel
          totals={{
            subtotal: invoice.subtotal,
            discount: invoice.discount,
            vat: invoice.vatBreakdown,
            total: invoice.amountDue,
            amountPaid: (invoice.amountPaid + invoice.creditApplied) as typeof invoice.amountDue,
          }}
        />
      }
      related={[
        ...payments.map((payment) => ({
          id: payment.id,
          docNo: payment.prNo,
          type: "Payment",
          status: payment.status,
          href: `/payments/${payment.prNo}`,
          date: payment.date,
        })),
        ...credits.map((credit) => ({
          id: credit.id,
          docNo: credit.creditNoteNo ?? credit.srNo,
          type: "Credit note",
          status: credit.status,
          href: `/returns/${credit.srNo}`,
          date: credit.creditNoteDate ?? credit.date,
        })),
      ]}
      activity={invoice.auditTrail.map((entry) => ({
        id: entry.id,
        actor: entry.actorName,
        action: entry.action,
        at: entry.at,
        ...(entry.detail ? { detail: entry.detail } : {}),
      }))}
    >
      <InvoiceLinesTable invoice={invoice} />
    </DocumentPage>
  );
}
