"use client";

import Link from "next/link";
import { ArrowUpRight, Paperclip } from "lucide-react";

import { formatDate, initials, relativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusPill, type StatusKey } from "@/components/distrix/status-pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface DocumentAttachment {
  id: string;
  name: string;
  sizeLabel: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface RelatedDocument {
  id: string;
  docNo: string;
  type: string;
  status: StatusKey;
  href: string;
  date: string;
}

export interface AuditEntryView {
  id: string;
  actor: string;
  action: string;
  detail?: string;
  at: string;
}

function EmptyPanel({ children }: { children: string }) {
  return <p className="px-3 py-8 text-center text-base text-ink-muted">{children}</p>;
}

/**
 * The right-hand rail on every document: Attachments, Related documents and
 * Activity. Related documents is how the fulfilment chain stays navigable
 * (SO → DRs → Invoices → Payments) from any node in it.
 */
export function DocumentSideTabs({
  attachments,
  related,
  activity,
  className,
}: {
  attachments: DocumentAttachment[];
  related: RelatedDocument[];
  activity: AuditEntryView[];
  className?: string;
}) {
  return (
    <Tabs
      defaultValue="related"
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-surface shadow-raised",
        className,
      )}
    >
      <TabsList className="gap-3 px-3">
        <TabsTrigger value="related">
          Related
          <span className="font-mono text-xs text-ink-muted tabular-nums">
            {related.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="attachments">
          Files
          <span className="font-mono text-xs text-ink-muted tabular-nums">
            {attachments.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="related">
        {related.length === 0 ? (
          <EmptyPanel>No other documents reference this one yet.</EmptyPanel>
        ) : (
          <ul role="list" className="divide-y divide-border">
            {related.map((doc) => (
              <li key={doc.id}>
                <Link
                  href={doc.href}
                  className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-mono text-base font-medium text-ink tabular-nums">
                      {doc.docNo}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {doc.type} · {formatDate(doc.date)}
                    </span>
                  </span>
                  <StatusPill status={doc.status} />
                  <ArrowUpRight
                    aria-hidden
                    size={14}
                    strokeWidth={1.75}
                    className="shrink-0 text-ink-muted"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="attachments">
        {attachments.length === 0 ? (
          <EmptyPanel>No files attached. Drop a signed DR or a receipt here.</EmptyPanel>
        ) : (
          <ul role="list" className="divide-y divide-border">
            {attachments.map((file) => (
              <li key={file.id} className="flex items-center gap-2.5 px-3 py-2.5">
                <Paperclip
                  aria-hidden
                  size={16}
                  strokeWidth={1.75}
                  className="shrink-0 text-ink-muted"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-base text-ink">{file.name}</span>
                  <span className="text-xs text-ink-muted">
                    {file.uploadedBy} · {relativeDay(file.uploadedAt)}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-ink-muted tabular-nums">
                  {file.sizeLabel}
                </span>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="activity">
        {activity.length === 0 ? (
          <EmptyPanel>Nothing has happened to this document yet.</EmptyPanel>
        ) : (
          <ol role="list" className="flex flex-col px-3 py-2.5">
            {activity.map((entry, index) => (
              <li key={entry.id} className="flex gap-2.5">
                <div className="flex flex-col items-center">
                  <span
                    aria-hidden
                    className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-sunken text-xs font-medium text-ink-muted"
                  >
                    {initials(entry.actor)}
                  </span>
                  {index < activity.length - 1 && (
                    <span aria-hidden className="w-px flex-1 bg-border" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-3.5">
                  <p className="text-base text-ink">
                    <span className="font-medium">{entry.actor}</span> {entry.action}
                  </p>
                  {entry.detail && <p className="text-sm text-ink-muted">{entry.detail}</p>}
                  <p className="font-mono text-xs text-ink-muted">{relativeDay(entry.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </TabsContent>
    </Tabs>
  );
}
