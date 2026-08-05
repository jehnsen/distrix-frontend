"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  cancelSalesOrder,
  confirmSalesOrder,
  getOrder,
  type OrderDetail,
} from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { termsLabel } from "@/types/common";
import { useApiQuery } from "@/hooks/use-api-query";
import { DocumentPage } from "@/components/distrix/document/document-page";
import { TotalsPanel } from "@/components/distrix/document/totals-panel";
import { Money } from "@/components/distrix/money";
import { Card, InlineBanner } from "@/components/distrix/primitives";
import { ConfirmDialog } from "@/components/distrix/guards/confirm-dialog";
import { ErrorState, PanelSkeleton } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";
import { OrderActions } from "@/app/(app)/orders/[soNo]/_components/order-actions";
import { OrderLinesTable } from "@/app/(app)/orders/[soNo]/_components/order-lines-table";
import { orderTrailStages } from "@/app/(app)/orders/[soNo]/_components/order-trail";
import { DocumentTrail } from "@/components/distrix/document-trail";

export function OrderDetailView({ soNo }: { soNo: string }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data, error, isInitialLoading, refetch } = useApiQuery(`order:${soNo}`, () =>
    getOrder(soNo),
  );

  if (error) {
    return (
      <div className="p-4">
        <Card padded={false}>
          <ErrorState
            what={`order ${soNo}`}
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

  const { order, customer } = data;

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      toast.success(label);
      refetch();
    } catch (cause) {
      toast.error(`Could not ${label.toLowerCase()}`, {
        description: cause instanceof Error ? cause.message : "Nothing was changed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`Cancel ${order.soNo}?`}
        consequence="The order is released from stock reservation and the customer's credit headroom is restored. Delivery receipts already cut against it are not affected. This cannot be reversed."
        confirmLabel="Cancel order"
        requireTyped={order.soNo}
        onConfirm={() =>
          run("Order cancelled", () =>
            cancelSalesOrder(order.id, "Cancelled from the order page"),
          )
        }
      />

      <DocumentPage
        docType="Sales order"
        docNo={order.soNo}
        status={order.status}
        party={{
          role: "Customer",
          code: customer.code,
          name: customer.name,
          href: `/customers/${customer.code}`,
          meta: `${termsLabel(order.terms)} · ${data.salesRepName}`,
        }}
        fields={[
          { label: "Order date", value: formatDate(order.orderDate) },
          { label: "Required by", value: formatDate(order.requiredDate) },
          { label: "Warehouse", value: data.warehouseName },
          {
            label: "Customer ref.",
            value: order.customerRef ?? "—",
          },
          {
            label: "Credit limit",
            value: <Money amount={customer.creditLimit} symbol />,
          },
          {
            label: "Headroom",
            value: (
              <Money
                amount={data.customerHeadroom}
                symbol
                tone={data.customerHeadroom < 0 ? "variance" : "plain"}
              />
            ),
          },
          {
            label: "Fulfilled",
            value: `${order.lines.filter((line) => line.deliveredQty >= line.qty).length} of ${order.lines.length} lines`,
          },
          {
            label: "Created by",
            value: order.createdByName,
            hint: formatDate(order.createdAt),
          },
        ]}
        actions={
          <OrderActions
            order={order}
            busy={busy}
            onConfirm={() =>
              run("Order confirmed", () => confirmSalesOrder(order.id, data.customerOverLimit))
            }
            onCancel={() => setCancelOpen(true)}
          />
        }
        banner={<OrderBanner detail={data} />}
        totals={
          <TotalsPanel
            totals={{
              subtotal: order.subtotal,
              discount: order.discount,
              vat: order.vat,
              total: order.total,
            }}
          />
        }
        related={[
          ...data.deliveries.map((dr) => ({
            id: dr.id,
            docNo: dr.drNo,
            type: "Delivery receipt",
            status: dr.status,
            href: `/deliveries/${dr.drNo}`,
            date: dr.deliveryDate,
          })),
          ...data.invoices.map((invoice) => ({
            id: invoice.id,
            docNo: invoice.siNo,
            type: "Invoice",
            status: invoice.status,
            href: `/invoices/${invoice.siNo}`,
            date: invoice.invoiceDate,
          })),
        ]}
        activity={order.auditTrail.map((entry) => ({
          id: entry.id,
          actor: entry.actorName,
          action: entry.action,
          at: entry.at,
          ...(entry.detail ? { detail: entry.detail } : {}),
        }))}
        attachments={order.attachments.map((file) => ({
          id: file.id,
          name: file.name,
          sizeLabel: `${Math.round(file.size / 1024)} KB`,
          uploadedBy: file.uploadedByName,
          uploadedAt: file.uploadedAt,
        }))}
      >
        <div className="flex flex-col gap-4">
          <DocumentTrail
            stages={orderTrailStages(data)}
            currentStageKey={
              data.payments.length > 0
                ? "payments"
                : data.invoices.length > 0
                  ? "invoices"
                  : data.deliveries.length > 0
                    ? "deliveries"
                    : "order"
            }
          />
          <OrderLinesTable order={order} />
        </div>
      </DocumentPage>
    </>
  );
}

function OrderBanner({ detail }: { detail: OrderDetail }) {
  const { customer, order } = detail;

  if (detail.customerOverLimit) {
    return (
      <InlineBanner
        tone="overdue"
        title={`${customer.name} is over its credit limit`}
        action={
          <Button variant="outline" size="sm" render={
            <a href={`/customers/${customer.code}?tab=credit`}>Review credit</a>
          } />
        }
      >
        Balance {formatMoney(customer.currentBalance, { symbol: true })} against a{" "}
        {formatMoney(customer.creditLimit, { symbol: true })} limit. This order can be
        taken, but dispatch needs a manager&apos;s approval.
      </InlineBanner>
    );
  }

  if (order.creditOverrideByName) {
    return (
      <InlineBanner tone="partial" title="Credit-limit breach approved">
        {order.creditOverrideByName} approved this order over the customer&apos;s limit.
      </InlineBanner>
    );
  }

  return null;
}
