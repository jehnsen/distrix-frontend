/**
 * Deterministic pseudo-random source. The whole dataset is derived from one
 * seed, so every reload produces the same business — figures in a screenshot
 * still match the app tomorrow, and a bug is reproducible.
 */

/** mulberry32 — small, fast, good enough distribution for seed data. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng: Rng = {
    next,

    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },

    float(min, max) {
      return next() * (max - min) + min;
    },

    bool(probability = 0.5) {
      return next() < probability;
    },

    pick(items) {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new RangeError("Cannot pick from an empty list");
      return item;
    },

    pickMany(items, count) {
      const pool = [...items];
      const taken: typeof items[number][] = [];
      for (let i = 0; i < count && pool.length > 0; i++) {
        const [item] = pool.splice(Math.floor(next() * pool.length), 1);
        if (item !== undefined) taken.push(item);
      }
      return taken;
    },

    /** Weighted pick. Weights need not sum to 1. */
    weighted(entries) {
      const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
      let roll = next() * total;
      for (const entry of entries) {
        roll -= entry.weight;
        if (roll <= 0) return entry.value;
      }
      const last = entries[entries.length - 1];
      if (!last) throw new RangeError("Cannot pick from an empty distribution");
      return last.value;
    },

    /**
     * Roughly normal via the central limit theorem, clamped. Order values and
     * quantities cluster around a typical size rather than spreading flat.
     */
    normal(mean, stdDev, min, max) {
      const sample = (next() + next() + next() + next() + next() + next() - 3) / 3;
      return Math.min(max, Math.max(min, mean + sample * stdDev));
    },

    shuffle(items) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const a = copy[i];
        const b = copy[j];
        if (a !== undefined && b !== undefined) {
          copy[i] = b;
          copy[j] = a;
        }
      }
      return copy;
    },
  };

  return rng;
}

export interface Rng {
  next: () => number;
  int: (min: number, max: number) => number;
  float: (min: number, max: number) => number;
  bool: (probability?: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
  pickMany: <T>(items: readonly T[], count: number) => T[];
  weighted: <T>(entries: readonly { value: T; weight: number }[]) => T;
  normal: (mean: number, stdDev: number, min: number, max: number) => number;
  shuffle: <T>(items: readonly T[]) => T[];
}

/** The one seed the entire dataset derives from. */
export const SEED = 20260731;

/** Sequential id factory, so ids read as `so-0142` rather than as UUID noise. */
export function createIdFactory(prefix: string, start = 1) {
  let counter = start;
  return (): string => `${prefix}-${String(counter++).padStart(4, "0")}`;
}
