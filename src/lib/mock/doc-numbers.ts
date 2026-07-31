/**
 * Document number series. Numbers are allocated in date order during seeding so
 * SO-2025-0001 really is older than SO-2026-0142, which is what a clerk expects
 * when they sort by document number.
 */

export type SeriesKey =
  | "SO"
  | "DR"
  | "SI"
  | "PR"
  | "SR"
  | "CN"
  | "PO"
  | "GR"
  | "EX"
  | "ADJ"
  | "TR"
  | "CR";

interface SeriesConfig {
  padding: number;
  includeYear: boolean;
}

const CONFIG: Record<SeriesKey, SeriesConfig> = {
  SO: { padding: 4, includeYear: true },
  DR: { padding: 4, includeYear: true },
  SI: { padding: 4, includeYear: true },
  PR: { padding: 4, includeYear: true },
  SR: { padding: 4, includeYear: true },
  CN: { padding: 4, includeYear: true },
  PO: { padding: 4, includeYear: true },
  GR: { padding: 4, includeYear: true },
  EX: { padding: 4, includeYear: true },
  ADJ: { padding: 4, includeYear: true },
  TR: { padding: 4, includeYear: true },
  CR: { padding: 3, includeYear: true },
};

/** Counters reset each calendar year, as they do on a real BIR-numbered book. */
export function createSeries() {
  const counters = new Map<string, number>();

  return {
    next(key: SeriesKey, isoDate: string): string {
      const config = CONFIG[key];
      const year = isoDate.slice(0, 4);
      const bucket = config.includeYear ? `${key}-${year}` : key;
      const next = (counters.get(bucket) ?? 0) + 1;
      counters.set(bucket, next);
      const padded = String(next).padStart(config.padding, "0");
      return config.includeYear ? `${key}-${year}-${padded}` : `${key}-${padded}`;
    },

    /** What the next number would be, for the Settings screen. */
    peek(key: SeriesKey, year: number): number {
      return (counters.get(`${key}-${year}`) ?? 0) + 1;
    },
  };
}

export type Series = ReturnType<typeof createSeries>;
