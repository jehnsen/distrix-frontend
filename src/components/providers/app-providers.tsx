"use client";

import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <NuqsAdapter>
        <TooltipProvider delay={200}>
          {children}
          <Toaster
            position="bottom-right"
            gap={8}
            offset={16}
            toastOptions={{
              unstyled: false,
              classNames: {
                toast:
                  "!bg-surface-raised !border !border-border !shadow-overlay !rounded-lg !text-ink !text-base !font-sans !gap-2.5 !p-3",
                title: "!text-base !font-medium !text-ink",
                description: "!text-sm !text-ink-muted",
                actionButton: "!bg-accent !text-accent-ink !rounded-md !text-sm !h-7 !px-2.5",
                cancelButton:
                  "!bg-surface-sunken !text-ink-muted !rounded-md !text-sm !h-7 !px-2.5",
                success: "[&_[data-icon]]:!text-paid",
                error: "[&_[data-icon]]:!text-overdue",
                warning: "[&_[data-icon]]:!text-partial",
                info: "[&_[data-icon]]:!text-info",
              },
            }}
          />
        </TooltipProvider>
      </NuqsAdapter>
    </Suspense>
  );
}
