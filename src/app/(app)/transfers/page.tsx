import type { Metadata } from "next";

import { TransfersView } from "@/app/(app)/transfers/_components/transfers-view";

export const metadata: Metadata = {
  title: "Warehouse transfers",
  description: "Stock moving between sites, with receipt variance flagged.",
};

export default function TransfersPage() {
  return <TransfersView />;
}
