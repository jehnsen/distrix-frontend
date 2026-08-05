import type { Metadata } from "next";

import { InvoiceDetailView } from "@/app/(app)/invoices/[siNo]/_components/invoice-detail-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siNo: string }>;
}): Promise<Metadata> {
  const { siNo } = await params;
  return { title: decodeURIComponent(siNo) };
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ siNo: string }>;
}) {
  const { siNo } = await params;
  return <InvoiceDetailView siNo={decodeURIComponent(siNo)} />;
}
