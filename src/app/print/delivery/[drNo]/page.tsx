import type { Metadata } from "next";

import { DeliveryPrint } from "@/app/print/delivery/[drNo]/_components/delivery-print";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ drNo: string }>;
}): Promise<Metadata> {
  const { drNo } = await params;
  return { title: `${decodeURIComponent(drNo)} — Delivery Receipt` };
}

export default async function DeliveryPrintPage({
  params,
}: {
  params: Promise<{ drNo: string }>;
}) {
  const { drNo } = await params;
  return <DeliveryPrint drNo={decodeURIComponent(drNo)} />;
}
