import type { Metadata } from "next";

import { PageHeader } from "@/components/distrix/primitives";
import { AgingSection } from "@/app/(app)/kitchen-sink/_sections/aging-section";
import { ControlsSection } from "@/app/(app)/kitchen-sink/_sections/controls-section";
import { DocumentSection } from "@/app/(app)/kitchen-sink/_sections/document-section";
import { StatesSection } from "@/app/(app)/kitchen-sink/_sections/states-section";
import { TableSection } from "@/app/(app)/kitchen-sink/_sections/table-section";
import { TokensSection } from "@/app/(app)/kitchen-sink/_sections/tokens-section";

export const metadata: Metadata = {
  title: "Kitchen sink",
  description: "Every token and shared pattern in the Distrix design system.",
};

const SECTIONS = [
  {
    id: "tokens",
    title: "Tokens",
    blurb: "Colour, type, figures and status. Everything else derives from these.",
    content: <TokensSection />,
  },
  {
    id: "aging",
    title: "AR Aging Rail",
    blurb:
      "The signature element. Collection is the business, so the receivable position is always on screen.",
    content: <AgingSection />,
  },
  {
    id: "controls",
    title: "Controls",
    blurb: "Restyled shadcn primitives — buttons, fields, TIN mask, tabs.",
    content: <ControlsSection />,
  },
  {
    id: "table",
    title: "DataTable & FilterBar",
    blurb:
      "Sticky header and first column, saved views as URL presets, selection with a bulk bar, CSV of what you can see. Press j / k to move, Enter to open.",
    content: <TableSection />,
  },
  {
    id: "document",
    title: "DocumentPage & LineItemsEditor",
    blurb:
      "One layout for ten document types. Enter adds a line, ⌘Backspace deletes one, ⌘S saves. Edit a line then try navigating away.",
    content: <DocumentSection />,
  },
  {
    id: "states",
    title: "States & guards",
    blurb:
      "Skeleton, empty, no-results and error are four different screens. Destructive posts require typing the document number.",
    content: <StatesSection />,
  },
] as const;

export default function KitchenSinkPage() {
  return (
    <div className="pb-16">
      <PageHeader
        title="Kitchen sink"
        description="Gate 1 — the visual system and every shared pattern, before any feature work."
      />

      <nav aria-label="Sections" className="flex flex-wrap gap-1.5 px-4 pb-4">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="flex h-7 items-center rounded-md border border-border bg-surface px-2.5 text-base text-ink-muted transition-colors hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          >
            {section.title}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-10 px-4">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-topbar">
            <header className="pb-3">
              <h2 className="text-2xl font-semibold tracking-heading text-ink">
                {section.title}
              </h2>
              <p className="max-w-3xl text-base text-ink-muted">{section.blurb}</p>
            </header>
            {section.content}
          </section>
        ))}
      </div>
    </div>
  );
}
