import { describe, expect, it } from 'vitest';
import { formatAmount, formatEUR, lineTotal, parseEurosToCents, sumCents } from '@/lib/money';

describe('money (integer cents)', () => {
  it('formats pt-PT euros', () => {
    expect(formatEUR(4050)).toBe('40,50 €');
    expect(formatEUR(0)).toBe('0,00 €');
    expect(formatEUR(5)).toBe('0,05 €');
    expect(formatEUR(1_234_567)).toBe('12 345,67 €');
    expect(formatAmount(1600)).toBe('16,00');
  });
  it('rejects non-integer or negative cents', () => {
    expect(() => formatEUR(10.5)).toThrow();
    expect(() => formatEUR(-1)).toThrow();
    expect(() => sumCents([100, 0.1])).toThrow();
  });
  it('computes line totals and sums without floats (demo order = 40,50 €)', () => {
    // 15,00 + 4,50 + 2×4,00 + 3,00 + 2×11,00
    expect(sumCents([lineTotal(1, 1500), lineTotal(1, 450), lineTotal(2, 400), lineTotal(1, 300), lineTotal(2, 1100)])).toBe(5250);
    expect(sumCents([lineTotal(3, 1990)])).toBe(5970);
    expect(() => lineTotal(11, 100)).toThrow();
    expect(() => lineTotal(0, 100)).toThrow();
  });
  it('parses admin input to cents', () => {
    expect(parseEurosToCents('16,00')).toBe(1600);
    expect(parseEurosToCents('16.5')).toBe(1650);
    expect(parseEurosToCents(' 16 € ')).toBe(1600);
    expect(parseEurosToCents('0,07')).toBe(7);
    expect(parseEurosToCents('16,005')).toBeNull();
    expect(parseEurosToCents('-3')).toBeNull();
    expect(parseEurosToCents('abc')).toBeNull();
  });
});
