/**
 * Kleine, zeitzone-sichere Datumshelfer für die Terminanfrage.
 *
 * Grundsatz: durch die Anwendung wandert ein Termin als `YYYY-MM-DD` (nur das Datum,
 * keine Uhrzeit, keine Zeitzone in dem Wert). Umrechnungen laufen deshalb absichtlich
 * über die *lokalen* Bestandteile eines Datums – `toISOString()` würde je nach
 * Server-Offset um einen Tag springen.
 */

/**
 * Zeitzone der Werkstatt – "heute" meint den Kalendertag in Europe/Berlin, nicht in UTC.
 * Die Seite ist deutsch gedacht; ein Ort gehört nicht zu einer erfundenen Werkstatt.
 */
export const WORKSHOP_TIME_ZONE = 'Europe/Berlin';

/** ein Datum als `YYYY-MM-DD` */
export type IsoDate = string;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is IsoDate {
  return typeof value === 'string' && ISO_DATE_PATTERN.test(value);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Datum -> `YYYY-MM-DD`, gezählt nach lokalen Kalenderregeln. */
export function toIsoDate(date: Date): IsoDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY-MM-DD` -> Datum um lokalen Mitternacht, `null` bei Unsinn (z. B. 2027-02-31). */
export function fromIsoDate(value: string): Date | null {
  if (!isIsoDate(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const isRealDay =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;

  return isRealDay ? date : null;
}

/**
 * Tage auf ein Datum addieren, ohne DST-Sprungstellen: gerechnet wird in UTC,
 * zurück kommt ein reiner Kalendertag.
 */
export function addIsoDays(value: IsoDate, days: number): IsoDate {
  const [year, month, day] = value.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * 86_400_000);

  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** Heutiger Kalendertag in der gegebenen Zeitzone (unabhängig von Server- oder Browser-Zone). */
export function todayIso(timeZone: string = WORKSHOP_TIME_ZONE, now: Date = new Date()): IsoDate {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

/**
 * Sprachkennung für `Intl`: die App liefert `de`/`en` (next-intl), `Intl` aber will die
 * vollständige Kennung. Ein Ort dafür, damit Kalender, Zusammenfassung und E-Mail-Vorschau
 * dasselbe Datum schreiben.
 */
export function intlLocaleFor(locale: string): string {
  return locale.startsWith('de') ? 'de-DE' : 'en-US';
}

/** `2027-05-08` -> `Sonntag, 8. Mai 2027` (bzw. englische Entsprechung) – für UI und Text. */
export function formatIsoDateLong(value: IsoDate, locale: string): string {
  const date = fromIsoDate(value);
  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
