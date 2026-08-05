import type { Metadata } from "next";
import { Suspense } from "react";

import { NewOrderForm } from "@/app/(app)/orders/new/_components/new-order-form";

export const metadata: Metadata = {
  title: "New sales order",
};

export default function NewOrderPage() {
  return (
    <Suspense fallback={null}>
      <NewOrderForm />
    </Suspense>
  );
}
