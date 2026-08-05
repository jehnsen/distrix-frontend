"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import { toast } from "sonner";

import { acknowledgeDelivery } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DeliveryReceipt } from "@/types";
import { Figure } from "@/components/distrix/money";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Acknowledgement capture (§7): who signed, and what they actually accepted at
 * the gate. Short acceptance is normal — the customer counts too — so it is
 * recorded per line rather than assumed to match what was shipped.
 *
 * Touch targets are generous because this is one of the three flows the spec
 * says must work in the field on a phone.
 */
export function AcknowledgeDialog({
  delivery,
  open,
  onOpenChange,
  onDone,
}: {
  delivery: DeliveryReceipt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(40rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Acknowledge {delivery.drNo}</DialogTitle>
          <DialogDescription>
            Record who signed and what they accepted. Anything short of what was shipped
            becomes a claim the accounting clerk will chase.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <AcknowledgeBody
            delivery={delivery}
            onOpenChange={onOpenChange}
            onDone={onDone}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AcknowledgeBody({
  delivery,
  onOpenChange,
  onDone,
}: {
  delivery: DeliveryReceipt;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [receivedBy, setReceivedBy] = useState(delivery.receivedBy ?? "");
  const [accepted, setAccepted] = useState<Record<string, number>>(
    Object.fromEntries(
      delivery.lines.map((line) => [line.id, line.qtyAccepted ?? line.qtyShipped]),
    ),
  );
  const [signed, setSigned] = useState(false);
  const [busy, setBusy] = useState(false);

  const shortfall = delivery.lines.reduce(
    (acc, line) => acc + (line.qtyShipped - (accepted[line.id] ?? line.qtyShipped)),
    0,
  );

  async function submit() {
    if (receivedBy.trim().length < 2) {
      toast.error("Who signed for the delivery?");
      return;
    }
    setBusy(true);
    try {
      await acknowledgeDelivery(delivery.id, {
        receivedBy,
        ...(signed ? { signatureRef: `sig:${delivery.drNo}` } : {}),
        lines: delivery.lines.map((line) => ({
          id: line.id,
          qtyAccepted: accepted[line.id] ?? line.qtyShipped,
        })),
      });
      toast.success(`${delivery.drNo} acknowledged`, {
        description:
          shortfall > 0 ? `${shortfall} unit(s) short of what was shipped.` : undefined,
      });
      onOpenChange(false);
      onDone();
    } catch (cause) {
      toast.error("Could not record the acknowledgement", {
        description: cause instanceof Error ? cause.message : "Nothing was saved.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="received-by">Received by</Label>
          <Input
            id="received-by"
            autoFocus
            value={receivedBy}
            placeholder="Name of the person signing"
            onChange={(event) => setReceivedBy(event.target.value)}
            className="h-11"
          />
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full border-separate border-spacing-0 text-base">
            <thead>
              <tr>
                {["Product", "Shipped", "Accepted"].map((label, index) => (
                  <th
                    key={label}
                    scope="col"
                    className={cn(
                      "th-label h-8 border-b border-border bg-surface-sunken px-3",
                      index > 0 && "text-right",
                    )}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {delivery.lines.map((line) => (
                <tr key={line.id}>
                  <td className="border-b border-border px-3 py-2">
                    <span className="flex flex-col">
                      <span className="font-mono text-sm text-ink-muted">{line.sku}</span>
                      <span className="truncate">{line.description}</span>
                    </span>
                  </td>
                  <td className="border-b border-border px-3 py-2 text-right">
                    <Figure value={line.qtyShipped} unit={line.uom} tone="muted" />
                  </td>
                  <td className="border-b border-border px-3 py-2 text-right">
                    <Input
                      numeric
                      inputMode="numeric"
                      aria-label={`Quantity accepted for ${line.sku}`}
                      value={String(accepted[line.id] ?? line.qtyShipped)}
                      onChange={(event) =>
                        setAccepted((current) => ({
                          ...current,
                          [line.id]: Math.min(
                            line.qtyShipped,
                            Math.max(0, Number(event.target.value) || 0),
                          ),
                        }))
                      }
                      className="ml-auto h-9 w-24"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {shortfall > 0 && (
          <p className="rounded-md border border-partial/25 bg-partial-wash px-3 py-2 text-base text-partial">
            {shortfall} unit(s) short of what was shipped. The invoice will bill only what
            was accepted.
          </p>
        )}

        {/* Signature placeholder — a real capture pad attaches here. */}
        <button
          type="button"
          onClick={() => setSigned((current) => !current)}
          className={cn(
            "flex h-24 items-center justify-center gap-2 rounded-md border-2 border-dashed",
            "text-base transition-colors outline-none",
            "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
            signed
              ? "border-accent/40 bg-accent-wash text-accent"
              : "border-border bg-surface-sunken/40 text-ink-muted hover:border-border-strong",
          )}
        >
          <PenLine size={18} strokeWidth={1.75} />
          {signed
            ? `Signature captured for ${receivedBy || "the recipient"}`
            : "Tap to capture the signature"}
        </button>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} disabled={busy}>
          {busy ? "Saving…" : "Record acknowledgement"}
        </Button>
      </DialogFooter>
    </>
  );
}
