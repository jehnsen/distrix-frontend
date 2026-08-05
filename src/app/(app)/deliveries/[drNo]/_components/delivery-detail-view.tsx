"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, PenLine, Printer, Truck } from "lucide-react";
import { toast } from "sonner";

import { dispatchDelivery, getDelivery, markDelivered } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { DELIVERY_RECEIPT_ACTIONS } from "@/types/delivery-receipt";
import { useApiQuery } from "@/hooks/use-api-query";
import { DocumentPage } from "@/components/distrix/document/document-page";
import { Figure } from "@/components/distrix/money";
import { Card, InlineBanner } from "@/components/distrix/primitives";
import { ErrorState, PanelSkeleton } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";
import { DeliveryLinesTable } from "@/app/(app)/deliveries/[drNo]/_components/delivery-lines-table";
import { AcknowledgeDialog } from "@/app/(app)/deliveries/[drNo]/_components/acknowledge-dialog";

export function DeliveryDetailView({ drNo }: { drNo: string }) {
  const router = useRouter();
  const [ackOpen, setAckOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data, error, isInitialLoading, refetch } = useApiQuery(`delivery:${drNo}`, () =>
    getDelivery(drNo),
  );

  if (error) {
    return (
      <div className="p-4">
        <Card padded={false}>
          <ErrorState
            what={`delivery receipt ${drNo}`}
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

  const { delivery, customer, order } = data;
  const allowed = DELIVERY_RECEIPT_ACTIONS[delivery.status];
  const shipped = delivery.lines.reduce((acc, line) => acc + line.qtyShipped, 0);
  const accepted = delivery.lines.reduce(
    (acc, line) => acc + (line.qtyAccepted ?? line.qtyShipped),
    0,
  );
  const shortShipped = delivery.lines.filter((line) => line.qtyShipped < line.qtyOrdered);

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
      <AcknowledgeDialog
        delivery={delivery}
        open={ackOpen}
        onOpenChange={setAckOpen}
        onDone={refetch}
      />

      <DocumentPage
        docType="Delivery receipt"
        docNo={delivery.drNo}
        status={delivery.status}
        party={{
          role: "Customer",
          code: customer.code,
          name: customer.name,
          href: `/customers/${customer.code}`,
          meta: `${customer.address.city}, ${customer.address.province}`,
        }}
        fields={[
          { label: "Delivery date", value: formatDate(delivery.deliveryDate) },
          {
            label: "Against order",
            value: (
              <Link
                href={`/orders/${delivery.soNo}`}
                className="font-mono text-ink underline-offset-2 hover:text-accent hover:underline"
              >
                {delivery.soNo}
              </Link>
            ),
          },
          { label: "Driver", value: delivery.driver },
          {
            label: "Plate no.",
            value: <span className="font-mono">{delivery.plateNo}</span>,
          },
          { label: "Drop", value: <span className="font-mono">{delivery.dropSequence}</span> },
          { label: "Shipped", value: <Figure value={shipped} weight="medium" /> },
          {
            label: "Accepted",
            value: (
              <Figure
                value={accepted}
                weight="medium"
                tone={accepted < shipped ? "variance" : "plain"}
              />
            ),
          },
          {
            label: "Received by",
            value: delivery.receivedBy ?? "—",
            ...(delivery.receivedAt
              ? { hint: formatDateTime(delivery.receivedAt) }
              : {}),
          },
        ]}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link href={`/print/delivery/${delivery.drNo}`} target="_blank">
                  <Printer size={16} strokeWidth={1.75} />
                  Print
                </Link>
              }
            />
            {allowed.includes("dispatch") && (
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  run("Delivery dispatched", () =>
                    dispatchDelivery(delivery.id, delivery.driver, delivery.plateNo),
                  )
                }
              >
                <Truck size={16} strokeWidth={1.75} />
                Dispatch
              </Button>
            )}
            {allowed.includes("markDelivered") && (
              <Button
                size="sm"
                disabled={busy}
                onClick={() => run("Marked delivered", () => markDelivered(delivery.id))}
              >
                <CheckCircle2 size={16} strokeWidth={1.75} />
                Mark delivered
              </Button>
            )}
            {allowed.includes("acknowledge") && (
              <Button size="sm" disabled={busy} onClick={() => setAckOpen(true)}>
                <PenLine size={16} strokeWidth={1.75} />
                Acknowledge
              </Button>
            )}
            {allowed.includes("invoice") && delivery.invoiceId === undefined && (
              <Button
                size="sm"
                variant="subtle"
                disabled={busy}
                onClick={() => router.push(`/invoices/new?dr=${delivery.drNo}`)}
              >
                <FileText size={16} strokeWidth={1.75} />
                Invoice
              </Button>
            )}
          </>
        }
        banner={
          delivery.invoiceId ? (
            <InlineBanner tone="paid" title="This delivery has been billed">
              Billed on the invoice linked under Related documents.
            </InlineBanner>
          ) : accepted < shipped ? (
            <InlineBanner tone="overdue" title="The customer accepted short">
              {shipped - accepted} unit(s) were refused at the gate. Only what was accepted
              will be invoiced.
            </InlineBanner>
          ) : shortShipped.length > 0 ? (
            <InlineBanner tone="partial" title={`${shortShipped.length} line(s) shipped short`}>
              The balance stays outstanding on {delivery.soNo} until another delivery covers
              it or the order is closed.
            </InlineBanner>
          ) : undefined
        }
        related={[
          ...(order
            ? [
                {
                  id: order.id,
                  docNo: order.soNo,
                  type: "Sales order",
                  status: order.status,
                  href: `/orders/${order.soNo}`,
                  date: order.orderDate,
                },
              ]
            : []),
        ]}
        activity={delivery.auditTrail.map((entry) => ({
          id: entry.id,
          actor: entry.actorName,
          action: entry.action,
          at: entry.at,
          ...(entry.detail ? { detail: entry.detail } : {}),
        }))}
      >
        <DeliveryLinesTable delivery={delivery} shipped={shipped} />
      </DocumentPage>
    </>
  );
}
