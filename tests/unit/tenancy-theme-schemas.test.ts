import { describe, expect, it } from 'vitest';
import { isStaffPath, isTenantApi, normalizeHost } from '@/modules/tenancy/host';
import { publicUrl } from '@/modules/tenancy/public-url';
import { contrast, onAccent, PRESETS, themeProblems } from '@/modules/themes/theme';
import { OrderLines } from '@/modules/orders/schemas';

describe('host normalisation', () => {
  it('lowercases, strips trailing dot, keeps port, rejects junk', () => {
    expect(normalizeHost('PATIO-DO-FERRO.Localhost:3000')).toEqual({ host: 'patio-do-ferro.localhost:3000', hostname: 'patio-do-ferro.localhost', port: '3000' });
    expect(normalizeHost('example.pt.')?.hostname).toBe('example.pt');
    expect(normalizeHost('café.pt')?.hostname).toBe('xn--caf-dma.pt');
    for (const bad of ['', 'a b', 'evil.com/x', 'user@host', 'a?b', null]) expect(normalizeHost(bad)).toBeNull();
  });
  it('classifies staff and tenant API paths', () => {
    expect(isStaffPath('/r/patio-do-ferro')).toBe(true);
    expect(isStaffPath('/entrar')).toBe(true);
    expect(isStaffPath('/carta')).toBe(false);
    expect(isTenantApi('/api/v1/guest/join')).toBe(true);
    expect(isTenantApi('/api/v1/guestx')).toBe(false);
  });
  it('builds public URLs for tenant host and preview path', () => {
    expect(publicUrl('', '/carta')).toBe('/carta');
    expect(publicUrl('/d/patio-do-ferro', '/')).toBe('/d/patio-do-ferro');
    expect(publicUrl('/d/patio-do-ferro', 'carta')).toBe('/d/patio-do-ferro/carta');
  });
});

describe('theme contrast (WCAG)', () => {
  it('computes known ratios', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
  });
  it('all shipped presets pass their own checks', () => {
    for (const p of PRESETS) expect(themeProblems(p.defaults), p.id).toEqual([]);
  });
  it('flags low-contrast text', () => {
    const t = structuredClone(PRESETS[0]!.defaults);
    t.color.text = '#DDDDDD';
    expect(themeProblems(t).map((x) => x.pair)).toContain('texto / fundo');
  });
  it('picks readable text on the accent', () => {
    expect(onAccent('#6F3038')).toBe('#FFFFFF');
    expect(onAccent('#F2D16B')).toBe('#141414');
  });
});

describe('order line schema (client never sends price/total/station)', () => {
  const line = { itemId: '00000000-0000-4000-8000-000000000001', quantity: 2, expectedItemVersion: 1, expectedPriceCents: 1500 };
  it('accepts a valid line', () => expect(OrderLines.safeParse([line]).success).toBe(true));
  it.each([
    [{ ...line, unitPriceCents: 1 }], [{ ...line, stationId: 'x' }], [{ ...line, restaurantId: 'x' }], [{ ...line, status: 'ready' }],
    [{ ...line, quantity: 11 }], [{ ...line, quantity: 0 }], [{ ...line, quantity: 1.5 }], [{ ...line, note: 'x'.repeat(161) }],
  ])('rejects %j', (bad) => expect(OrderLines.safeParse([bad]).success).toBe(false));
  it('rejects empty and oversized orders', () => {
    expect(OrderLines.safeParse([]).success).toBe(false);
    expect(OrderLines.safeParse(Array.from({ length: 21 }, () => line)).success).toBe(false);
  });
});
