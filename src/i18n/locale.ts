import { hasLocale } from 'next-intl';
import { routing, type Locale } from './routing';

/**
 * Prüft einen Wert aus dem `[locale]`-Segment und gibt eine Locale zurück, die sicher eine
 * Datei in `messages/` hat.
 *
 * Browser und Erweiterungen fragen Pfadnamen ab, die im Wurzelverzeichnis liegen:
 * `/.well-known/change-password`, `/.well-known/security-contact.txt`, `/favicon.ico`. Dieser
 * App ist keine Middleware vorgeschaltet, die solche Pfade herausfiltert, also greift für sie
 * das `[locale]`-Segment – `locale` heißt dann `.well-known`. request.ts übersetzt daraus
 * ungeprüft `../../messages/.well-known.json` und wirft MODULE_NOT_FOUND, noch bevor die
 * 404-Entscheidung fallen kann. Die Meldung erscheint beim Hochfahren, weil der Browser
 * diese Pfade von selbst anfragt.
 *
 * Die 404 entscheidet weiterhin layout.tsx anhand von `hasLocale`. Hier geht es nur darum,
 * dass die Metadaten einer Anfrage, die sowieso abgelehnt wird, übersetzbar bleiben, statt
 * diesen Fehler zu werfen.
 */
export function toLocale(value: string | undefined): Locale {
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}
