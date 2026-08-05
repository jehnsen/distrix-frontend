import type { Metadata } from "next";

import { DeliveryDetailView } from "@/app/(app)/deliveries/[drNo]/_components/delivery-detail-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ drNo: string }>;
}): Promise<Metadata> {
  const { drNo } = await params;
  return { title: decodeURIComponent(drNo) };
}

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ drNo: string }>;
}) {
  const { drNo } = await params;
  return <DeliveryDetailView drNo={decodeURIComponent(drNo)} />;
}
