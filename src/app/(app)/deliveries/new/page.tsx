import type { Metadata } from "next";
import { Suspense } from "react";

import { NewDeliveryForm } from "@/app/(app)/deliveries/new/_components/new-delivery-form";

export const metadata: Metadata = { title: "New delivery receipt" };

export default function NewDeliveryPage() {
  return (
    <Suspense fallback={null}>
      <NewDeliveryForm />
    </Suspense>
  );
}
