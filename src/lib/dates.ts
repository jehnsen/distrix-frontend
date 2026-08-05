import { addDays, formatISO, parseISO } from "date-fns";

/**
 * "Today" for forms and defaults. The mock layer pins its own `TODAY` so aging
 * buckets never drift; the UI must agree with it, or a new order dated by the
 * browser clock would land outside the seeded period.
 *
 * GATE 2 pinned this in `src/lib/mock/db.ts`. It is duplicated here rather than
 * imported so no component reaches into the mock layer for it.
 */
export const TODAY_ISO = "2026-07-31";

export function todayIso(): string {
  return TODAY_ISO;
}

export function addDaysIso(isoDate: string, days: number): string {
  return formatISO(addDays(parseISO(isoDate), days), { representation: "date" });
}

export function isoToday(): Date {
  return parseISO(TODAY_ISO);
}
