import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import de from '../../../messages/de.json';
import en from '../../../messages/en.json';

/**
 * Die Übersetzungen sind der Inhalt dieser Website – und der einzige Ort, an dem die Marke
 * steht. Geprüft wird deshalb die Struktur, nicht der Einzelfall: Welche Schlüssel haben beide
 * Sprachen? Wo laufen Interpolationen auseinander? Welche Namespace wird gar nicht mehr gelesen
 * (ein früherer Umbau hinterlässt sonst Textleichen)? Und wo stehen Daten, die ein fiktiver
 * Betrieb nicht haben darf: Anschriften, Telefon-, Mail- oder Maps-Zugänge?
 */

const MARKE = 'Autoservice Demontage';

/** Schlüsselbaum als flache Pfadliste; Arrays zählen mit Index, damit Längen mitgezogen werden. */
function schluessel(wert: unknown, pfad = ''): string[] {
  if (Array.isArray(wert)) {
    return wert.flatMap((eintrag, index) => schluessel(eintrag, `${pfad}[${index}]`));
  }

  if (wert && typeof wert === 'object') {
    return Object.entries(wert as Record<string, unknown>).flatMap(([name, unterwert]) =>
      schluessel(unterwert, pfad ? `${pfad}.${name}` : name)
    );
  }

  return [pfad];
}

/** Alle `{platzhalter}` eines Sprachbaums, gruppiert nach Schlüssel. */
function interpolation(wert: unknown, pfad = '', acc: Record<string, string[]> = {}) {
  if (typeof wert === 'string') {
    const gefunden = wert.match(/\{[a-zA-Z][\w]*\}/g);
    if (gefunden) {
      acc[pfad] = gefunden.sort();
    }
    return acc;
  }

  if (Array.isArray(wert)) {
    wert.forEach((eintrag, index) => interpolation(eintrag, `${pfad}[${index}]`, acc));
    return acc;
  }

  if (wert && typeof wert === 'object') {
    for (const [name, unterwert] of Object.entries(wert as Record<string, unknown>)) {
      interpolation(unterwert, pfad ? `${pfad}.${name}` : name, acc);
    }
  }

  return acc;
}

/** Sämtliche Textwerte eines Sprachbaums. */
function texte(wert: unknown): string[] {
  if (typeof wert === 'string') {
    return [wert];
  }

  if (Array.isArray(wert)) {
    return wert.flatMap(texte);
  }

  if (wert && typeof wert === 'object') {
    return Object.values(wert as Record<string, unknown>).flatMap(texte);
  }

  return [];
}

