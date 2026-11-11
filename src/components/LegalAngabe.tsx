import { betreiberAngabe, type BetreiberFeld } from '@/lib/legal/operator';

/**
 * Zwei Bausteine für Impressum und Datenschutzerklärung – beide Seiten nennen dieselbe Person.
 *
 * `Angabe` zeigt den eingetragenen Wert oder, wo noch keiner steht, einen eindeutigen
 * Platzhalter. Die Kennzeichnung über `data-rechts-platzhalter` ist der Anker für die Tests.
 */

/** Eingetragener Wert – oder der Platzhaltertext für die noch freie Stelle. */
export function Angabe({
  feld,
  platzhalter,
}: {
  feld: BetreiberFeld;
  platzhalter: (feld: BetreiberFeld) => string;
}) {
  const wert = betreiberAngabe(feld);

  if (wert === null) {
    return (
      <span data-rechts-platzhalter="true" className="text-gray-600 italic dark:text-gray-300">
        {platzhalter(feld)}
      </span>
    );
  }

  return <span data-rechts-wert="true">{wert}</span>;
}

/**
 * Name und Anschrift der betreibenden Person. Steht in einem `address`-Element, denn dafür ist
 * es da; `not-italic` nimmt dem Block die kursive Voreinstellung des Browsers.
 */
export function Anschrift({ platzhalter }: { platzhalter: (feld: BetreiberFeld) => string }) {
  return (
    <address className="flex flex-col gap-0.5 text-sm leading-relaxed not-italic">
      <span className="font-semibold">
        <Angabe feld="name" platzhalter={platzhalter} />
      </span>
      <span>
        <Angabe feld="strasse" platzhalter={platzhalter} />
      </span>
      <span>
        <Angabe feld="ort" platzhalter={platzhalter} />
      </span>
    </address>
  );
}
