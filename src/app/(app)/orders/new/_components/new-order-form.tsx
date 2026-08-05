"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Save, Send } from "lucide-react";
import { toast } from "sonner";

import {
  createSalesOrder,
  listCustomerOptions,
  listProductOptions,
  type CustomerOption,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import { emptyLine, summariseLines, type LineItem } from "@/lib/line-items";
import { TODAY_ISO, addDaysIso } from "@/lib/dates";
import { useApiQuery } from "@/hooks/use-api-query";
import { useFormShortcuts } from "@/hooks/use-form-shortcuts";
import { TotalsPanel } from "@/components/distrix/document/totals-panel";
import { useUnsavedChangesGuard } from "@/components/distrix/guards/unsaved-changes";
import { LineItemsEditor } from "@/components/distrix/line-items/line-items-editor";
import { Card, CardHeader, PageHeader } from "@/components/distrix/primitives";
import { ErrorState, PanelSkeleton } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomerPicker } from "@/app/(app)/orders/new/_components/customer-picker";

export function NewOrderForm() {
  const router = useRouter();
  const params = useSearchParams();
  const preselected = params.get("customer");

  const customers = useApiQuery("customer-options", listCustomerOptions);
  // A customer arriving in the URL (from their record) is derived rather than
  // copied into state, so the list loading does not need an effect to apply it.
  const [picked, setPicked] = useState<CustomerOption | undefined>();
  const customer =
    picked ??
    (preselected ? customers.data?.find((row) => row.code === preselected) : undefined);
  const [orderDate, setOrderDate] = useState(TODAY_ISO);
  const [requiredDate, setRequiredDate] = useState(addDaysIso(TODAY_ISO, 7));
  const [customerRef, setCustomerRef] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  const warehouseId = customer?.defaultWarehouseId ?? "WH-PRQ";
  const products = useApiQuery(`products:${warehouseId}:${customer?.priceListId ?? ""}`, () =>
    listProductOptions(warehouseId, customer?.priceListId),
  );

  const dirty = customer !== undefined || lines.some((line) => line.productId !== null);
  const { prompt } = useUnsavedChangesGuard(dirty && !busy);

  const summary = useMemo(() => summariseLines(lines), [lines]);
  const filled = lines.filter((line) => line.productId !== null);

  async function submit(confirmAfter: boolean) {
    if (!customer) {
      setErrors({ customerId: ["Choose a customer"] });
      toast.error("Choose a customer before saving");
      return;
    }
    if (filled.length === 0) {
      setErrors({ lines: ["Add at least one line"] });
      toast.error("Add at least one line");
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      const order = await createSalesOrder({
        customerId: customer.id,
        warehouseId,
        salesRepId: customer.salesRepId,
        orderDate,
        requiredDate,
        terms: customer.terms,
        lines: filled.map((line) => ({
          id: line.id,
          productId: line.productId ?? "",
          sku: "",
          description: "",
          qty: line.qty,
          uom: line.uom,
          unitPrice: line.unitPrice,
          discountPct: line.discountPct,
          vatType: line.vatType,
        })),
        ...(customerRef ? { customerRef } : {}),
        ...(notes ? { notes } : {}),
      });

      toast.success(`${order.soNo} saved`, {
        description: confirmAfter ? "Confirm it to reserve stock." : "Saved as a draft.",
      });
      router.push(`/orders/${order.soNo}`);
    } catch (cause) {
      const issues =
        cause && typeof cause === "object" && "issues" in cause
          ? (cause.issues as Record<string, string[]>)
          : {};
      setErrors(issues);
      toast.error("Could not save the order", {
        description:
          cause instanceof Error ? cause.message : "Nothing was saved. Check the lines.",
      });
    } finally {
      setBusy(false);
    }
  }

  useFormShortcuts({
    onSaveDraft: () => void submit(false),
    onSaveAndClose: () => void submit(true),
    enabled: !busy,
  });

  if (customers.error) {
    return (
      <div className="p-4">
        <Card padded={false}>
          <ErrorState
            what="the customer list"
            detail={customers.error.message}
            onRetry={customers.refetch}
          />
        </Card>
      </div>
    );
  }

  return (
    <>
      {prompt}
      <PageHeader
        title="New sales order"
        description="Picking the customer sets terms, pricing and the serving warehouse."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => router.push("/orders")}
            >
              Discard
            </Button>
            <Button size="sm" disabled={busy} onClick={() => void submit(false)}>
              <Save size={16} strokeWidth={1.75} />
              {busy ? "Saving…" : "Save draft"}
            </Button>
            <Button
              size="sm"
              variant="subtle"
              disabled={busy || !customer || filled.length === 0}
              onClick={() => void submit(true)}
            >
              <Send size={16} strokeWidth={1.75} />
              Save &amp; confirm
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-4 px-4 pb-8">
        <Card padded={false}>
          <CardHeader title="Customer" description="Terms and credit come from the account." />
          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-1.5">
              <Label>Customer</Label>
              {customers.isInitialLoading ? (
                <PanelSkeleton lines={2} />
              ) : (
                <CustomerPicker
                  customers={customers.data ?? []}
                  value={customer}
                  onSelect={setPicked}
                  invalid={Boolean(errors["customerId"])}
                />
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="order-date">Order date</Label>
                <Input
                  id="order-date"
                  type="date"
                  value={orderDate}
                  onChange={(event) => setOrderDate(event.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="required-date">Required by</Label>
                <Input
                  id="required-date"
                  type="date"
                  value={requiredDate}
                  min={orderDate}
                  onChange={(event) => setRequiredDate(event.target.value)}
                  aria-invalid={Boolean(errors["requiredDate"]) || undefined}
                  className="font-mono"
                />
                {errors["requiredDate"] && (
                  <p className="text-xs text-overdue">{errors["requiredDate"][0]}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customer-ref">Customer&apos;s PO ref.</Label>
                <Input
                  id="customer-ref"
                  value={customerRef}
                  placeholder="Optional"
                  onChange={(event) => setCustomerRef(event.target.value)}
                />
              </div>
            </div>
          </div>
        </Card>

        {customer && (
          <>
            <LineItemsEditor
              lines={lines}
              products={products.data ?? []}
              onChange={setLines}
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
              <Card>
                <h3 className="th-label pb-2">Delivery notes</h3>
                <Input
                  value={notes}
                  placeholder="Gate 3, deliveries accepted 6am–11am only."
                  onChange={(event) => setNotes(event.target.value)}
                />
                <p className="mt-3 border-t border-border pt-3 text-sm text-ink-muted">
                  Shipping from{" "}
                  <span className="font-medium text-ink">
                    {warehouseId.replace("WH-", "")}
                  </span>{" "}
                  on {customer.terms === "COD" ? "cash on delivery" : `${customer.terms}-day`}{" "}
                  terms, required by {formatDate(requiredDate)}.
                </p>
              </Card>

              <TotalsPanel
                totals={{
                  subtotal: summary.subtotal,
                  discount: summary.discount,
                  vat: {
                    vatableSales: summary.vatableSales,
                    vatExemptSales: summary.vatExemptSales,
                    zeroRatedSales: summary.zeroRatedSales,
                    vatAmount: summary.vatAmount,
                  },
                  total: summary.total,
                }}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
