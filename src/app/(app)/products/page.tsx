import type { Metadata } from "next";

import { ProductsView } from "@/app/(app)/products/_components/products-view";

export const metadata: Metadata = {
  title: "Products",
  description: "The catalogue, its stock position and its margins.",
};

export default function ProductsPage() {
  return <ProductsView />;
}
