import type { Metadata } from "next";

import { CustomersView } from "@/app/(app)/customers/_components/customers-view";

export const metadata: Metadata = {
  title: "Customers",
  description: "Accounts, balances and credit headroom.",
};

export default function CustomersPage() {
  return <CustomersView />;
}
