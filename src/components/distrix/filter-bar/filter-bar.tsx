"use client";

import { useQueryStates } from "nuqs";
import { X } from "lucide-react";

import {
  activeChips,
  allFilterKeys,
  buildParsers,
  FROM,
  MAX,
  MIN,
  TO,
  type FilterDef,
  type FilterValues,
} from "@/lib/filters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ComboboxFilter,
  MultiFilter,
} from "@/components/distrix/filter-bar/filter-controls";
import {
  AmountRangeFilter,
  DateRangeFilter,
} from "@/components/distrix/filter-bar/filter-range-controls";
import { SearchFilter } from "@/components/distrix/filter-bar/filter-trigger";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

/**
 * Inline chips, never a hidden drawer — a clerk must be able to see why a list
 * is short without opening anything. State lives in the URL, so a filtered
 * list survives a refresh and can be pasted into a chat message.
 */
export function FilterBar({
  filters,
  className,
}: {
  filters: FilterDef[];
  className?: string;
}) {
  const [values, setValues] = useQueryStates(buildParsers(filters), {
    history: "replace",
    shallow: true,
  });

  const current = values as FilterValues;
  const chips = activeChips(filters, current);

  function clearKeys(keys: string[]) {
    setValues(Object.fromEntries(keys.map((key) => [key, null])));
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {filters.map((filter) => {
        switch (filter.kind) {
          case "search":
            return (
              <SearchFilter
                key={filter.key}
                value={asString(current[filter.key])}
                placeholder={filter.placeholder}
                onChange={(value) => setValues({ [filter.key]: value || null })}
              />
            );
          case "multi":
            return (
              <MultiFilter
                key={filter.key}
                label={filter.label}
                options={filter.options}
                selected={asArray(current[filter.key])}
                onChange={(next) =>
                  setValues({ [filter.key]: next.length > 0 ? next : null })
                }
              />
            );
          case "combobox":
            return (
              <ComboboxFilter
                key={filter.key}
                label={filter.label}
                options={filter.options}
                value={asString(current[filter.key])}
                onChange={(value) => setValues({ [filter.key]: value || null })}
              />
            );
          case "dateRange":
            return (
              <DateRangeFilter
                key={filter.key}
                label={filter.label}
                from={asString(current[`${filter.key}${FROM}`])}
                to={asString(current[`${filter.key}${TO}`])}
                onChange={(from, to) =>
                  setValues({
                    [`${filter.key}${FROM}`]: from || null,
                    [`${filter.key}${TO}`]: to || null,
                  })
                }
              />
            );
          case "amountRange":
            return (
              <AmountRangeFilter
                key={filter.key}
                label={filter.label}
                min={asNumber(current[`${filter.key}${MIN}`])}
                max={asNumber(current[`${filter.key}${MAX}`])}
                onChange={(min, max) =>
                  setValues({
                    [`${filter.key}${MIN}`]: min,
                    [`${filter.key}${MAX}`]: max,
                  })
                }
              />
            );
        }
      })}

      {chips.length > 0 && (
        <>
          <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
          <ul role="list" className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <li key={chip.keys.join("|")}>
                <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-surface-sunken pr-1 pl-2 text-sm">
                  <span className="text-ink-muted">{chip.label}</span>
                  <span className="max-w-40 truncate font-medium text-ink">{chip.value}</span>
                  <button
                    type="button"
                    onClick={() => clearKeys(chip.keys)}
                    aria-label={`Clear ${chip.label} filter`}
                    className="grid size-4 place-items-center rounded-xs text-ink-muted outline-none transition-colors hover:bg-border hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <Button
            variant="link"
            className="h-6 px-1 text-sm"
            onClick={() => clearKeys(allFilterKeys(filters))}
          >
            Clear all
          </Button>
        </>
      )}
    </div>
  );
}
