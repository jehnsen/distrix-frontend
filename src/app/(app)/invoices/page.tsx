import type { Metadata } from "next";

import { InvoicesView } from "@/app/(app)/invoices/_components/invoices-view";

export const metadata: Metadata = {
  title: "Invoices",
  description: "What has been billed and what is still owed.",
};

export default function InvoicesPage() {
  return <InvoicesView />;
}
