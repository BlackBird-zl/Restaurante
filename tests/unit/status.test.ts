import { describe, expect, it } from 'vitest';
import { deriveOrderStatus, padOrderNumber, ticketColumn } from '@/modules/orders/status';

describe('derived order status (mirrors app_private.order_status)', () => {
  it.each([
    [['pending', 'pending'], 'new'],
    [['pending', 'preparing'], 'preparing'],
    [['ready', 'preparing'], 'partially_ready'],
    [['ready', 'ready'], 'ready'],
    [['ready', 'cancelled'], 'ready'],
    [['delivered', 'ready'], 'partially_served'],
    [['delivering', 'pending'], 'partially_served'],
    [['delivered', 'cancelled'], 'delivered'],
    [['cancelled', 'cancelled'], 'cancelled'],
  ] as const)('%j → %s', (lines, expected) => {
    expect(deriveOrderStatus(lines)).toBe(expected);
  });
});

describe('KDS ticket column', () => {
  it('places tickets by their station lines', () => {
    expect(ticketColumn(['pending', 'pending'])).toBe('new');
    expect(ticketColumn(['pending', 'ready'])).toBe('preparing');
    expect(ticketColumn(['preparing'])).toBe('preparing');
    expect(ticketColumn(['ready', 'delivered'])).toBe('ready');
    expect(ticketColumn(['delivered', 'cancelled'])).toBeNull();
  });
  it('pads order numbers', () => {
    expect(padOrderNumber(7)).toBe('0007');
  });
});
