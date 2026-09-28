import { describe, expect, it } from 'vitest';
import { businessDate, localToday, reservationSlots, weekdayKey, type WeeklyHours } from '@/lib/time';

describe('business date (local − 05:00, Europe/Lisbon)', () => {
  it('assigns after-midnight service to the previous business day', () => {
    // 2026-09-28 00:30 Lisbon (WEST, UTC+1) = 2026-09-27T23:30Z → business day 27
    expect(businessDate(new Date('2026-09-27T23:30:00Z'))).toBe('2026-09-27');
    // 04:59 local still previous day; 05:00 local starts a new one
    expect(businessDate(new Date('2026-09-28T03:59:00Z'))).toBe('2026-09-27');
    expect(businessDate(new Date('2026-09-28T04:00:00Z'))).toBe('2026-09-28');
  });
  it('handles the DST change (last Sunday of October: 02:00 → 01:00)', () => {
    // 2026-10-25: WEST→WET. 04:30Z = 04:30 local (UTC+0) → still business day 24
    expect(businessDate(new Date('2026-10-25T04:30:00Z'))).toBe('2026-10-24');
    expect(businessDate(new Date('2026-10-25T05:00:00Z'))).toBe('2026-10-25');
    // March 29 2026: WET→WEST; 04:00Z = 05:00 local → new business day
    expect(businessDate(new Date('2026-03-29T04:00:00Z'))).toBe('2026-03-29');
    expect(businessDate(new Date('2026-03-29T03:59:00Z'))).toBe('2026-03-28');
  });
  it('computes local today and weekday', () => {
    expect(localToday(new Date('2026-09-27T23:30:00Z'))).toBe('2026-09-28');
    expect(weekdayKey('2026-09-27')).toBe('sun');
    expect(weekdayKey('2026-09-28')).toBe('mon');
  });
});

describe('reservation slots', () => {
  const hours: WeeklyHours = { tue: [['12:00', '15:00'], ['19:00', '23:00']], mon: [] };
  it('offers :00/:30 inside windows ending 60 min before close', () => {
    expect(reservationSlots(hours, '2026-09-29')).toEqual(['12:00', '12:30', '13:00', '13:30', '14:00', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00']);
  });
  it('closed days have no slots', () => {
    expect(reservationSlots(hours, '2026-09-28')).toEqual([]);
    expect(reservationSlots(hours, '2026-09-30')).toEqual([]);
  });
});
