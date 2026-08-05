"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { toast } from "sonner";

import {
  createDeliveryReceipt,
  getDrivers,
  listDeliverableOrders,
  type DeliverableOrder,
} from "@/lib/api";
import { TODAY_ISO } from "@/lib/dates";
import { useUiStore } from "@/stores/ui-store";
import { useApiQuery } from "@/hooks/use-api-query";
import { useUnsavedChangesGuard } from "@/components/distrix/guards/unsaved-changes";
import { Card, PageHeader } from "@/components/distrix/primitives";
import { ErrorState } from "@/components/distrix/states";
import { Button } from "@/components/ui/button";
import { DispatchDetailsCard } from "@/app/(app)/deliveries/new/_components/dispatch-details-card";
import {
  shipAll,
  ShipLinesTable,
  type DraftLine,
} from "@/app/(app)/deliveries/new/_components/ship-lines-table";

export function NewDeliveryForm() {
  const router = useRouter();
  const params = useSearchParams();
  const preselected = params.get("order");
  const warehouseId = useUiStore((s) => s.activeWarehouseId);

  const orders = useApiQuery(`deliverable:${warehouseId}`, () =>
    listDeliverableOrders(warehouseId),
  );
  const drivers = useApiQuery("drivers", getDrivers);

  // An order arriving in the URL is derived, and the ship-all default falls out
  // of that derivation — no effect needed to seed either.
  const [picked, setPicked] = useState<DeliverableOrder | undefined>();
  const order =
    picked ??
    (preselected
      ? orders.data?.find((row) => row.order.soNo === preselected)
      : undefined);

  /** Edits are held against the order they belong to, so switching resets. */
  const [edited, setEdited] = useState<{ orderId: string; lines: DraftLine[] } | null>(null);
  const lines =
    order && edited?.orderId === order.order.id
      ? edited.lines
      : order
        ? shipAll(order)
        : [];

  const [deliveryDate, setDeliveryDate] = useState(TODAY_ISO);
  const [driver, setDriver] = useState("");
  const [plateNo, setPlateNo] = useState("");
  const [dropSequence, setDropSequence] = useState(1);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const { prompt } = useUnsavedChangesGuard(order !== undefined && !busy);

  function pick(next: DeliverableOrder) {
    setPicked(next);
    setEdited(null);
    setErrors({});
  }

  function setLines(next: DraftLine[]) {
    if (order) setEdited({ orderId: order.order.id, lines: next });
  }

  function updateLine(id: string, patch: Partial<DraftLine>) {
    setLines(
      lines.map((line) => (line.salesOrderLineId === id ? { ...line, ...patch } : line)),
    );
  }

  const shippingQty = lines.reduce((acc, line) => acc + line.qtyShipped, 0);
  const shortLines = lines.filter(
    (line) => line.qtyShipped > 0 && line.qtyShipped < line.outstanding,
  );
  const missingReason = shortLines.some((line) => line.shortReason === "");

  async function submit() {
    if (!order) return;
    if (shippingQty === 0) {
      toast.error("Nothing to ship", { description: "At least one line must go out." });
      return;
    }
    if (missingReason) {
      toast.error("Give a reason for each short line");
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      const delivery = await createDeliveryReceipt({
        salesOrderId: order.order.id,
        warehouseId: order.order.warehouseId,
        deliveryDate,
        driver,
        plateNo,
        dropSequence,
        lines: lines
          .filter((line) => line.qtyShipped > 0)
          .map((line) => ({
            id: line.salesOrderLineId,
            salesOrderLineId: line.salesOrderLineId,
            productId: line.productId,
            sku: line.sku,
            description: line.description,
            qtyOrdered: line.outstanding,
            qtyShipped: line.qtyShipped,
            uom: line.uom,
            ...(line.shortReason ? { shortReason: line.shortReason } : {}),
          })),
      });
      toast.success(`${delivery.drNo} cut`, {
        description: "Assign it on the dispatch board when the truck loads.",
      });
      router.push(`/deliveries/${delivery.drNo}`);
    } catch (cause) {
      const issues =
        cause && typeof cause === "object" && "issues" in cause
          ? (cause.issues as Record<string, string[]>)
          : {};
      setErrors(issues);
      toast.error("Could not cut the delivery receipt", {
        description: cause instanceof Error ? cause.message : "Nothing was saved.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (orders.error) {
    return (
      <div className="p-4">
        <Card padded={false}>
          <ErrorState
            what="open orders"
            detail={orders.error.message}
            onRetry={orders.refetch}
          />
        </Card>
      </div>
    );
  }

  return (
    <>
      {prompt}
      <PageHeader
        title="New delivery receipt"
        description="Everything outstanding ships by default. Reduce a line only when the shelf is short."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => router.push("/deliveries")}
            >
              Discard
            </Button>
            <Button
              size="sm"
              disabled={busy || !order || shippingQty === 0}
              onClick={() => void submit()}
            >
              <PackageCheck size={16} strokeWidth={1.75} />
              {busy ? "Saving…" : "Cut receipt"}
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-4 px-4 pb-8">
        <DispatchDetailsCard
          orders={orders.data ?? []}
          ordersLoading={orders.isInitialLoading}
          order={order}
          drivers={drivers.data ?? []}
          deliveryDate={deliveryDate}
          driver={driver}
          plateNo={plateNo}
          dropSequence={dropSequence}
          errors={errors}
          onPick={pick}
          setDeliveryDate={setDeliveryDate}
          setDriver={setDriver}
          setPlateNo={setPlateNo}
          setDropSequence={setDropSequence}
        />

        {order && (
          <ShipLinesTable
            order={order}
            lines={lines}
            shippingQty={shippingQty}
            missingReason={missingReason}
            busy={busy}
            onUpdate={updateLine}
            onShipAll={() => setLines(shipAll(order))}
          />
        )}
      </div>
    </>
  );
}
