"use client";

import { useEffect, useRef, useState } from "react";

interface Snapshot<T> {
  /** The query these rows answer, so a stale set is never shown as current. */
  query: string;
  rows: T[];
}

/**
 * Runs an async search as the user types, one request behind at most. Late
 * responses for a stale query are discarded, so the list never flickers back to
 * an older result set.
 */
export function useDebouncedSearch<T>(
  query: string,
  search: (query: string) => Promise<T[]>,
  delayMs = 140,
): { results: T[]; pending: boolean } {
  const [snapshot, setSnapshot] = useState<Snapshot<T>>({ query: "", rows: [] });
  const requestId = useRef(0);
  const searchRef = useRef(search);

  useEffect(() => {
    searchRef.current = search;
  });

  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed === "") return;

    const id = ++requestId.current;
    const timer = setTimeout(() => {
      searchRef
        .current(trimmed)
        .then((rows) => {
          if (id === requestId.current) setSnapshot({ query: trimmed, rows });
        })
        .catch(() => {
          if (id === requestId.current) setSnapshot({ query: trimmed, rows: [] });
        });
    }, delayMs);

    return () => clearTimeout(timer);
  }, [trimmed, delayMs]);

  // Derived rather than stored: an empty box has no results, and a query the
  // snapshot has not caught up with is still pending.
  if (trimmed === "") return { results: [], pending: false };
  return {
    results: snapshot.query === trimmed ? snapshot.rows : [],
    pending: snapshot.query !== trimmed,
  };
}
