/**
 * Stabile Identifikatoren für die Leistungen.
 *
 * Die IDs sind bewusst unabhängig von den übersetzten Texten: sie sind der einzige
 * Wert, der Dialog, Formular (`z.enum`), Zusammenfassung und E-Mail-Vorschau
 * verbindet. Ein beliebigender Nutzerstring kann so nie als "Service" durchrutschen,
 * und ein Umbenennen eines Titels in `messages/*.json` ändert nichts an der Validierung.
 *
 * Reihenfolge == Reihenfolge der `Services.items` in `messages/de.json` / `en.json`.
 */
export const SERVICE_IDS = [
  'inspektion',
  'reparatur',
  'diagnose',
  'bremsen',
  'oelwechsel',
  'reifen',
  'hu',
  'beratung',
] as const;

export type ServiceId = (typeof SERVICE_IDS)[number];

const SERVICE_ID_SET: ReadonlySet<string> = new Set<string>(SERVICE_IDS);

export function isServiceId(value: unknown): value is ServiceId {
  return typeof value === 'string' && SERVICE_ID_SET.has(value);
}

/** Mindestens so viel trägt eine Leistungsübersetzung aus `messages/*.json` mit sich. */
export type ServiceListing = { id: string; heading: string };

/**
 * Übersetzte Bezeichnung einer Leistung – nach ID gesucht, nie nach Text.
 *
 * Die Zusammenfassung und die E-Mail-Vorschau zeigen damit immer den Titel der aktuell
 * gewählten Sprache, auch wenn die Anfrage in der anderen Sprache gestellt wurde.
 * Unbekannte Kennungen werden durchgereicht, statt unsichtbar zu verschwinden.
 */
export function findServiceHeading(items: readonly ServiceListing[], id: ServiceId): string {
  return items.find((item) => item.id === id)?.heading ?? id;
}
