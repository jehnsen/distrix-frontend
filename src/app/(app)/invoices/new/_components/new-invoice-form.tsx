"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import { toast } from "sonner";

import {
  createInvoice,
  dueDateFor,
  getOrder,
  listDeliverableOrders,
  previewInvoice,
} from "@/lib/api";
import { TODAY_ISO } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { termsLabel } from "@/types/common";
import { useApiQuery } from "@/hooks/use-api-query";
import { TotalsPanel } from "@/components/distrix/document/totals-panel";
import { Card, InlineBanner, PageHeader } from "@/components/distrix/primitives";
import { ErrorState, PanelSkeleton } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvoiceSourcePanels } from "@/app/(app)/invoices/new/_components/invoice-source-panels";

/**
 * An invoice bills delivery receipts, not an order — which is why the receipts
 * are the thing being selected here. Anything already billed is excluded by the
 * API, so a receipt can never be invoiced twice.
 */
export function NewInvoiceForm() {
  const router = useRouter();
  const params = useSearchParams();
  const soNo = params.get("order");

  const detail = useApiQuery(`invoice-source:${soNo ?? ""}`, () =>
    soNo ? getOrder(soNo) : listDeliverableOrders().then(() => null),
  );

  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(TODAY_ISO);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The preview runs through the API so the form and the post agree on the
  // arithmetic; a component must never do its own line maths.
  const chosenKey = selected ? [...selected].sort().join(",") : "";
  const preview = useApiQuery(`preview:${soNo ?? ""}:${chosenKey}`, async () => {
    if (!soNo) return null;
    const source = await getOrder(soNo);
    const ids =
      selected ??
      new Set(
        source.deliveries
          .filter(
            (dr) =>
              dr.invoiceId === undefined &&
              (dr.status === "delivered" || dr.status === "acknowledged"),
          )
          .map((dr) => dr.id),
      );
    return previewInvoice(source.order.id, [...ids]);
  });

  if (!soNo) {
    return (
      <div className="p-4">
        <Card padded={false}>
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-lg border border-border bg-surface-sunken text-ink-muted"
            >
              <FileText size={18} strokeWidth={1.75} />
            </span>
            <div className="flex max-w-md flex-col gap-1">
              <h3 className="text-xl font-semibold tracking-heading text-ink">
                Start from a delivered order
              </h3>
              <p className="text-base text-ink-muted">
                An invoice bills the delivery receipts against one order. Open the order or
                the delivery you want to bill and use its Invoice action.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => router.push("/deliveries")}>
                Go to deliveries
              </Button>
              <Button size="sm" onClick={() => router.push("/orders?status=delivered")}>
                Delivered orders
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (detail.error) {
    return (
      <div className="p-4">
        <Card padded={false}>
          <ErrorState
            what={`order ${soNo}`}
            detail={detail.error.message}
            onRetry={detail.refetch}
          />
        </Card>
      </div>
    );
  }

  if (detail.isInitialLoading || !detail.data) {
    return (
      <div className="p-4">
        <Card>
          <PanelSkeleton lines={6} />
        </Card>
      </div>
    );
  }

  const { order, customer, deliveries } = detail.data;
  const billable = deliveries.filter(
    (dr) =>
      dr.invoiceId === undefined &&
      (dr.status === "delivered" || dr.status === "acknowledged"),
  );

  // Everything billable is selected by default; unticking is the exception.
  const chosen = selected ?? new Set(billable.map((dr) => dr.id));
  const effectiveDue = dueDate ?? dueDateFor(invoiceDate, order.terms);

  const previewLines = preview.data?.lines ?? [];

  function toggle(id: string) {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function submit() {
    if (chosen.size === 0) {
      toast.error("Choose at least one delivery receipt");
      return;
    }
    setBusy(true);
    try {
      const invoice = await createInvoice({
        customerId: customer.id,
        salesOrderId: order.id,
        drIds: [...chosen],
        invoiceDate,
        dueDate: effectiveDue,
        terms: order.terms,
      });
      toast.success(`${invoice.siNo} issued`, {
        description: `Due ${formatDate(invoice.dueDate)}.`,
      });
      router.push(`/invoices/${invoice.siNo}`);
    } catch (cause) {
      toast.error("Could not issue the invoice", {
        description: cause instanceof Error ? cause.message : "Nothing was saved.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="New invoice"
        description={`Billing ${order.soNo} for ${customer.name}.`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => router.push(`/orders/${order.soNo}`)}
            >
              Back to order
            </Button>
            <Button
              size="sm"
              disabled={busy || chosen.size === 0 || previewLines.length === 0}
              onClick={() => void submit()}
            >
              <FileText size={16} strokeWidth={1.75} />
              {busy ? "Issuing…" : "Issue invoice"}
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-4 px-4 pb-8">
        {billable.length === 0 && (
          <InlineBanner tone="partial" title="Nothing to bill on this order">
            Every delivery receipt against {order.soNo} has either been billed already or
            has not been delivered yet.
          </InlineBanner>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <InvoiceSourcePanels
            billable={billable}
            chosen={chosen}
            previewLines={previewLines}
            onToggle={toggle}
          />

          <div className="flex flex-col gap-4">
            <Card>
              <h3 className="th-label pb-3">Dates</h3>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="invoice-date">Invoice date</Label>
                  <Input
                    id="invoice-date"
                    type="date"
                    value={invoiceDate}
                    onChange={(event) => {
                      setInvoiceDate(event.target.value);
                      setDueDate(null);
                    }}
                    className="font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="due-date">Due date</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={effectiveDue}
                    min={invoiceDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-ink-muted">
                    Defaulted from {termsLabel(order.terms).toLowerCase()}.
                  </p>
                </div>
              </div>
            </Card>

            <TotalsPanel
              totals={{
                subtotal: preview.data?.subtotal ?? (0 as never),
                discount: preview.data?.discount ?? (0 as never),
                vat: preview.data?.vat ?? {
                  vatableSales: 0 as never,
                  vatExemptSales: 0 as never,
                  zeroRatedSales: 0 as never,
                  vatAmount: 0 as never,
                },
                total: preview.data?.total ?? (0 as never),
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
