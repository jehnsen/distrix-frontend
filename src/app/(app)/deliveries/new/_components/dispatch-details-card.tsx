"use client";

import type { DeliverableOrder } from "@/lib/api";
import { Card, CardHeader } from "@/components/distrix/primitives";
import { PanelSkeleton } from "@/components/distrix/states";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderPicker } from "@/app/(app)/deliveries/new/_components/order-picker";

/** Which order, going out when, on whose truck. */
export function DispatchDetailsCard({
  orders,
  ordersLoading,
  order,
  drivers,
  deliveryDate,
  driver,
  plateNo,
  dropSequence,
  errors,
  onPick,
  setDeliveryDate,
  setDriver,
  setPlateNo,
  setDropSequence,
}: {
  orders: DeliverableOrder[];
  ordersLoading: boolean;
  order: DeliverableOrder | undefined;
  drivers: { name: string; plate: string }[];
  deliveryDate: string;
  driver: string;
  plateNo: string;
  dropSequence: number;
  errors: Record<string, string[]>;
  onPick: (order: DeliverableOrder) => void;
  setDeliveryDate: (value: string) => void;
  setDriver: (value: string) => void;
  setPlateNo: (value: string) => void;
  setDropSequence: (value: number) => void;
}) {
  return (
        <Card padded={false}>
          <CardHeader
            title="Order"
            description="Only confirmed and part-delivered orders with something outstanding."
          />
          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-1.5">
              <Label>Sales order</Label>
              {ordersLoading ? (
                <PanelSkeleton lines={2} />
              ) : (
                <OrderPicker orders={orders} value={order} onSelect={onPick} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="delivery-date">Delivery date</Label>
                <Input
                  id="delivery-date"
                  type="date"
                  value={deliveryDate}
                  onChange={(event) => setDeliveryDate(event.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="driver">Driver</Label>
                <Select
                  value={driver}
                  onValueChange={(value) => {
                    if (typeof value !== "string") return;
                    setDriver(value);
                    const match = drivers.find((row) => row.name === value);
                    if (match) setPlateNo(match.plate);
                  }}
                >
                  <SelectTrigger id="driver" aria-invalid={Boolean(errors["driver"]) || undefined}>
                    <SelectValue placeholder="Assign a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {(drivers).map((row) => (
                      <SelectItem key={row.name} value={row.name}>
                        {row.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plate">Plate no.</Label>
                <Input
                  id="plate"
                  value={plateNo}
                  placeholder="NCR 1234"
                  onChange={(event) => setPlateNo(event.target.value)}
                  aria-invalid={Boolean(errors["plateNo"]) || undefined}
                  className="font-mono uppercase"
                />
                {errors["plateNo"] && (
                  <p className="text-xs text-overdue">{errors["plateNo"][0]}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="drop">Drop no.</Label>
                <Input
                  id="drop"
                  numeric
                  inputMode="numeric"
                  value={String(dropSequence)}
                  onChange={(event) =>
                    setDropSequence(Math.max(1, Number(event.target.value) || 1))
                  }
                />
              </div>
            </div>
          </div>
        </Card>
  );
}
