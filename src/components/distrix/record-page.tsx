"use client";

import { useQueryState } from "nuqs";

import { cn } from "@/lib/utils";
import { Field, FieldGrid } from "@/components/distrix/primitives";
import { StatusPill, type StatusKey } from "@/components/distrix/status-pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface RecordTab {
  value: string;
  label: string;
  /** Rendered right of the label, e.g. an open-invoice count. */
  count?: number;
  content: React.ReactNode;
}

export interface RecordPageProps {
  /** "Customer", "Product" — the eyebrow above the name. */
  recordType: string;
  code: string;
  name: string;
  status?: StatusKey;
  /** Facts that stay on screen whichever tab is open. */
  fields: RecordField[];
  actions?: React.ReactNode;
  /** Persistent notices — a credit-limit breach lives here, never in a toast. */
  banner?: React.ReactNode;
  /** Pinned above the tabs: the aging rail on a customer page. */
  pinned?: React.ReactNode;
  tabs: RecordTab[];
  className?: string;
}

export interface RecordField {
  label: string;
  value: React.ReactNode;
  hint?: string;
}

/**
 * The layout for master records — customers, products, suppliers. Distinct from
 * `<DocumentPage>`: a master has no lifecycle toolbar and no totals panel, but
 * it does have deep tabbed history that must survive a refresh, so the open tab
 * lives in the URL.
 */
export function RecordPage({
  recordType,
  code,
  name,
  status,
  fields,
  actions,
  banner,
  pinned,
  tabs,
  className,
}: RecordPageProps) {
  const [tab, setTab] = useQueryState("tab", {
    defaultValue: tabs[0]?.value ?? "",
    history: "replace",
    shallow: true,
  });

  const active = tabs.some((item) => item.value === tab) ? tab : (tabs[0]?.value ?? "");

  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>
      <header className="overflow-hidden rounded-lg border border-border bg-surface shadow-raised">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-4 pt-3.5 pb-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <span className="th-label">{recordType}</span>
              <span className="font-mono text-sm text-ink-muted">{code}</span>
              {status && <StatusPill status={status} />}
            </div>
            <h1 className="text-3xl font-semibold tracking-heading text-ink">{name}</h1>
          </div>

          {actions && (
            <div data-print="hide" className="flex shrink-0 flex-wrap items-center gap-1.5">
              {actions}
            </div>
          )}
        </div>

        {fields.length > 0 && (
          <div className="border-t border-border bg-surface-sunken/40 px-4 py-3">
            <FieldGrid columns={4}>
              {fields.map((field) => (
                <Field key={field.label} label={field.label} hint={field.hint}>
                  {field.value}
                </Field>
              ))}
            </FieldGrid>
          </div>
        )}
      </header>

      {banner}
      {pinned}

      <Tabs value={active} onValueChange={(value) => void setTab(value as string)}>
        <TabsList className="px-1">
          {tabs.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
              {item.count !== undefined && (
                <span className="font-mono text-xs text-ink-muted tabular-nums">
                  {item.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((item) => (
          <TabsContent key={item.value} value={item.value}>
            {item.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
