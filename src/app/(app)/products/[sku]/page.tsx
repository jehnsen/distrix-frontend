import type { Metadata } from "next";

import { ProductDetailView } from "@/app/(app)/products/[sku]/_components/product-detail-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sku: string }>;
}): Promise<Metadata> {
  const { sku } = await params;
  return { title: decodeURIComponent(sku) };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;
  return <ProductDetailView sku={decodeURIComponent(sku)} />;
}
