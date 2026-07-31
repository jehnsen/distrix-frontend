"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { NAV_GROUPS, isActiveRoute } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** Below 768px the rail is replaced by a sheet. Targets are 44px. */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Open navigation" className="md:hidden">
            <Menu size={18} strokeWidth={1.75} />
          </Button>
        }
      />
      <SheetContent side="left" className="w-72 gap-0 p-0">
        <SheetHeader className="h-topbar shrink-0 justify-center border-b border-border px-3">
          <SheetTitle className="flex items-center gap-2">
            <span
              aria-hidden
              className="grid size-6 place-items-center rounded-sm bg-accent font-mono text-sm font-semibold text-accent-ink"
            >
              D
            </span>
            <span className="text-xl font-semibold tracking-heading">Distrix</span>
          </SheetTitle>
        </SheetHeader>

        <nav aria-label="Main" className="flex-1 overflow-y-auto p-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="not-first:mt-4">
              <div className="th-label px-2.5 pb-1.5">{group.label}</div>
              <ul role="list" className="flex flex-col gap-px">
                {group.items.map((item) => {
                  const active = isActiveRoute(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-11 items-center gap-2.5 rounded-md px-2.5 text-base font-medium",
                          "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                          active
                            ? "bg-accent-wash text-accent"
                            : "text-ink-muted active:bg-surface-sunken",
                        )}
                      >
                        <Icon
                          size={18}
                          strokeWidth={1.75}
                          className={active ? "text-accent" : "text-ink-muted"}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
