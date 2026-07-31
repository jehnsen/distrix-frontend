"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Box, Building2, CornerDownLeft, FileText } from "lucide-react";

import { searchEverything, type SearchHit } from "@/lib/api";
import {
  COMMAND_ACTIONS,
  fuzzyScore,
  matchDocumentNumber,
} from "@/lib/command-registry";
import { NAV_ITEMS } from "@/lib/nav";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { useUiStore } from "@/stores/ui-store";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd } from "@/components/distrix/kbd";

type CommandEntityKind = SearchHit["kind"];

const KIND_ICON = {
  customer: Building2,
  product: Box,
  document: FileText,
} as const;

const KIND_HEADING = {
  customer: "Customers",
  product: "Products",
  document: "Documents",
} as const;

const KIND_ORDER: CommandEntityKind[] = ["document", "customer", "product"];

/**
 * ⌘K. Fuzzy across customers, products and document numbers plus verb actions.
 * A document-number pattern short-circuits to a direct jump, so typing
 * `SI-2026-1188` goes straight there rather than making the user pick.
 */
export function CommandPalette() {
  const router = useRouter();
  const open = useUiStore((s) => s.commandOpen);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const [query, setQuery] = useState("");

  const jump = useMemo(() => matchDocumentNumber(query), [query]);
  const { results, pending } = useDebouncedSearch(query, searchEverything);
  const grouped = useMemo(
    () =>
      KIND_ORDER.map((kind) => ({
        kind,
        rows: results.filter((entity) => entity.kind === kind),
      })).filter((group) => group.rows.length > 0),
    [results],
  );

  function go(href: string) {
    setCommandOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        setCommandOpen(next);
        if (!next) setQuery("");
      }}
    >
      {/* cmdk's own filter is off: ranking is ours so document jumps win. */}
      <Command shouldFilter={false} loop>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search customers, products, document numbers…"
        />

        <CommandList>
          <CommandEmpty>
            {pending ? (
              "Searching…"
            ) : (
              <>
                No match for <span className="font-mono text-ink">{query}</span>.
              </>
            )}
          </CommandEmpty>

          {jump && (
            <CommandGroup heading="Jump to">
              <CommandItem value={`jump-${jump.docNo}`} onSelect={() => go(jump.href)}>
                <ArrowRight />
                <span className="font-mono text-ink">{jump.docNo}</span>
                <span className="text-ink-muted">{jump.label}</span>
                <CommandShortcut className="border-0 bg-transparent px-0">
                  <CornerDownLeft size={12} strokeWidth={1.75} />
                </CommandShortcut>
              </CommandItem>
            </CommandGroup>
          )}

          {grouped.map(({ kind, rows }) => {
            const Icon = KIND_ICON[kind];
            return (
              <CommandGroup key={kind} heading={KIND_HEADING[kind]}>
                {rows.map((entity) => (
                  <CommandItem
                    key={entity.id}
                    value={entity.id}
                    onSelect={() => go(entity.href)}
                  >
                    <Icon />
                    <span className="w-24 shrink-0 truncate font-mono text-sm text-ink-muted">
                      {entity.code}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{entity.name}</span>
                    {entity.meta && (
                      <span className="shrink-0 font-mono text-sm text-ink-muted">
                        {entity.meta}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}

          <CommandGroup heading="Actions">
            {COMMAND_ACTIONS.filter(
              (action) =>
                fuzzyScore(query, `${action.label} ${action.keywords}`) !== null,
            ).map((action) => {
              const Icon = action.icon;
              return (
                <CommandItem key={action.id} value={action.id} onSelect={() => go(action.href)}>
                  <Icon />
                  <span>{action.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandGroup heading="Go to">
            {NAV_ITEMS.filter((item) => fuzzyScore(query, item.label) !== null)
              .slice(0, 6)
              .map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem key={item.href} value={item.href} onSelect={() => go(item.href)}>
                    <Icon />
                    <span>{item.label}</span>
                  </CommandItem>
                );
              })}
          </CommandGroup>
        </CommandList>

        <div className="flex h-9 items-center gap-4 border-t border-border px-3 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <Kbd keys={["↑", "↓"]} /> navigate
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd keys={["↵"]} /> open
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <Kbd keys={["esc"]} /> close
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
