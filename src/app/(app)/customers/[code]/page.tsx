import type { Metadata } from "next";

import { CustomerDetailView } from "@/app/(app)/customers/[code]/_components/customer-detail-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return { title: decodeURIComponent(code) };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <CustomerDetailView code={decodeURIComponent(code)} />;
}
