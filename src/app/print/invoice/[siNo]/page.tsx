import type { Metadata } from "next";

import { InvoicePrint } from "@/app/print/invoice/[siNo]/_components/invoice-print";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siNo: string }>;
}): Promise<Metadata> {
  const { siNo } = await params;
  return { title: `${decodeURIComponent(siNo)} — Sales Invoice` };
}

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ siNo: string }>;
}) {
  const { siNo } = await params;
  return <InvoicePrint siNo={decodeURIComponent(siNo)} />;
}
