import type { Metadata } from "next";

import { OrderDetailView } from "@/app/(app)/orders/[soNo]/_components/order-detail-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ soNo: string }>;
}): Promise<Metadata> {
  const { soNo } = await params;
  return { title: decodeURIComponent(soNo) };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ soNo: string }>;
}) {
  const { soNo } = await params;
  return <OrderDetailView soNo={decodeURIComponent(soNo)} />;
}
