"use client";

import { useRouter } from "next/navigation";
import { Pencil, Printer, ShoppingCart } from "lucide-react";

import { getCustomer } from "@/lib/api";
import { agingOverdueTotal } from "@/lib/aging";
import { formatDate, formatMoney, formatTin } from "@/lib/format";
import { termsLabel } from "@/types/common";
import { creditHeadroom, isOverCreditLimit } from "@/types/customer";
import { useApiQuery } from "@/hooks/use-api-query";
import { AgingRail } from "@/components/distrix/aging-rail";
import { Money } from "@/components/distrix/money";
import { Card, InlineBanner } from "@/components/distrix/primitives";
import { RecordPage, type RecordTab } from "@/components/distrix/record-page";
import { ErrorState, PanelSkeleton } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";
import {
  ContactsPanel,
  CreditPanel,
  OpenInvoicesPanel,
} from "@/app/(app)/customers/[code]/_components/customer-panels";
import {
  ActivityPanel,
  PurchaseSummaryPanel,
} from "@/app/(app)/customers/[code]/_components/customer-insight-panels";
import { SalesHistoryTab } from "@/app/(app)/customers/[code]/_components/sales-history-tab";

export function CustomerDetailView({ code }: { code: string }) {
  const router = useRouter();
  const { data, error, isInitialLoading, refetch } = useApiQuery(`customer:${code}`, () =>
    getCustomer(code),
  );

  if (error) {
    return (
      <div className="p-4">
        <Card padded={false}>
          <ErrorState
            what={`customer ${code}`}
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
          <PanelSkeleton lines={6} />
        </Card>
      </div>
    );
  }

  const { customer, aging } = data;
  const overdue = agingOverdueTotal(aging);
  const overLimit = isOverCreditLimit(customer);
  const headroom = creditHeadroom(customer);

  const tabs: RecordTab[] = [
    {
      value: "overview",
      label: "Overview",
      count: data.openInvoices.length,
      content: (
        <div className="flex flex-col gap-4">
          <OpenInvoicesPanel detail={data} />
          <PurchaseSummaryPanel customerId={customer.id} />
        </div>
      ),
    },
    {
      value: "history",
      label: "Sales history",
      content: <SalesHistoryTab customerId={customer.id} />,
    },
    {
      value: "contacts",
      label: "Contacts",
      count: customer.contacts.length,
      content: <ContactsPanel detail={data} />,
    },
    {
      value: "credit",
      label: "Credit & pricing",
      content: <CreditPanel detail={data} />,
    },
    {
      value: "activity",
      label: "Activity",
      content: <ActivityPanel customerId={customer.id} />,
    },
  ];

  return (
    <RecordPage
      recordType="Customer"
      code={customer.code}
      name={customer.name}
      status={
        overLimit
          ? "over_limit"
          : customer.status === "on_hold"
            ? "on_hold"
            : customer.status === "inactive"
              ? "inactive"
              : "active"
      }
      fields={[
        { label: "TIN", value: <span className="font-mono">{formatTin(customer.tin)}</span> },
        { label: "Terms", value: termsLabel(customer.terms) },
        { label: "Sales rep", value: data.salesRep?.name ?? "—" },
        { label: "Price list", value: data.priceList?.name ?? "—" },
        {
          label: "Credit limit",
          value: <Money amount={customer.creditLimit} symbol />,
        },
        {
          label: "Balance",
          value: (
            <Money
              amount={customer.currentBalance}
              symbol
              tone={overLimit ? "variance" : "plain"}
            />
          ),
        },
        {
          label: "Headroom",
          value: <Money amount={headroom} symbol tone={headroom < 0 ? "variance" : "plain"} />,
        },
        {
          label: "Last order",
          value: formatDate(customer.lastOrderDate),
          hint: customer.firstOrderDate
            ? `Customer since ${formatDate(customer.firstOrderDate)}`
            : "No orders yet",
        },
      ]}
      actions={
        <>
          <Button variant="outline" size="sm">
            <Printer size={16} strokeWidth={1.75} />
            Statement
          </Button>
          <Button variant="outline" size="sm">
            <Pencil size={16} strokeWidth={1.75} />
            Edit
          </Button>
          <Button
            size="sm"
            onClick={() => router.push(`/orders/new?customer=${customer.code}`)}
          >
            <ShoppingCart size={16} strokeWidth={1.75} />
            New order
          </Button>
        </>
      }
      banner={
        overLimit ? (
          // Persistent and in-flow, never a toast — §7.
          <InlineBanner
            tone="overdue"
            title={`${customer.name} is over its credit limit`}
            action={
              <Button variant="outline" size="sm">
                Request approval
              </Button>
            }
          >
            Balance {formatMoney(customer.currentBalance, { symbol: true })} against a{" "}
            {formatMoney(customer.creditLimit, { symbol: true })} limit
            {overdue > 0 && (
              <>
                , with {formatMoney(overdue, { symbol: true })} already past due
              </>
            )}
            . New orders can be taken but cannot be dispatched without a manager&apos;s
            approval.
          </InlineBanner>
        ) : customer.status === "on_hold" ? (
          <InlineBanner tone="partial" title="This account is on hold">
            Orders can be drafted but not confirmed until the hold is lifted.
          </InlineBanner>
        ) : undefined
      }
      pinned={
        <AgingRail
          summary={aging}
          asOf={data.asOf}
          variant="pinned"
          title="Receivables"
          hrefFor={(bucket) => `/invoices?customerId=${customer.id}&bucket=${bucket}`}
        />
      }
      tabs={tabs}
    />
  );
}
