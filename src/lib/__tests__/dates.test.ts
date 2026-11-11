import { describe, it, expect } from 'vitest';
import {
  WORKSHOP_TIME_ZONE,
  addIsoDays,
  formatIsoDateLong,
  fromIsoDate,
  isIsoDate,
  toIsoDate,
  todayIso,
} from '@/lib/dates';

describe('Date helpers', () => {
  it('reads dates locally, not in UTC (no day jump through toISOString)', () => {
    expect(toIsoDate(new Date(2026, 4, 8, 23, 30))).toBe('2026-05-08');
    expect(toIsoDate(new Date(2026, 4, 9, 0, 5))).toBe('2026-05-09');
  });

  it('reads only real calendar dates', () => {
    expect(fromIsoDate('2026-05-08')?.getDate()).toBe(8);
    expect(isIsoDate('2026-05-08')).toBe(true);

    for (const value of ['2026/05/08', '2026-13-01', '2027-02-31', '8.5.2026', '']) {
      expect(fromIsoDate(value), value).toBe(null);
    }
  });

  it('computes days without time bounds and across year and leap edges', () => {
    expect(addIsoDays('2026-05-08', 1)).toBe('2026-05-09');
    expect(addIsoDays('2026-05-08', -1)).toBe('2026-05-07');
    expect(addIsoDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addIsoDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addIsoDays('2028-02-28', 1)).toBe('2028-02-29');
    // Switch to summer time during the night of 2026-03-29: it stays a whole day.
    expect(addIsoDays('2026-03-27', 1)).toBe('2026-03-28');
    expect(addIsoDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addIsoDays('2026-05-08', 365)).toBe('2027-05-08');
  });

  it('determines "today" by the business timezone, not the server\'s', () => {
    // 22:30 UTC is already the next day in Europe/Berlin and still the same day in Hawaii.
    const instant = new Date('2026-05-08T22:30:00Z');

    expect(todayIso('UTC', instant)).toBe('2026-05-08');
    expect(todayIso('Europe/Berlin', instant)).toBe('2026-05-09');
    expect(todayIso('Pacific/Honolulu', instant)).toBe('2026-05-08');
    expect(todayIso(WORKSHOP_TIME_ZONE, instant)).toBe('2026-05-09');
  });

  it('returns today in YYYY-MM-DD format when no date is given', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('names a date in the language of the request', () => {
    expect(formatIsoDateLong('2026-05-08', 'de')).toBe('Freitag, 8. Mai 2026');
    expect(formatIsoDateLong('2026-05-08', 'en')).toBe('Friday, May 8, 2026');
  });

  it('returns an unreadable date unchanged instead of throwing', () => {
    expect(formatIsoDateLong('2026-13-45', 'de')).toBe('2026-13-45');
  });
});