describe('Übersetzungen – Gleichstand zwischen Deutsch und Englisch', () => {
  it('kennen beide Sprachen dieselben Schlüssel', () => {
    expect(schluessel(en).sort()).toEqual(schluessel(de).sort());
  });

  it('setzen dieselben Interpolationsplätze voraus', () => {
    expect(interpolation(en)).toEqual(interpolation(de));
  });

  it('lassen keinen Wert leer', () => {
    for (const text of [...texte(de), ...texte(en)]) {
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('Übersetzungen – Marke ohne erfundene Geschäftsdaten', () => {
  it('heißt in beiden Sprachen gleich und wird nicht übersetzt', () => {
    for (const nachrichten of [de, en]) {
      expect(nachrichten.Home.hero.title).toBe(MARKE);
      expect(nachrichten.Header.logoAlt).toContain(MARKE);
      expect(nachrichten.DemoBanner.text).toContain(MARKE);
      expect(nachrichten.Metadata.title).toContain(MARKE);
      expect(nachrichten.DemoEmail.from.startsWith(MARKE)).toBe(true);
    }
  });

  it('sagt in beiden Sprachen, dass Termine und Mails nur Demo sind', () => {
    expect(de.DemoBanner.text).toContain('keine echten Termine');
    expect(en.DemoBanner.text).toContain('No real appointments');
    expect(de.DemoFlow.note).toContain('weder echte Termine');
    expect(en.DemoFlow.note).toContain('No real appointments');
  });

  it('führt keine Anschrift, kein Telefon, keine Mail-Adresse und keine Karte', () => {
    const verdaechtig = [/tel:/i, /mailto:/i, /maps\.google/i, /google\.com\/maps/i];

    for (const text of [...texte(de), ...texte(en)]) {
      for (const muster of verdaechtig) {
        expect(text, text).not.toMatch(muster);
      }
    }
  });

  it('versteckt keine Standort- oder Kontaktfelder mehr im Schlüsselbaum', () => {
    // Ein Impressum darf eine Anschrift haben (Platzhalter); die Hero-Sektion nicht.
    expect(Object.keys(de.Home.hero)).not.toContain('address');
    expect(Object.keys(en.Home.hero)).not.toContain('address');

    const verwaisteFelder = [/callButton/i, /iframe/i, /planRoute/i, /hideMap/i, /navAnfahrt/i];

    for (const pfad of [...schluessel(de), ...schluessel(en)]) {
      for (const muster of verwaisteFelder) {
        expect(pfad, pfad).not.toMatch(muster);
      }
    }
  });

  it('signiert die E-Mail-Vorschau mit der Marke und ohne Geschäftsanschrift', () => {
    for (const nachrichten of [de, en]) {
      expect(nachrichten.DemoEmail.signature.startsWith(MARKE)).toBe(true);
      // Eine Anschrift würde eine Hausnummer oder eine Postleitzahl brauchen – beides fehlt.
      expect(nachrichten.DemoEmail.signature).not.toMatch(/\d{4,}/);
    }
  });

  it('lässt das Impressum bei Platzhaltern, statt Daten zu erfinden', () => {
    for (const nachrichten of [de, en]) {
      for (const abschnitt of [
        nachrichten.Impressum.address,
        nachrichten.Impressum.contact,
        nachrichten.Impressum.vat,
        nachrichten.Impressum.profession,
      ]) {
        expect(texte(abschnitt).join(' ')).toContain('[');
      }
    }
  });
});

describe('Übersetzungen – kein toter Schlüssel, kein toter Anker', () => {
  const quelltext = (relativ: string) =>
    fs.readFileSync(path.resolve(process.cwd(), relativ), 'utf8');

  const quellcode = (() => {
    const dateien: string[] = [];

    const durchlauf = (ordner: string) => {
      for (const eintrag of fs.readdirSync(ordner, { withFileTypes: true })) {
        const pfad = path.join(ordner, eintrag.name);

        if (eintrag.isDirectory()) {
          if (eintrag.name !== '__tests__') {
            durchlauf(pfad);
          }
        } else if (/\.tsx?$/.test(eintrag.name)) {
          dateien.push(pfad);
        }
      }
    };

    durchlauf(path.resolve(process.cwd(), 'src'));

    return dateien.map((pfad) => fs.readFileSync(pfad, 'utf8')).join('\n');
  })();

  it('liest jeden Namespace auch wirklich', () => {
    for (const namespace of Object.keys(de)) {
      const zitat = String.fromCharCode(39);
      const backtick = String.fromCharCode(96);
      // Gelesen heißt: der Namespace taucht als 'Ns' oder als Anfang eines
      // absoluten Schlüssels in irgendeiner Quelldatei auf.
      const gelesen = [
        zitat + namespace + zitat,
        zitat + namespace + '.',
        backtick + namespace + '.',
      ].some((variante) => quellcode.includes(variante));

      expect(gelesen, `Namespace ${namespace} wird nicht gelesen`).toBe(true);
    }
  });

  it('trifft jeder Navigationsanker eine Sektion auf der Startseite', () => {
    const anker = [...quelltext('src/components/Header.tsx').matchAll(/#([a-z][a-z-]*)/g)].map(
      (treffer) => treffer[1]
    );
    const startseite = [
      quelltext('src/app/[locale]/page.tsx'),
      quelltext('src/components/PageSkeleton.tsx'),
    ].join('\n');
    const gesetzteIds = [...startseite.matchAll(/id="([^"]+)"/g)].map((treffer) => treffer[1]);

    expect(anker.length).toBeGreaterThan(0);
    for (const einAnker of anker) {
      expect(gesetzteIds, `#${einAnker} fehlt auf der Startseite`).toContain(einAnker);
    }
  });

  it('verweist die Navigation nicht auf eine entfernte Sektion', () => {
    const navLinks = [...quelltext('src/components/Header.tsx').matchAll(/href: '([^']+)'/g)].map(
      (treffer) => treffer[1]
    );

    expect(navLinks).toEqual(['/', '/#services', '/#demo']);
  });
});
