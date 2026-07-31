"use client";

import { useState } from "react";
import { PackageSearch } from "lucide-react";
import { toast } from "sonner";

import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import {
  EmptyState,
  ErrorState,
  NoResultsState,
  PanelSkeleton,
  TableSkeleton,
} from "@/components/distrix/states";
import { Card, InlineBanner } from "@/components/distrix/primitives";
import { StatusPill, type StatusKey } from "@/components/distrix/status-pill";
import { Button } from "@/components/ui/button";

/** Fails every other time, so rollback is visible rather than theoretical. */
function flakyCommit(attempt: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (attempt % 2 === 1) reject(new Error("The dispatch board rejected the change."));
      else resolve();
    }, 400);
  });
}

export function StatesSection() {
  const [status, setStatus] = useState<StatusKey>("draft");
  const [attempt, setAttempt] = useState(0);

  const { mutate, pending } = useOptimisticMutation<StatusKey>({
    value: status,
    setValue: setStatus,
    successMessage: (next) => `Delivery marked ${next}`,
    what: "mark the delivery dispatched",
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card padded={false}>
        <div className="border-b border-border px-4 py-2.5">
          <h3 className="th-label">Skeleton — matches the final layout</h3>
        </div>
        <TableSkeleton columns={5} rows={5} widths={[0.5, 0.9, 0.4, 0.35, 0.3]} />
      </Card>

      <Card padded={false}>
        <div className="border-b border-border px-4 py-2.5">
          <h3 className="th-label">Empty — a specific next step, not &ldquo;Add&rdquo;</h3>
        </div>
        <EmptyState
          icon={PackageSearch}
          title="No stock adjustments this month"
          description="Adjustments are raised from a cycle count. Start a count in the Parañaque warehouse to record shrinkage or found stock."
          action={
            <Button size="sm" variant="outline">
              Start a cycle count
            </Button>
          }
        />
      </Card>

      <Card padded={false}>
        <div className="border-b border-border px-4 py-2.5">
          <h3 className="th-label">No results — distinct from empty</h3>
        </div>
        <NoResultsState
          query="rossi"
          onClearFilters={() => toast.info("Filters cleared")}
        />
      </Card>

      <Card padded={false}>
        <div className="border-b border-border px-4 py-2.5">
          <h3 className="th-label">Error — names what failed</h3>
        </div>
        <ErrorState
          what="the aging summary"
          detail="The receivables service returned a 503 after 5 seconds. No figures on this page are current."
          onRetry={() => toast.success("Retrying…")}
        />
      </Card>

      <Card>
        <h3 className="th-label pb-3">Panel skeleton</h3>
        <PanelSkeleton lines={5} />
      </Card>

      <Card>
        <h3 className="th-label pb-3">Optimistic update with rollback</h3>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-base text-ink-muted">DR-2026-0461</span>
            <StatusPill status={status} size="md" />
          </div>
          <p className="text-sm text-ink-muted">
            The pill changes immediately. Every other attempt fails and rolls back with a
            toast naming the action — press it twice.
          </p>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              disabled={pending}
              onClick={() => {
                const next = attempt % 2 === 0 ? "dispatched" : "draft";
                setAttempt((n) => n + 1);
                void mutate(next, () => flakyCommit(attempt));
              }}
            >
              {pending ? "Working…" : "Toggle dispatch"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <h3 className="th-label pb-3">Inline banners — persistent, never a toast</h3>
        <div className="flex flex-col gap-2.5">
          <InlineBanner tone="overdue" title="Customer is over its credit limit">
            Orders cannot be dispatched until a manager approves the breach.
          </InlineBanner>
          <InlineBanner tone="partial" title="Three lines exceed available stock">
            The order can still be taken — the shortfall is flagged per line.
          </InlineBanner>
          <InlineBanner tone="info" title="Landed cost has not been allocated">
            Per-unit cost on this shipment is still the PO price. Allocate before posting.
          </InlineBanner>
          <InlineBanner tone="paid" title="Statement issued">
            Sent to accounts@bistrorossi.ph on 28 Jul 2026.
          </InlineBanner>
        </div>
      </Card>
    </div>
  );
}
