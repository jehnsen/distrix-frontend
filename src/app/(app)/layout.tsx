import { getDashboard, listWarehouses } from "@/lib/api";
import { AppShell } from "@/components/shell/app-shell";
import type { ShellNotification } from "@/components/shell/notification-tray";

const TONE_BY_KIND = {
  over_credit_limit: "overdue",
  return_inspection: "partial",
  expense_approval: "partial",
  commission_review: "info",
} as const;

/**
 * Every application route renders inside the shell. Public and print routes
 * live outside this group so they get no sidebar and no top bar.
 *
 * The notification tray reads the same attention queue the dashboard renders,
 * so the two can never disagree about what needs a decision.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [dashboard, warehouses] = await Promise.all([getDashboard(), listWarehouses()]);

  const notifications: ShellNotification[] = dashboard.attention.slice(0, 8).map((item) => ({
    id: item.id,
    tone: TONE_BY_KIND[item.kind],
    title: item.title,
    detail: item.detail,
    href: item.href,
  }));

  return (
    <AppShell notifications={notifications} warehouses={warehouses}>
      {children}
    </AppShell>
  );
}
