"use client";

import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Warehouse } from "@/types";
import { useUiStore } from "@/stores/ui-store";
import { Kbd } from "@/components/distrix/kbd";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { MobileNav } from "@/components/shell/mobile-nav";
import {
  NotificationTray,
  type ShellNotification,
} from "@/components/shell/notification-tray";
import { UserMenu } from "@/components/shell/user-menu";
import { WarehouseSwitcher } from "@/components/shell/warehouse-switcher";

function GlobalSearchTrigger() {
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);

  return (
    <button
      type="button"
      onClick={() => setCommandOpen(true)}
      aria-label="Search customers, products and documents"
      aria-keyshortcuts="Meta+K Control+K"
      className={cn(
        "flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-2.5",
        "text-base text-ink-muted transition-colors duration-[160ms] ease-out",
        "hover:border-border-strong hover:text-ink",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
        "md:w-56 lg:w-72",
      )}
    >
      <Search size={16} strokeWidth={1.75} className="shrink-0" />
      <span className="hidden flex-1 text-left md:inline">Search or jump to…</span>
      <Kbd keys={["⌘", "K"]} className="ml-auto hidden md:inline-flex" />
    </button>
  );
}

export function Topbar({
  notifications,
  warehouses,
}: {
  notifications: ShellNotification[];
  warehouses: Warehouse[];
}) {
  return (
    <header
      data-print="hide"
      className="sticky top-0 z-20 flex h-topbar shrink-0 items-center gap-3 border-b border-border bg-surface px-3 md:px-4"
    >
      <MobileNav />

      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <GlobalSearchTrigger />
        <div className="hidden sm:block">
          <WarehouseSwitcher warehouses={warehouses} />
        </div>
        <NotificationTray items={notifications} />
        <UserMenu />
      </div>
    </header>
  );
}
