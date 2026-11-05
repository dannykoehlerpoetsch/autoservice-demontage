import { randomUUID } from 'node:crypto';
import type { AppointmentInput } from './schema';
import type { Locale } from '@/i18n/routing';

/**
 * Demospeicher für erfasste Terminanfragen (dieses Portfolio-Projekt hat keine Datenbank).
 *
 * Warum überhaupt eine Serverkopie? Sie ist der Sicherheitsanker der Bestätigungsstrecke:
 * Die Seite und der Mailversand greifen ausschließlich auf diesen Datensatz zu (Schlüssel:
 * eine Zufalls-ID aus dem Redirect). Das Formular kann deshalb nie eine beliebige
 * Empfängeradresse einschleusen, und jede Anfrage lässt sich höchstens einmal mailen –
 * ohne diese Serverkopie wäre der Action-Endpunkt ein offener Mail-Relay.
 *
 * Grenzen bewusst in Kauf genommen: ein Prozess, flüchtig (Neustart => Anfragen weg),
 * Anfragen verfallen nach 24 h. Für den Echtbetrieb durch Datenbank oder Queue ersetzen;
 * die Zufalls-ID als Schlüssel der Bestätigungsseite bleibt dieselbe.
 */

const RETENTION_MS = 24 * 60 * 60 * 1000;
/** Obergrenze gegen unbegrenztes Wachstum des Speichers durch Formularspam. */
const MAX_ENTRIES = 500;

export type StoredAppointmentRequest = {
  id: string;
  input: AppointmentInput;
  /** Locale der Anfrage – bestimmt Sprache der Bestätigungsmail. */
  locale: Locale;
  createdAt: number;
  mailSentAt: number | null;
};

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Dev-Re-Load (HMR) würde ein moduleinternes Map wegwerfen; darum an globalThis aufhängen.
const globalScope = globalThis as typeof globalThis & {
  __bennisAppointmentRequests?: Map<string, StoredAppointmentRequest>;
};

function requests(): Map<string, StoredAppointmentRequest> {
  globalScope.__bennisAppointmentRequests ??= new Map();
  return globalScope.__bennisAppointmentRequests;
}

export function isAppointmentId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

function purgeExpired(now: number): void {
  const store = requests();

  for (const [id, request] of store) {
    if (now - request.createdAt > RETENTION_MS) {
      store.delete(id);
    }
  }
}

/** Anfrage aufnehmen und die ID zurückgeben, mit der sie wieder auffindbar ist. */
export function saveAppointmentRequest(input: AppointmentInput, locale: Locale): string {
  const store = requests();
  const now = Date.now();

  purgeExpired(now);
  while (store.size >= MAX_ENTRIES) {
    const [oldest] = store.keys();
    store.delete(oldest);
  }

  const id = randomUUID();
  store.set(id, { id, input, locale, createdAt: now, mailSentAt: null });

  return id;
}

/** Anfrage lesen; abgelaufene oder unbekannte IDs führen zu `undefined`. */
export function findAppointmentRequest(id: string): StoredAppointmentRequest | undefined {
  if (!isAppointmentId(id)) {
    return undefined;
  }

  const store = requests();
  const request = store.get(id);
  if (!request) {
    return undefined;
  }

  if (Date.now() - request.createdAt > RETENTION_MS) {
    store.delete(id);
    return undefined;
  }

  return request;
}

/**
 * Versand vermerken. Zwischen Prüfung und Merken liegt ein kleines Zeitfenster –
 * doppelte Mails wären damit möglich, aber keine Fremdadressen; für die Demo akzeptabel.
 */
export function markAppointmentRequestMailed(id: string, sentAt = Date.now()): void {
  const request = requests().get(id);
  if (request) {
    request.mailSentAt = sentAt;
  }
}
