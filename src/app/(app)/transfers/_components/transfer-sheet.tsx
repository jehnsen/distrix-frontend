"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getTransfer } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApiQuery } from "@/hooks/use-api-query";
import { Figure } from "@/components/distrix/money";
import { Field, FieldGrid, InlineBanner } from "@/components/distrix/primitives";
import { StatusPill } from "@/components/distrix/status-pill";
import { ErrorState, PanelSkeleton } from "@/components/distrix/states";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const TH = "th-label h-8 border-b border-border bg-surface-sunken px-3";
const TD = "h-row border-b border-border px-3";

export function TransferSheet({
  trNo,
  onClose,
}: {
  trNo: string | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={trNo !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[min(48rem,100vw)] gap-0 p-0">
        {trNo && <TransferBody trNo={trNo} />}
      </SheetContent>
    </Sheet>
  );
}

function TransferBody({ trNo }: { trNo: string }) {
  const { data, error, isInitialLoading, refetch } = useApiQuery(`transfer:${trNo}`, () =>
    getTransfer(trNo),
  );

  if (error) {
    return (
      <>
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="font-mono">{trNo}</SheetTitle>
        </SheetHeader>
        <ErrorState what={`transfer ${trNo}`} detail={error.message} onRetry={refetch} />
      </>
    );
  }

  if (isInitialLoading || !data) {
    return (
      <>
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="font-mono">{trNo}</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <PanelSkeleton lines={8} />
        </div>
      </>
    );
  }

  const { transfer, from, to } = data;
  const products = new Map(data.products);
  const qtySent = transfer.lines.reduce((acc, line) => acc + line.qtySent, 0);
  const qtyReceived = transfer.lines.reduce((acc, line) => acc + line.qtyReceived, 0);
  const shortLines = transfer.lines.filter(
    (line) => transfer.status === "received" && line.qtyReceived < line.qtySent,
  );

  return (
    <>
      <SheetHeader className="border-b border-border px-4 py-3">
        <SheetTitle className="flex items-center gap-2.5">
          <span className="font-mono">{transfer.trNo}</span>
          <StatusPill status={transfer.status} size="md" />
        </SheetTitle>
        <SheetDescription className="flex items-center gap-1.5">
          <span className="font-mono">{from.code}</span>
          <ArrowRight aria-hidden size={13} strokeWidth={2} />
          <span className="font-mono">{to.code}</span>
          <span>· dispatched {formatDate(transfer.dispatchDate)}</span>
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto">
        {shortLines.length > 0 && (
          <div className="px-4 pt-3">
            <InlineBanner
              tone="overdue"
              title={`${shortLines.length} line(s) arrived short`}
            >
              {qtySent - qtyReceived} units did not make it to {to.name}. Raise an
              adjustment at the receiving end once the shortfall is confirmed.
            </InlineBanner>
          </div>
        )}

        <div className="border-b border-border px-4 py-3">
          <FieldGrid columns={3}>
            <Field label="From" hint={from.address.city}>
              {from.name}
            </Field>
            <Field label="To" hint={to.address.city}>
              {to.name}
            </Field>
            <Field label="Expected">{formatDate(transfer.expectedDate)}</Field>
            <Field label="Sent">
              <Figure value={qtySent} weight="medium" />
            </Field>
            <Field label="Received">
              <Figure
                value={qtyReceived}
                weight="medium"
                tone={qtyReceived < qtySent && transfer.status === "received" ? "variance" : "plain"}
              />
            </Field>
            {transfer.receivedDate && (
              <Field label="Received on">{formatDate(transfer.receivedDate)}</Field>
            )}
          </FieldGrid>
        </div>

        <table className="w-full border-separate border-spacing-0 text-base">
          <thead>
            <tr>
              {["SKU", "Product", "Sent", "Received", "Variance"].map((label, index) => (
                <th key={label} scope="col" className={cn(TH, index >= 2 && "text-right")}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transfer.lines.map((line) => {
              const product = products.get(line.productId);
              const variance = line.qtyReceived - line.qtySent;
              const pending = transfer.status === "in_transit";
              return (
                <tr key={line.id} className="transition-colors hover:bg-surface-sunken">
                  <td className={TD}>
                    {product ? (
                      <Link
                        href={`/products/${product.sku}`}
                        className="font-mono font-medium text-ink underline-offset-2 hover:text-accent hover:underline"
                      >
                        {product.sku}
                      </Link>
                    ) : (
                      <span className="font-mono text-ink-muted">—</span>
                    )}
                  </td>
                  <td className={cn(TD, "max-w-56 truncate")}>{product?.name ?? "—"}</td>
                  <td className={cn(TD, "text-right")}>
                    <Figure value={line.qtySent} />
                  </td>
                  <td className={cn(TD, "text-right")}>
                    {pending ? (
                      <span className="font-mono text-ink-muted">—</span>
                    ) : (
                      <Figure value={line.qtyReceived} />
                    )}
                  </td>
                  <td className={cn(TD, "text-right")}>
                    {pending || variance === 0 ? (
                      <span className="font-mono text-ink-muted">—</span>
                    ) : (
                      <Figure value={variance} signed weight="medium" tone="variance" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
