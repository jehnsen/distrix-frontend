import { redirect } from "next/navigation";

export default function RootPage() {
  // GATE 9: point this at /dashboard once the dashboard exists. Until then the
  // kitchen sink is the only route with anything real behind it.
  redirect("/kitchen-sink");
}
