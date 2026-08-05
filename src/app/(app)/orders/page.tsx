import type { Metadata } from "next";

import { OrdersView } from "@/app/(app)/orders/_components/orders-view";

export const metadata: Metadata = {
  title: "Sales orders",
  description: "Orders, their fulfilment progress and what is still to ship.",
};

export default function OrdersPage() {
  return <OrdersView />;
}
