"use client";

import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import type { Warehouse } from "@/types";
import { CommandPalette } from "@/components/command/command-palette";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import type { ShellNotification } from "@/components/shell/notification-tray";

export function AppShell({
  children,
  warehouses,
  notifications,
}: {
  children: React.ReactNode;
  warehouses: Warehouse[];
  notifications: ShellNotification[];
}) {
  useGlobalShortcuts();

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar notifications={notifications} warehouses={warehouses} />
        <main id="main" className="flex-1">
          <div className="mx-auto w-full max-w-content">{children}</div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
