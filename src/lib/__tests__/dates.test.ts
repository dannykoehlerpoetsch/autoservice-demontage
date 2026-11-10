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

describe('Datumshelfer', () => {
  it('zählt Daten lokal, nicht nach UTC (kein Tag-Sprung durch toISOString)', () => {
    expect(toIsoDate(new Date(2026, 4, 8, 23, 30))).toBe('2026-05-08');
    expect(toIsoDate(new Date(2026, 4, 9, 0, 5))).toBe('2026-05-09');
  });

  it('liest nur echte Kalenderdaten', () => {
    expect(fromIsoDate('2026-05-08')?.getDate()).toBe(8);
    expect(isIsoDate('2026-05-08')).toBe(true);

    for (const value of ['2026/05/08', '2026-13-01', '2027-02-31', '8.5.2026', '']) {
      expect(fromIsoDate(value), value).toBe(null);
    }
  });

  it('rechnet Tage ohne Zeitgrenzen und über Jahres- sowie Schaltkanten', () => {
    expect(addIsoDays('2026-05-08', 1)).toBe('2026-05-09');
    expect(addIsoDays('2026-05-08', -1)).toBe('2026-05-07');
    expect(addIsoDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addIsoDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addIsoDays('2028-02-28', 1)).toBe('2028-02-29');
    // Umstellung Sommerzeit in der Nacht auf den 29.03.2026: bleibt ein ganzer Tag.
    expect(addIsoDays('2026-03-27', 1)).toBe('2026-03-28');
    expect(addIsoDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addIsoDays('2026-05-08', 365)).toBe('2027-05-08');
  });

  it('bestimmt „heute“ nach der Zeitzone des Betriebs, nicht nach der des Servers', () => {
    // 22:30 UTC ist in Europe/Berlin schon der nächste Tag, auf Hawaii noch derselbe.
    const instant = new Date('2026-05-08T22:30:00Z');

    expect(todayIso('UTC', instant)).toBe('2026-05-08');
    expect(todayIso('Europe/Berlin', instant)).toBe('2026-05-09');
    expect(todayIso('Pacific/Honolulu', instant)).toBe('2026-05-08');
    expect(todayIso(WORKSHOP_TIME_ZONE, instant)).toBe('2026-05-09');
  });

  it('liefert ohne Zeitpunktangabe den heutigen Tag im Format YYYY-MM-DD', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('benennt ein Datum in der Sprache der Anfrage', () => {
    expect(formatIsoDateLong('2026-05-08', 'de')).toBe('Freitag, 8. Mai 2026');
    expect(formatIsoDateLong('2026-05-08', 'en')).toBe('Friday, May 8, 2026');
  });

  it('gibt ein unlesbares Datum unverändert zurück statt zu werfen', () => {
    expect(formatIsoDateLong('2026-13-45', 'de')).toBe('2026-13-45');
  });
});
