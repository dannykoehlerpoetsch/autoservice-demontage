import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { makeTranslator } from '@/test-utils';

/**
 * Impressum und Datenschutzerklärung als Server Components.
 *
 * Die Browser-Specs (e2e/legal.spec.ts) prüfen die ausgelieferten Seiten; hier läuft derselbe
 * Code in jsdom, weil nur so der Zustand nach dem Eintragen echter Angaben messbar ist. Die
 * Übersetzungen kommen aus den echten `messages/*.json`.
 */

async function texteFür(locale: string) {
  return locale === 'en'
    ? ((await import('../../../messages/en.json')).default as Record<string, unknown>)
    : ((await import('../../../messages/de.json')).default as Record<string, unknown>);
}

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async (options?: { locale?: string; namespace?: string }) => {
    const texte = await texteFür(options?.locale ?? 'de');

    return makeTranslator(texte, options?.namespace ?? '');
  }),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  getPathname: vi.fn(({ locale, href }: { locale: string; href: string }) =>
    locale === 'de' ? href : `/${locale}${href}`
  ),
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

import Impressum, {
  generateMetadata as impressumMetadaten,
} from '../../app/[locale]/impressum/page';
import Datenschutz, {
  generateMetadata as datenschutzMetadaten,
} from '../../app/[locale]/datenschutz/page';
import { BETREIBER, type BetreiberFeld } from '@/lib/legal/operator';
import { PRODUKTIONS_URL, SITE_URL } from '@/lib/site';
import de from '../../../messages/de.json';
import en from '../../../messages/en.json';

const FELDER: BetreiberFeld[] = ['name', 'strasse', 'ort', 'email', 'telefon', 'ustIdNr'];
const PLATZHALTER = '[noch eintragen:';

// Kunstwerte einer Testdatei – kein Name, keine Anschrift, keine echte Adresse.
const TEST_WERTE: Partial<Record<BetreiberFeld, string>> = {
  name: 'Erika Beispiel',
  strasse: 'Beispielweg 1',
  ort: '12345 Beispielstadt',
  email: 'kontakt@beispiel.example',
};

const parameter = (locale: string) => Promise.resolve({ locale });

function fullllen(werte: Partial<Record<BetreiberFeld, string>>) {
  Object.assign(BETREIBER, werte);
}

afterEach(() => {
  for (const feld of FELDER) {
    BETREIBER[feld] = '';
  }
});

// Jede Pruefung beginnt bei leeren Feldern, egal was in der Datei steht; nach dem Lauf gilt
// wieder der Stand der Datei.
const AUSGANGSSTAND: Record<BetreiberFeld, string> = { ...BETREIBER };

beforeEach(() => {
  for (const feld of FELDER) {
    BETREIBER[feld] = '';
  }
});

afterAll(() => {
  Object.assign(BETREIBER, AUSGANGSSTAND);
});

