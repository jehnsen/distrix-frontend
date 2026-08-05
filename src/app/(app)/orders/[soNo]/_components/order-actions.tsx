"use client";

import { useRouter } from "next/navigation";
import { Ban, FileText, Printer, Send, Truck } from "lucide-react";

import type { SalesOrder } from "@/types";
import { SALES_ORDER_ACTIONS } from "@/types/sales-order";
import { Button } from "@/components/ui/button";

/**
 * Which buttons exist is a function of status (§6.3) — the toolbar reads its
 * options straight off SALES_ORDER_ACTIONS rather than re-deciding them here.
 */
export function OrderActions({
  order,
  busy,
  onConfirm,
  onCancel,
}: {
  order: SalesOrder;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const allowed = SALES_ORDER_ACTIONS[order.status];

  return (
          <>
            {allowed.includes("print") && (
              <Button variant="outline" size="sm" disabled={busy}>
                <Printer size={16} strokeWidth={1.75} />
                Print
              </Button>
            )}
            {allowed.includes("cancel") && (
              <Button
                variant="destructive-outline"
                size="sm"
                disabled={busy}
                onClick={onCancel}
              >
                <Ban size={16} strokeWidth={1.75} />
                Cancel
              </Button>
            )}
            {allowed.includes("invoice") && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => router.push(`/invoices/new?order=${order.soNo}`)}
              >
                <FileText size={16} strokeWidth={1.75} />
                Invoice
              </Button>
            )}
            {allowed.includes("createDelivery") && (
              <Button
                size="sm"
                disabled={busy}
                onClick={() => router.push(`/deliveries/new?order=${order.soNo}`)}
              >
                <Truck size={16} strokeWidth={1.75} />
                Create delivery
              </Button>
            )}
            {allowed.includes("confirm") && (
              <Button
                size="sm"
                disabled={busy}
                onClick={onConfirm}
              >
                <Send size={16} strokeWidth={1.75} />
                Confirm
              </Button>
            )}
    </>
  );
}
