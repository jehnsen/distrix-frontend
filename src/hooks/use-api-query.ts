"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api";

interface QueryState<T> {
  /** The key this result answers. Anything else means it is stale. */
  key: string;
  data?: T;
  error?: ApiError;
}

export interface ApiQueryResult<T> {
  data: T | undefined;
  error: ApiError | undefined;
  isLoading: boolean;
  /** True only on the very first load, when there is nothing to show yet. */
  isInitialLoading: boolean;
  refetch: () => void;
}

/**
 * Runs an API call and keeps the previous result on screen while the next one
 * is in flight, so changing a filter does not blank the table.
 *
 * `key` must capture every input the call depends on — it is what tells a stale
 * response from a current one. Loading is derived from the key rather than
 * stored, which keeps the effect free of synchronous setState.
 */
export function useApiQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
): ApiQueryResult<T> {
  const [state, setState] = useState<QueryState<T>>({ key: "" });
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  const requestId = useRef(0);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const fullKey = `${key}::${nonce}`;

  useEffect(() => {
    const id = ++requestId.current;

    fetcherRef
      .current()
      .then((data) => {
        if (id === requestId.current) setState({ key: fullKey, data });
      })
      .catch((cause: unknown) => {
        if (id !== requestId.current) return;
        setState({
          key: fullKey,
          error:
            cause instanceof ApiError
              ? cause
              : new ApiError("the data", "An unexpected error occurred.", 500),
        });
      });
  }, [fullKey]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  const settled = state.key === fullKey;

  return {
    // Previous data stays visible while the next page loads.
    data: state.error && settled ? undefined : state.data,
    error: settled ? state.error : undefined,
    isLoading: !settled,
    isInitialLoading: !settled && state.data === undefined,
    refetch,
  };
}
