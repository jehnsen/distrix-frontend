/**
 * Integer-centavo money. There is no float arithmetic on money anywhere in
 * Distrix — every amount is an integer number of centavos and every operation
 * that can produce a fraction rounds explicitly.
 *
 * Chosen over dinero.js v2 because that package is still published as an alpha
 * and this app only needs six operations, all of which fit here with no deps.
 */

declare const centavosBrand: unique symbol;

/** An integer number of centavos. 1 peso = 100 centavos. */
export type Centavos = number & { readonly [centavosBrand]: true };

export const ZERO = 0 as Centavos;

/** PH VAT, expressed in basis points so the rate itself is never a float. */
export const VAT_RATE_BP = 1200; // 12.00%
export const BP_SCALE = 10_000;

function assertInt(value: number, label: string): void {
  if (!Number.isFinite(value) || !Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer of centavos, got ${value}`);
  }
}

/** Half-up away from zero — the rounding PH invoices are cut with. */
function roundHalfUp(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

export function centavos(value: number): Centavos {
  assertInt(value, "centavos");
  return value as Centavos;
}

/** 1234.56 -> 123456. Accepts at most 2 decimal places of input precision. */
export function fromMajor(pesos: number): Centavos {
  if (!Number.isFinite(pesos)) throw new RangeError(`Invalid peso amount: ${pesos}`);
  return roundHalfUp(pesos * 100) as Centavos;
}

/** Parses user input: "₱1,234.56", "1234.56", "(500)" (negative), "" -> null. */
export function parseMoney(input: string): Centavos | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const negated = /^\(.*\)$/.test(trimmed);
  const cleaned = trimmed.replace(/[()₱,\s]/g, "");
  if (!/^-?\d*\.?\d*$/.test(cleaned) || cleaned === "" || cleaned === ".") return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  const amount = fromMajor(parsed);
  return (negated ? -amount : amount) as Centavos;
}

export function toMajor(amount: Centavos): number {
  return amount / 100;
}

export function add(...amounts: Centavos[]): Centavos {
  return amounts.reduce<number>((sum, a) => sum + a, 0) as Centavos;
}

export function subtract(a: Centavos, b: Centavos): Centavos {
  return (a - b) as Centavos;
}

export function negate(a: Centavos): Centavos {
  return -a as Centavos;
}

export function abs(a: Centavos): Centavos {
  return Math.abs(a) as Centavos;
}

export function isZero(a: Centavos): boolean {
  return a === 0;
}

export function compare(a: Centavos, b: Centavos): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

export function max(a: Centavos, b: Centavos): Centavos {
  return (a > b ? a : b) as Centavos;
}

export function min(a: Centavos, b: Centavos): Centavos {
  return (a < b ? a : b) as Centavos;
}

/** Multiply by a whole quantity. Exact — no rounding needed. */
export function multiplyQty(unit: Centavos, qty: number): Centavos {
  if (!Number.isFinite(qty)) throw new RangeError(`Invalid quantity: ${qty}`);
  return roundHalfUp(unit * qty) as Centavos;
}

/** Apply a rate expressed in basis points (1200 = 12%). Rounds half-up. */
export function applyBp(amount: Centavos, bp: number): Centavos {
  return roundHalfUp((amount * bp) / BP_SCALE) as Centavos;
}

/** Percentage as a decimal figure the user typed, e.g. 12.5 for 12.5%. */
export function applyPct(amount: Centavos, pct: number): Centavos {
  return applyBp(amount, roundHalfUp(pct * 100));
}

/** Convert a foreign-currency amount at an FX rate. Rate is a plain number. */
export function convertFx(amount: Centavos, rate: number): Centavos {
  if (!Number.isFinite(rate) || rate <= 0) throw new RangeError(`Invalid FX rate: ${rate}`);
  return roundHalfUp(amount * rate) as Centavos;
}

/** VAT added on top of a VAT-exclusive base. */
export function vatOnNet(net: Centavos): Centavos {
  return applyBp(net, VAT_RATE_BP);
}

/** The VAT component already inside a VAT-inclusive figure. */
export function vatInGross(gross: Centavos): Centavos {
  return roundHalfUp((gross * VAT_RATE_BP) / (BP_SCALE + VAT_RATE_BP)) as Centavos;
}

export function netOfGross(gross: Centavos): Centavos {
  return subtract(gross, vatInGross(gross));
}

/**
 * Split `amount` across `weights` so the parts sum to exactly `amount`.
 * Largest-remainder: no centavo is created or lost. This is what landed-cost
 * allocation, payment allocation and discount proration all run through.
 */
export function allocate(amount: Centavos, weights: number[]): Centavos[] {
  if (weights.length === 0) return [];
  if (weights.some((w) => w < 0 || !Number.isFinite(w))) {
    throw new RangeError("Allocation weights must be finite and non-negative");
  }
  const total = weights.reduce((sum, w) => sum + w, 0);

  // No signal to allocate by — spread evenly and let the remainder fall left.
  if (total === 0) {
    const even = Math.trunc(amount / weights.length);
    const parts = weights.map(() => even);
    let rest = amount - even * weights.length;
    for (let i = 0; rest !== 0; i = (i + 1) % parts.length) {
      const step = rest > 0 ? 1 : -1;
      parts[i] = (parts[i] ?? 0) + step;
      rest -= step;
    }
    return parts as Centavos[];
  }

  const exact = weights.map((w) => (amount * w) / total);
  const floored = exact.map((v) => Math.trunc(v));
  let remainder = amount - floored.reduce((sum, v) => sum + v, 0);

  const order = exact
    .map((v, i) => ({ i, frac: Math.abs(v - Math.trunc(v)) }))
    .sort((a, b) => b.frac - a.frac);

  const step = remainder >= 0 ? 1 : -1;
  for (let k = 0; remainder !== 0; k++) {
    const target = order[k % order.length];
    if (!target) break;
    floored[target.i] = (floored[target.i] ?? 0) + step;
    remainder -= step;
  }

  return floored as Centavos[];
}

/** Sum a list of line amounts. */
export function sum(amounts: readonly Centavos[]): Centavos {
  return amounts.reduce<number>((acc, a) => acc + a, 0) as Centavos;
}
