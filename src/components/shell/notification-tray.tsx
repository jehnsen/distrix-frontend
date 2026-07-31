"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type NotificationTone = "overdue" | "partial" | "info" | "neutral";

export interface ShellNotification {
  id: string;
  tone: NotificationTone;
  title: string;
  detail: string;
  href: string;
  /** Optional short timestamp label; omitted when the queue has no clock. */
  at?: string;
}

const TONE_DOT: Record<NotificationTone, string> = {
  overdue: "bg-overdue",
  partial: "bg-partial",
  info: "bg-info",
  neutral: "bg-border-strong",
};

/**
 * GATE 9: items arrive from the same queue that feeds the dashboard's "Needs
 * your attention" panel. The tray is presentational and takes them as a prop.
 */
export function NotificationTray({ items }: { items: ShellNotification[] }) {
  const unread = items.length;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              unread > 0 ? `Notifications, ${unread} needing attention` : "Notifications"
            }
            className="relative"
          >
            <Bell size={18} strokeWidth={1.75} />
            {unread > 0 && (
              <span
                aria-hidden
                className="absolute top-1 right-1 size-1.5 rounded-full bg-overdue ring-2 ring-surface"
              />
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-84 p-0">
        <div className="flex h-9 items-center justify-between border-b border-border px-3">
          <span className="th-label">Needs attention</span>
          <span className="font-mono text-xs text-ink-muted">{unread}</span>
        </div>

        {unread === 0 ? (
          <p className="px-3 py-8 text-center text-base text-ink-muted">
            Nothing needs attention right now.
          </p>
        ) : (
          <ul role="list" className="max-h-96 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="border-b border-border last:border-b-0">
                <Link
                  href={item.href}
                  className={cn(
                    "flex gap-2.5 px-3 py-2.5 transition-colors hover:bg-surface-sunken",
                    "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", TONE_DOT[item.tone])}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-base font-medium text-ink">{item.title}</span>
                    <span className="text-sm text-ink-muted">{item.detail}</span>
                  </span>
                  {item.at && (
                    <span className="shrink-0 font-mono text-xs text-ink-muted">{item.at}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border p-1.5">
          <Button variant="ghost" size="sm" className="w-full justify-start" render={
            <Link href="/dashboard">Open the attention queue</Link>
          } />
        </div>
      </PopoverContent>
    </Popover>
  );
}
