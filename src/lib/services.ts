/**
 * Stable identifiers for the services.
 *
 * The ids are deliberately independent of the translated texts: they are the only value that
 * ties the dialog, the form (`z.enum`), the summary and the email preview together. That way an
 * arbitrary user string can never pass as a "service", and renaming a title in `messages/*.json`
 * changes nothing about validation.
 *
 * Order == order of `Services.items` in `messages/de.json` / `en.json`.
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

/** A service translation from `messages/*.json` always carries at least this much. */
export type ServiceListing = { id: string; heading: string };

/**
 * Translated name of a service – looked up by id, never by text.
 *
 * The summary and the email preview therefore always show the title of the currently chosen
 * language, even when the request was made in the other language. Unknown identifiers are
 * passed through instead of disappearing silently.
 */
export function findServiceHeading(items: readonly ServiceListing[], id: ServiceId): string {
  return items.find((item) => item.id === id)?.heading ?? id;
}
