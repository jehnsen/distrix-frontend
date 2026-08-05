import type { Metadata } from "next";

import { AdjustmentsView } from "@/app/(app)/adjustments/_components/adjustments-view";

export const metadata: Metadata = {
  title: "Stock adjustments",
  description: "Cycle counts, write-offs and their reason codes.",
};

export default function AdjustmentsPage() {
  return <AdjustmentsView />;
}
