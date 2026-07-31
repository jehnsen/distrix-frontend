"use client";

import { useState } from "react";
import { Ban, FileText, Printer, Send, Truck } from "lucide-react";
import { toast } from "sonner";

import { formatDate, formatMoney } from "@/lib/format";
import { summariseLines, type LineItem } from "@/lib/line-items";
import { fromMajor, subtract, type Centavos } from "@/lib/money";
import { useFormShortcuts } from "@/hooks/use-form-shortcuts";
import { DocumentPage } from "@/components/distrix/document/document-page";
import {
  buildTotals,
  TotalsPanel,
} from "@/components/distrix/document/totals-panel";
import { LineItemsEditor } from "@/components/distrix/line-items/line-items-editor";
import { InlineBanner } from "@/components/distrix/primitives";
import { ConfirmDialog } from "@/components/distrix/guards/confirm-dialog";
import { useUnsavedChangesGuard } from "@/components/distrix/guards/unsaved-changes";
import { Button } from "@/components/ui/button";
import { DEMO_LINES, DEMO_PRODUCTS } from "@/app/(app)/kitchen-sink/_fixtures";

const CREDIT_LIMIT = fromMajor(900_000);
const CURRENT_BALANCE = fromMajor(1_204_300);

export function DocumentSection() {
  const [lines, setLines] = useState<LineItem[]>(DEMO_LINES);
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const summary = summariseLines(lines);
  const totals = buildTotals({
    vatableSales: summary.vatableSales,
    vatExemptSales: summary.vatExemptSales,
    zeroRatedSales: summary.zeroRatedSales,
    vatAmount: summary.vatAmount,
    discount: 0 as Centavos,
  });

  const { prompt } = useUnsavedChangesGuard(dirty);
  useFormShortcuts({
    onSaveDraft: () => {
      setDirty(false);
      toast.success("Draft saved", { description: "SO-2026-0142" });
    },
    onSaveAndClose: () => {
      setDirty(false);
      toast.success("Saved and closed");
    },
  });

  const headroom = subtract(CREDIT_LIMIT, CURRENT_BALANCE);

  return (
    <>
      {prompt}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Cancel this sales order?"
        consequence="The order is released from stock reservation and the customer's credit headroom is restored. Delivery receipts already cut against it are not affected. This cannot be reversed."
        confirmLabel="Cancel order"
        requireTyped="SO-2026-0142"
        onConfirm={() => {
          toast.success("SO-2026-0142 cancelled");
        }}
      />

      <div className="-mx-4 -mb-4 rounded-lg border border-border bg-canvas">
        <DocumentPage
          docType="Sales order"
          docNo="SO-2026-0142"
          status="confirmed"
          party={{
            role: "Customer",
            code: "C-0311",
            name: "Bistro Rossi Group Inc.",
            href: "/customers/C-0311",
            meta: `30-day terms · TIN 004-812-119-00000`,
          }}
          fields={[
            { label: "Order date", value: formatDate("2026-07-24") },
            { label: "Required by", value: formatDate("2026-08-02"), hint: "9 days out" },
            { label: "Warehouse", value: "Parañaque DC", hint: "PRQ" },
            { label: "Sales rep", value: "Liza Mangubat" },
            {
              label: "Credit limit",
              value: formatMoney(CREDIT_LIMIT, { symbol: true }),
            },
            {
              label: "Current balance",
              value: (
                <span className="font-mono text-overdue tabular-nums">
                  {formatMoney(CURRENT_BALANCE, { symbol: true })}
                </span>
              ),
            },
            {
              label: "Headroom",
              value: (
                <span className="font-mono text-overdue tabular-nums">
                  {formatMoney(headroom, { symbol: true })}
                </span>
              ),
              hint: "Over limit",
            },
            { label: "Fulfilment", value: "0 of 4 lines delivered" },
          ]}
          banner={
            <InlineBanner
              tone="overdue"
              title="Bistro Rossi Group is over its credit limit"
              action={
                <Button size="sm" variant="outline">
                  Request approval
                </Button>
              }
            >
              Balance {formatMoney(CURRENT_BALANCE, { symbol: true })} against a{" "}
              {formatMoney(CREDIT_LIMIT, { symbol: true })} limit, and{" "}
              {formatMoney(fromMajor(1_204_300), { symbol: true })} of it is past due. This
              order cannot be dispatched until a manager approves the breach.
            </InlineBanner>
          }
          actions={
            <>
              <Button size="sm" variant="outline">
                <Printer size={16} strokeWidth={1.75} />
                Print
              </Button>
              <Button size="sm" variant="outline">
                <FileText size={16} strokeWidth={1.75} />
                Invoice
              </Button>
              <Button
                size="sm"
                variant="destructive-outline"
                onClick={() => setConfirmOpen(true)}
              >
                <Ban size={16} strokeWidth={1.75} />
                Cancel order
              </Button>
              <Button size="sm">
                <Truck size={16} strokeWidth={1.75} />
                Create delivery
              </Button>
              <Button size="sm" variant="subtle">
                <Send size={16} strokeWidth={1.75} />
                Confirm
              </Button>
            </>
          }
          totals={<TotalsPanel totals={totals} />}
          attachments={[
            {
              id: "a1",
              name: "Rossi-PO-88214.pdf",
              sizeLabel: "412 KB",
              uploadedBy: "Liza Mangubat",
              uploadedAt: "2026-07-24T09:12:00+08:00",
            },
          ]}
          related={[
            {
              id: "r1",
              docNo: "SI-2026-1174",
              type: "Invoice",
              status: "overdue",
              href: "/invoices/SI-2026-1174",
              date: "2026-04-02",
            },
            {
              id: "r2",
              docNo: "DR-2026-0455",
              type: "Delivery receipt",
              status: "acknowledged",
              href: "/deliveries/DR-2026-0455",
              date: "2026-04-01",
            },
          ]}
          activity={[
            {
              id: "e1",
              actor: "Liza Mangubat",
              action: "confirmed the order",
              detail: "Credit breach flagged for approval",
              at: "2026-07-24T09:40:00+08:00",
            },
            {
              id: "e2",
              actor: "Liza Mangubat",
              action: "created the order",
              at: "2026-07-24T09:12:00+08:00",
            },
          ]}
        >
          <LineItemsEditor
            lines={lines}
            products={DEMO_PRODUCTS}
            onChange={(next) => {
              setLines(next);
              setDirty(true);
            }}
          />
        </DocumentPage>
      </div>
    </>
  );
}
