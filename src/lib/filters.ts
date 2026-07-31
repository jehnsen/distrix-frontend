import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  type ParserBuilder,
} from "nuqs";

import { formatDate, formatMoney } from "@/lib/format";
import type { Centavos } from "@/lib/money";

export interface FilterOption {
  value: string;
  label: string;
  /** Right-aligned context in the option row: a count, a balance, a code. */
  hint?: string;
}

export type FilterDef =
  | { kind: "search"; key: string; placeholder: string }
  | { kind: "multi"; key: string; label: string; options: FilterOption[] }
  | { kind: "combobox"; key: string; label: string; options: FilterOption[] }
  | { kind: "dateRange"; key: string; label: string }
  | { kind: "amountRange"; key: string; label: string };

export type FilterValue = string | string[] | number | null;
export type FilterValues = Record<string, FilterValue>;

/** Suffixes for the two-ended filters, so one def owns both query keys. */
export const FROM = "From";
export const TO = "To";
export const MIN = "Min";
export const MAX = "Max";

/**
 * Builds the nuqs parser map for a filter set. `history: "replace"` keeps the
 * back button meaning "the previous page", not "the previous keystroke".
 */
export function buildParsers(
  filters: FilterDef[],
): Record<string, ParserBuilder<string> | ParserBuilder<string[]> | ParserBuilder<number>> {
  const map: Record<
    string,
    ParserBuilder<string> | ParserBuilder<string[]> | ParserBuilder<number>
  > = {};

  for (const filter of filters) {
    switch (filter.kind) {
      case "search":
      case "combobox":
        map[filter.key] = parseAsString;
        break;
      case "multi":
        map[filter.key] = parseAsArrayOf(parseAsString);
        break;
      case "dateRange":
        map[`${filter.key}${FROM}`] = parseAsString;
        map[`${filter.key}${TO}`] = parseAsString;
        break;
      case "amountRange":
        // Stored in centavos so the URL never carries a float.
        map[`${filter.key}${MIN}`] = parseAsInteger;
        map[`${filter.key}${MAX}`] = parseAsInteger;
        break;
    }
  }

  return map;
}

export interface ActiveChip {
  /** Query keys this chip clears. */
  keys: string[];
  label: string;
  value: string;
}

function optionLabel(options: FilterOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/** Every applied filter, rendered visibly with its own clear button. */
export function activeChips(filters: FilterDef[], values: FilterValues): ActiveChip[] {
  const chips: ActiveChip[] = [];

  for (const filter of filters) {
    switch (filter.kind) {
      case "search": {
        const value = values[filter.key];
        if (typeof value === "string" && value !== "") {
          chips.push({ keys: [filter.key], label: "Search", value });
        }
        break;
      }
      case "combobox": {
        const value = values[filter.key];
        if (typeof value === "string" && value !== "") {
          chips.push({
            keys: [filter.key],
            label: filter.label,
            value: optionLabel(filter.options, value),
          });
        }
        break;
      }
      case "multi": {
        const value = values[filter.key];
        if (Array.isArray(value) && value.length > 0) {
          chips.push({
            keys: [filter.key],
            label: filter.label,
            value:
              value.length <= 2
                ? value.map((v) => optionLabel(filter.options, v)).join(", ")
                : `${value.length} selected`,
          });
        }
        break;
      }
      case "dateRange": {
        const from = values[`${filter.key}${FROM}`];
        const to = values[`${filter.key}${TO}`];
        const hasFrom = typeof from === "string" && from !== "";
        const hasTo = typeof to === "string" && to !== "";
        if (hasFrom || hasTo) {
          chips.push({
            keys: [`${filter.key}${FROM}`, `${filter.key}${TO}`],
            label: filter.label,
            value: hasFrom && hasTo
              ? `${formatDate(from)} – ${formatDate(to)}`
              : hasFrom
                ? `from ${formatDate(from)}`
                : `until ${formatDate(to as string)}`,
          });
        }
        break;
      }
      case "amountRange": {
        const min = values[`${filter.key}${MIN}`];
        const max = values[`${filter.key}${MAX}`];
        const hasMin = typeof min === "number";
        const hasMax = typeof max === "number";
        if (hasMin || hasMax) {
          chips.push({
            keys: [`${filter.key}${MIN}`, `${filter.key}${MAX}`],
            label: filter.label,
            value: hasMin && hasMax
              ? `${formatMoney(min as Centavos, { symbol: true })} – ${formatMoney(max as Centavos, { symbol: true })}`
              : hasMin
                ? `over ${formatMoney(min as Centavos, { symbol: true })}`
                : `under ${formatMoney(max as Centavos, { symbol: true })}`,
          });
        }
        break;
      }
    }
  }

  return chips;
}

/** All query keys a filter set owns — used by "Clear all". */
export function allFilterKeys(filters: FilterDef[]): string[] {
  return Object.keys(buildParsers(filters));
}
