/** Money is always integer cents (EUR). No floats cross this boundary. */
export type Cents = number;

export function assertCents(value: number): asserts value is Cents {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid cents value: ${value}`);
}

const grouping = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0, useGrouping: true });

/** 4050 → "40,50 €" (pt-PT). Integer arithmetic only. */
export function formatEUR(cents: Cents): string {
  assertCents(cents);
  const euros = Math.trunc(cents / 100);
  const rest = cents % 100;
  const intPart = euros >= 10_000 ? grouping.format(euros).replace(/\s| | /g, ' ') : String(euros);
  return `${intPart},${String(rest).padStart(2, '0')} €`;
}

/** Plain number without currency: 4050 → "40,50". */
export function formatAmount(cents: Cents): string {
  assertCents(cents);
  return `${Math.trunc(cents / 100)},${String(cents % 100).padStart(2, '0')}`;
}

export function lineTotal(quantity: number, unitPriceCents: Cents): Cents {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new Error('Invalid quantity');
  assertCents(unitPriceCents);
  return quantity * unitPriceCents;
}

export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce((a, b) => {
    assertCents(b);
    return a + b;
  }, 0);
}

/** Parses "16,00" / "16.00" / "16" typed by an admin into cents without float math. */
export function parseEurosToCents(input: string): Cents | null {
  const s = input.trim().replace(/\s|€/g, '');
  const m = /^(\d{1,4})(?:[.,](\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const euros = Number(m[1]);
  const dec = (m[2] ?? '').padEnd(2, '0');
  return euros * 100 + Number(dec);
}
