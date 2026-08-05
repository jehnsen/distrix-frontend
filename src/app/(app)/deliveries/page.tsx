import type { Metadata } from "next";

import { DeliveriesView } from "@/app/(app)/deliveries/_components/deliveries-view";

export const metadata: Metadata = {
  title: "Deliveries",
  description: "The dispatch board and every delivery receipt cut.",
};

export default function DeliveriesPage() {
  return <DeliveriesView />;
}
