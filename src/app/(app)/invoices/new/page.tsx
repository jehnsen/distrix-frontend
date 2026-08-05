import type { Metadata } from "next";
import { Suspense } from "react";

import { NewInvoiceForm } from "@/app/(app)/invoices/new/_components/new-invoice-form";

export const metadata: Metadata = { title: "New invoice" };

export default function NewInvoicePage() {
  return (
    <Suspense fallback={null}>
      <NewInvoiceForm />
    </Suspense>
  );
}
