"use client";

import { useMemo } from "react";
import { parseAsInteger, parseAsString, useQueryState, useQueryStates } from "nuqs";

import {
  buildParsers,
  FROM,
  MAX,
  MIN,
  TO,
  type FilterDef,
  type FilterValues,
} from "@/lib/filters";

/**
 * Reads the same URL state `<FilterBar>` writes. Both call nuqs with the same
 * parsers, so the page and the bar can never disagree about what is filtered —
 * and the whole list state survives a refresh and pastes into a chat message.
 */
export function useFilterValues(filters: FilterDef[]): FilterValues {
  const parsers = useMemo(() => buildParsers(filters), [filters]);
  const [values] = useQueryStates(parsers, { history: "replace", shallow: true });
  return values as FilterValues;
}

/** Page index is 1-based in the URL and 0-based in the table, as users expect. */
export function useListPagination(defaultSize = 25) {
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ history: "replace", shallow: true }),
  );
  const [size, setSize] = useQueryState(
    "size",
    parseAsInteger.withDefault(defaultSize).withOptions({ history: "replace", shallow: true }),
  );

  return {
    pageIndex: Math.max(0, page - 1),
    pageSize: size,
    setPageIndex: (index: number) => void setPage(index + 1),
    setPageSize: (next: number) => {
      void setSize(next);
      void setPage(1);
    },
  };
}

export function useListSort(defaultSort: string) {
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsString.withDefault(defaultSort).withOptions({ history: "replace", shallow: true }),
  );
  return { sort, setSort: (next: string) => void setSort(next) };
}

/* -------------------------------------------------------------------------
   Readers — turn the loosely typed URL bag into API arguments
   ------------------------------------------------------------------------- */

export function readString(values: FilterValues, key: string): string | undefined {
  const value = values[key];
  return typeof value === "string" && value !== "" ? value : undefined;
}

export function readArray<T extends string>(
  values: FilterValues,
  key: string,
): T[] | undefined {
  const value = values[key];
  return Array.isArray(value) && value.length > 0 ? (value as T[]) : undefined;
}

export function readNumber(values: FilterValues, key: string): number | null {
  const value = values[key];
  return typeof value === "number" ? value : null;
}

/** `dueFrom` / `dueTo` for a `dateRange` filter keyed `due`. */
export function readDateRange(values: FilterValues, key: string) {
  return {
    from: readString(values, `${key}${FROM}`),
    to: readString(values, `${key}${TO}`),
  };
}

/** `amountMin` / `amountMax` for an `amountRange` filter keyed `amount`. */
export function readAmountRange(values: FilterValues, key: string) {
  return {
    min: readNumber(values, `${key}${MIN}`),
    max: readNumber(values, `${key}${MAX}`),
  };
}
