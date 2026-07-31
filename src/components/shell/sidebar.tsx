"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { NAV_GROUPS, isActiveRoute, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const active = isActiveRoute(pathname, item.href);
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-8 items-center gap-2.5 rounded-md text-base font-medium",
        "transition-colors duration-[160ms] ease-out",
        "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
        collapsed ? "w-8 justify-center" : "px-2.5",
        active
          ? "bg-accent-wash text-accent"
          : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
      )}
    >
      {/* 2px accent left edge on the active item. */}
      <span
        aria-hidden
        className={cn(
          "absolute top-1 bottom-1 -left-2 w-0.5 rounded-full bg-accent",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon
        size={18}
        strokeWidth={1.75}
        className={cn("shrink-0", active ? "text-accent" : "text-ink-muted")}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      data-print="hide"
      data-collapsed={collapsed || undefined}
      className={cn(
        "sticky top-0 z-30 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface md:flex",
        "transition-[width] duration-[160ms] ease-out",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar",
      )}
    >
      <div
        className={cn(
          "flex h-topbar shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "gap-2 px-3",
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span
            aria-hidden
            className="grid size-6 shrink-0 place-items-center rounded-sm bg-accent font-mono text-sm font-semibold text-accent-ink"
          >
            D
          </span>
          {!collapsed && (
            <span className="text-xl font-semibold tracking-heading text-ink">Distrix</span>
          )}
        </Link>
      </div>

      <nav
        aria-label="Main"
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="not-first:mt-4">
            {collapsed ? (
              <div aria-hidden className="mx-auto mb-2 h-px w-5 bg-border" />
            ) : (
              <div className="th-label px-2.5 pb-1.5">{group.label}</div>
            )}
            <ul className="flex flex-col gap-px" role="list">
              {group.items.map((item) => (
                <li key={item.href} className="px-0.5">
                  <NavLink item={item} collapsed={collapsed} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-2">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className={cn(
            "flex h-8 items-center gap-2.5 rounded-md text-base font-medium text-ink-muted",
            "transition-colors duration-[160ms] ease-out hover:bg-surface-sunken hover:text-ink",
            "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
            collapsed ? "w-8 justify-center" : "w-full px-2.5",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} strokeWidth={1.75} />
          ) : (
            <PanelLeftClose size={18} strokeWidth={1.75} />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
