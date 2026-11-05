/**
 * Stabile Identifikatoren für die Leistungen.
 *
 * Die IDs sind bewusst unabhängig von den übersetzten Texten: sie sind der einzige
 * Wert, der Dialog, Formular, Server-Validierung (`z.enum`) und E-Mail-Inhalt
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