describe('Impressum', () => {
  it('nennt Hinweis, Anschrift und Kontakt – sonst nichts', async () => {
    const { container } = render(<>{await Impressum({ params: parameter('de') })}</>);

    expect(screen.getByRole('heading', { level: 1, name: de.Impressum.title })).toBeInTheDocument();
    expect(screen.getByText(de.Impressum.fictionalNotice)).toBeInTheDocument();

    expect(container.querySelector('address')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: de.Impressum.anbieter.heading }));
    expect(screen.getByRole('heading', { level: 2, name: de.Impressum.kontakt.heading }));

    // Nur die beiden Abschnitte, die zur Anschrift und zum Kontakt gehören.
    expect(container.querySelectorAll('h2')).toHaveLength(2);
  });

  it('zeigt die fehlenden Angaben als Platzhalter, nicht als Daten', async () => {
    const { container } = render(<>{await Impressum({ params: parameter('de') })}</>);

    const frei = container.querySelectorAll('[data-rechts-platzhalter="true"]');

    expect(frei).toHaveLength(4);
    for (const element of Array.from(frei)) {
      expect(element.textContent?.startsWith(PLATZHALTER)).toBe(true);
    }

    // Freiwillige Angaben erscheinen erst mit Wert.
    const text = document.body.textContent ?? '';
    expect(text).not.toContain(de.Impressum.felder.telefon);
    expect(text).not.toContain(de.Impressum.felder.ustIdNr);
    expect(container.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]')).toHaveLength(0);
  });

  it('hält Entwicklerhinweise und Prüfpunkte aus der Seite heraus', async () => {
    render(<>{await Impressum({ params: parameter('de') })}</>);

    const text = document.body.textContent ?? '';

    expect(text).not.toMatch(/src\/|operator\.ts|\.tsx?\b|docs\/[A-Z_]+/);
    expect(text).not.toMatch(/veröffentlichungsfertig|Noch zu prüfen/i);
  });

  it('tauscht die Platzhalter gegen die eingetragenen Werte', async () => {
    fullllen(TEST_WERTE);

    const { container } = render(<>{await Impressum({ params: parameter('de') })}</>);

    expect(screen.getByText('Erika Beispiel')).toBeInTheDocument();
    expect(screen.getByText('Beispielweg 1')).toBeInTheDocument();
    expect(screen.getByText('12345 Beispielstadt')).toBeInTheDocument();
    expect(screen.getByText('kontakt@beispiel.example')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-rechts-platzhalter="true"]')).toHaveLength(0);
  });

  it('zeigt eine freiwillige Angabe, sobald sie eingetragen ist', async () => {
    fullllen({ ...TEST_WERTE, telefon: '+49 30 1234567', ustIdNr: 'DE123456789' });

    render(<>{await Impressum({ params: parameter('de') })}</>);

    expect(screen.getByText('+49 30 1234567')).toBeInTheDocument();
    expect(screen.getByText('DE123456789')).toBeInTheDocument();
    expect(screen.getByText(`${de.Impressum.felder.telefon}:`)).toBeInTheDocument();
  });

  it('bleibt auf Englisch bei derselben Struktur', async () => {
    const { container } = render(<>{await Impressum({ params: parameter('en') })}</>);

    expect(screen.getByRole('heading', { level: 1, name: en.Impressum.title })).toBeInTheDocument();

    const frei = container.querySelectorAll('[data-rechts-platzhalter="true"]');
    expect(frei).toHaveLength(4);
    expect(frei[0].textContent?.startsWith('[to be added:')).toBe(true);
  });

  it('stellt Metadaten aus Titel, Canonical und Nichtindexierung zusammen', async () => {
    const metadaten = await impressumMetadaten({ params: parameter('de') });

    expect(metadaten.title).toBe(de.Impressum.title);
    expect(metadaten.alternates?.canonical).toBe('/impressum');
    expect(new URL(String(metadaten.alternates?.canonical), SITE_URL).toString()).toBe(
      `${PRODUKTIONS_URL}/impressum`
    );
    expect(metadaten.robots).toMatchObject({ index: false, follow: false });
  });
});

describe('Datenschutzerklärung', () => {
  it('beschreibtHosting, Cookie, lokale Speicherung und die Anfrage', async () => {
    render(<>{await Datenschutz({ params: parameter('de') })}</>);

    const text = document.body.textContent ?? '';

    for (const begriff of ['Vercel', 'NEXT_LOCALE', 'theme', 'Art. 6', 'Art. 77', 'DSGVO']) {
      expect(text, begriff).toContain(begriff);
    }

    expect(text).not.toMatch(/Google Maps|Cookie-Banner|keinerlei personenbezogene/i);
    expect(text).not.toMatch(/src\/|operator\.ts|Noch zu prüfen/i);
  });

  it('führt die Abschnitte in Reihenfolge und nennt alle sechs Rechte', async () => {
    const { container } = render(<>{await Datenschutz({ params: parameter('de') })}</>);

    const ueberschriften = Array.from(container.querySelectorAll('h2')).map(
      (element) => element.textContent
    );

    expect(ueberschriften).toEqual([
      de.Datenschutz.verantwortlich.heading,
      de.Datenschutz.hosting.heading,
      de.Datenschutz.darstellung.heading,
      de.Datenschutz.anfrage.heading,
      de.Datenschutz.rechte.heading,
    ]);

    expect(container.querySelectorAll('ul li')).toHaveLength(de.Datenschutz.rechte.items.length);
  });

  it('nennt die verantwortliche Person erst mit Wert, sonst als Platzhalter', async () => {
    const { container } = render(<>{await Datenschutz({ params: parameter('de') })}</>);

    expect(container.querySelector('address')).not.toBeNull();
    expect(container.querySelectorAll('[data-rechts-platzhalter="true"]')).toHaveLength(4);

    fullllen(TEST_WERTE);
    const gefuellt = render(<>{await Datenschutz({ params: parameter('de') })}</>);

    expect(gefuellt.container.querySelectorAll('[data-rechts-platzhalter="true"]')).toHaveLength(0);
    expect(gefuellt.getAllByText('Erika Beispiel').length).toBeGreaterThan(0);
  });

  it('stellt Metadaten für die englische Seite zusammen', async () => {
    const metadaten = await datenschutzMetadaten({ params: parameter('en') });

    expect(metadaten.title).toBe(en.Datenschutz.title);
    expect(metadaten.alternates?.canonical).toBe('/en/datenschutz');
    expect(metadaten.robots).toMatchObject({ index: false, follow: false });
  });
});
