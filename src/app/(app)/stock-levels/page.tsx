import type { Metadata } from "next";

import { StockLevelsView } from "@/app/(app)/stock-levels/_components/stock-levels-view";

export const metadata: Metadata = {
  title: "Stock levels",
  description: "On-hand, reserved, available and incoming by warehouse.",
};

export default function StockLevelsPage() {
  return <StockLevelsView />;
}
