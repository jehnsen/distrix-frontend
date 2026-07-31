"use client";

import { useState } from "react";

import type { AgingBucketKey } from "@/lib/aging";
import { AgingRail } from "@/components/distrix/aging-rail";
import { emptyAgingSummary } from "@/lib/aging";
import { DEMO_AGING } from "@/app/(app)/kitchen-sink/_fixtures";

const AS_OF = "2026-07-31";

export function AgingSection() {
  const [selected, setSelected] = useState<AgingBucketKey | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <AgingRail
        summary={DEMO_AGING}
        asOf={AS_OF}
        selected={selected}
        onSelect={(key) => setSelected((current) => (current === key ? null : key))}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AgingRail
          summary={DEMO_AGING}
          asOf={AS_OF}
          variant="pinned"
          title="Bistro Rossi Group Inc."
          hrefFor={(key) => `/customers/C-0311?bucket=${key}`}
        />
        <AgingRail
          summary={emptyAgingSummary()}
          asOf={AS_OF}
          variant="pinned"
          title="Cebu Provisions Trading"
        />
      </div>

      <p className="text-sm text-ink-muted">
        Segment widths are proportional to amount with a floor, so a small 90+ balance
        stays a real click target. The first rail filters in place; the second navigates.
        {selected && (
          <>
            {" "}
            Currently filtered to <span className="font-medium text-ink">{selected}</span>.
          </>
        )}
      </p>
    </div>
  );
}
