import { db, recalculate, type Database } from "@/lib/mock/db";
import type { Page, PageRequest } from "@/types/common";

/**
 * The seam. Everything a feature component reads or writes goes through this
 * file's helpers, so replacing the mock with a real API means rewriting
 * `src/lib/api/*` and touching nothing else.
 */

/** Named so an error state can say what failed rather than "went wrong". */
export class ApiError extends Error {
  readonly status: number;
  readonly what: string;

  constructor(what: string, message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.what = what;
    this.status = status;
  }
}

export class NotFoundError extends ApiError {
  constructor(what: string, id: string) {
    super(what, `No ${what} with reference ${id}.`, 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends ApiError {
  readonly issues: Record<string, string[]>;

  constructor(what: string, issues: Record<string, string[]>) {
    super(what, "The document did not pass validation.", 422);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

/* -------------------------------------------------------------------------
   Simulated network
   ------------------------------------------------------------------------- */

interface ApiConfig {
  minLatencyMs: number;
  maxLatencyMs: number;
  /** 0 disables the failure mode; 0.05 fails roughly one call in twenty. */
  failureRate: number;
}

const config: ApiConfig = {
  minLatencyMs: 200,
  maxLatencyMs: 500,
  failureRate: 0,
};

/**
 * Turn on to exercise error states. Deterministic per call index rather than
 * truly random, so a failing screenshot is reproducible.
 */
export function configureApi(next: Partial<ApiConfig>): void {
  Object.assign(config, next);
}

export function getApiConfig(): Readonly<ApiConfig> {
  return config;
}

let callIndex = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps a read. Adds 200–500ms of latency and, when the failure mode is on,
 * fails on a fixed cadence so the same call fails on every run.
 *
 * The result is cloned. A real endpoint hands back a fresh object every time,
 * and callers depend on that: holding a previous response for an optimistic
 * rollback only works if it cannot mutate underneath them, and React only
 * re-renders when the reference actually changes.
 */
export async function read<T>(what: string, fn: (database: Database) => T): Promise<T> {
  const index = callIndex++;
  const latency =
    config.minLatencyMs +
    ((index * 97) % Math.max(1, config.maxLatencyMs - config.minLatencyMs));
  await delay(latency);

  if (config.failureRate > 0 && index % Math.round(1 / config.failureRate) === 0) {
    throw new ApiError(what, `The ${what} service did not respond in time.`, 503);
  }

  return structuredClone(fn(db()));
}

/**
 * Wraps a write. Recalculates derived figures afterwards so a posted payment
 * moves the statement, the customer balance and the aging rail in one step.
 */
export async function write<T>(what: string, fn: (database: Database) => T): Promise<T> {
  const index = callIndex++;
  await delay(config.minLatencyMs + ((index * 61) % 200));

  if (config.failureRate > 0 && index % Math.round(1 / config.failureRate) === 0) {
    throw new ApiError(what, `The ${what} service rejected the change.`, 503);
  }

  const database = db();
  const result = fn(database);
  recalculate(database);
  return structuredClone(result);
}

/* -------------------------------------------------------------------------
   List shaping — sort, paginate, search
   ------------------------------------------------------------------------- */

export const DEFAULT_PAGE_SIZE = 25;

type Comparable = string | number | boolean | null | undefined;

/** `-field` sorts descending. Unknown fields leave the order untouched. */
export function sortRows<T>(
  rows: T[],
  sort: string | undefined,
  accessors: Record<string, (row: T) => Comparable>,
): T[] {
  if (!sort) return rows;
  const descending = sort.startsWith("-");
  const field = descending ? sort.slice(1) : sort;
  const accessor = accessors[field];
  if (!accessor) return rows;

  return [...rows].sort((a, b) => {
    const left = accessor(a);
    const right = accessor(b);
    if (left === right) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    const order = left < right ? -1 : 1;
    return descending ? -order : order;
  });
}

export function paginate<T>(rows: T[], request: PageRequest = {}): Page<T> {
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageIndex = Math.max(0, request.pageIndex ?? 0);
  const start = pageIndex * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    total: rows.length,
    pageIndex,
    pageSize,
  };
}

/** Case-insensitive substring match across the given fields. */
export function matchesQuery(query: string | undefined, ...fields: (string | undefined)[]): boolean {
  if (!query || query.trim() === "") return true;
  const needle = query.trim().toLowerCase();
  return fields.some((field) => field?.toLowerCase().includes(needle));
}

/** Inclusive ISO date-range filter; either bound may be omitted. */
export function withinDates(value: string, from?: string, to?: string): boolean {
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}

export function withinAmount(value: number, min?: number | null, max?: number | null): boolean {
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

/** Empty or absent selection means "no filter", not "match nothing". */
export function matchesAny<T extends string>(selected: T[] | undefined, value: T): boolean {
  return !selected || selected.length === 0 || selected.includes(value);
}

export function requireRecord<T>(record: T | undefined, what: string, id: string): T {
  if (!record) throw new NotFoundError(what, id);
  return record;
}
