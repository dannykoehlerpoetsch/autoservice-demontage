import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { makeTranslator } from '@/test-utils';

/**
 * Legal notice and privacy policy as server components.
 *
 * The browser specs (e2e/legal.spec.ts) check the delivered pages; here the same code runs in jsdom,
 * because only then the state after entering real details is measurable. The translations come from
 * the real `messages/*.json`.
 */

async function textForField(locale: string) {
  return locale === 'en'
    ? ((await import('../../../messages/en.json')).default as Record<string, unknown>)
    : ((await import('../../../messages/de.json')).default as Record<string, unknown>);
}

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async (options?: { locale?: string; namespace?: string }) => {
    const texts = await textForField(options?.locale ?? 'de');

    return makeTranslator(texts, options?.namespace ?? '');
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

import LegalNoticePage, {
  generateMetadata as legalNoticeMetadata,
} from '../../app/[locale]/impressum/page';
import PrivacyPolicyPage, {
  generateMetadata as privacyPolicyMetadata,
} from '../../app/[locale]/datenschutz/page';
import { OPERATOR_DETAILS, type OperatorField } from '@/lib/legal/operator';
import { PRODUCTION_URL, SITE_URL } from '@/lib/site';
import de from '../../../messages/de.json';
import en from '../../../messages/en.json';

const FIELD_LABELS: OperatorField[] = ['name', 'strasse', 'ort', 'email', 'telefon', 'ustIdNr'];
const PLACEHOLDER_MARKUP = '[noch eintragen:';

// Artificial values of a test file – no name, no address, no real URL.
const TEST_OPERATOR_VALUES: Partial<Record<OperatorField, string>> = {
  name: 'Erika Beispiel',
  strasse: 'Beispielweg 1',
  ort: '12345 Beispielstadt',
  email: 'kontakt@beispiel.example',
};

const parameter = (locale: string) => Promise.resolve({ locale });

function fillOperator(values: Partial<Record<OperatorField, string>>) {
  Object.assign(OPERATOR_DETAILS, values);
}

afterEach(() => {
  for (const field of FIELD_LABELS) {
    OPERATOR_DETAILS[field] = '';
  }
});

// Every check starts from empty fields, whatever stands in the file; after the run
// the file's state applies again.
const ORIGINAL_OPERATOR: Record<OperatorField, string> = { ...OPERATOR_DETAILS };

beforeEach(() => {
  for (const field of FIELD_LABELS) {
    OPERATOR_DETAILS[field] = '';
  }
});

afterAll(() => {
  Object.assign(OPERATOR_DETAILS, ORIGINAL_OPERATOR);
});

describe('Legal notice', () => {
  it('names the notice, address and contact – nothing else', async () => {
    const { container } = render(<>{await LegalNoticePage({ params: parameter('de') })}</>);

    expect(screen.getByRole('heading', { level: 1, name: de.Impressum.title })).toBeInTheDocument();
    expect(screen.getByText(de.Impressum.fictionalNotice)).toBeInTheDocument();

    expect(container.querySelector('address')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: de.Impressum.anbieter.heading }));
    expect(screen.getByRole('heading', { level: 2, name: de.Impressum.kontakt.heading }));

    // Only the two sections that belong to the address and to the contact.
    expect(container.querySelectorAll('h2')).toHaveLength(2);
  });

  it('shows the missing details as placeholders, not as data', async () => {
    const { container } = render(<>{await LegalNoticePage({ params: parameter('de') })}</>);

    const placeholders = container.querySelectorAll('[data-rechts-platzhalter="true"]');

    expect(placeholders).toHaveLength(4);
    for (const element of Array.from(placeholders)) {
      expect(element.textContent?.startsWith(PLACEHOLDER_MARKUP)).toBe(true);
    }

    // Optional details appear only with a value.
    const text = document.body.textContent ?? '';
    expect(text).not.toContain(de.Impressum.felder.telefon);
    expect(text).not.toContain(de.Impressum.felder.ustIdNr);
    expect(container.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]')).toHaveLength(0);
  });

  it('keeps developer hints and checkpoints out of the page', async () => {
    render(<>{await LegalNoticePage({ params: parameter('de') })}</>);

    const text = document.body.textContent ?? '';

    expect(text).not.toMatch(/src\/|operator\.ts|\.tsx?\b|docs\/[A-Z_]+/);
    expect(text).not.toMatch(/veröffentlichungsfertig|Noch zu prüfen/i);
  });

  it('swaps the placeholders for the entered values', async () => {
    fillOperator(TEST_OPERATOR_VALUES);

    const { container } = render(<>{await LegalNoticePage({ params: parameter('de') })}</>);

    expect(screen.getByText('Erika Beispiel')).toBeInTheDocument();
    expect(screen.getByText('Beispielweg 1')).toBeInTheDocument();
    expect(screen.getByText('12345 Beispielstadt')).toBeInTheDocument();
    expect(screen.getByText('kontakt@beispiel.example')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-rechts-platzhalter="true"]')).toHaveLength(0);
  });

  it('shows an optional detail once it is entered', async () => {
    fillOperator({ ...TEST_OPERATOR_VALUES, telefon: '+49 30 1234567', ustIdNr: 'DE123456789' });

    render(<>{await LegalNoticePage({ params: parameter('de') })}</>);

    expect(screen.getByText('+49 30 1234567')).toBeInTheDocument();
    expect(screen.getByText('DE123456789')).toBeInTheDocument();
    expect(screen.getByText(`${de.Impressum.felder.telefon}:`)).toBeInTheDocument();
  });

  it('stays in English with the same structure', async () => {
    const { container } = render(<>{await LegalNoticePage({ params: parameter('en') })}</>);

    expect(screen.getByRole('heading', { level: 1, name: en.Impressum.title })).toBeInTheDocument();

    const placeholders = container.querySelectorAll('[data-rechts-platzhalter="true"]');
    expect(placeholders).toHaveLength(4);
    expect(placeholders[0].textContent?.startsWith('[to be added:')).toBe(true);
  });

  it('assembles metadata from title, canonical and indexing', async () => {
    const metadata = await legalNoticeMetadata({ params: parameter('de') });

    expect(metadata.title).toBe(de.Impressum.title);
    expect(metadata.alternates?.canonical).toBe('/impressum');
    expect(new URL(String(metadata.alternates?.canonical), SITE_URL).toString()).toBe(
      `${PRODUCTION_URL}/impressum`
    );
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.alternates?.languages).toEqual({
      de: '/impressum',
      en: '/en/impressum',
      'x-default': '/impressum',
    });
  });
});

describe('Privacy policy', () => {
  it('describes hosting, cookies, local storage and the request', async () => {
    render(<>{await PrivacyPolicyPage({ params: parameter('de') })}</>);

    const text = document.body.textContent ?? '';

    for (const term of ['Vercel', 'NEXT_LOCALE', 'theme', 'Art. 6', 'Art. 77', 'DSGVO']) {
      expect(text, term).toContain(term);
    }

    expect(text).not.toMatch(/Google Maps|Cookie-Banner|keinerlei personenbezogene/i);
    expect(text).not.toMatch(/src\/|operator\.ts|Noch zu prüfen/i);
  });

  it('lists the sections in order and names all six rights', async () => {
    const { container } = render(<>{await PrivacyPolicyPage({ params: parameter('de') })}</>);

    const headings = Array.from(container.querySelectorAll('h2')).map(
      (element) => element.textContent
    );

    expect(headings).toEqual([
      de.Datenschutz.verantwortlich.heading,
      de.Datenschutz.hosting.heading,
      de.Datenschutz.darstellung.heading,
      de.Datenschutz.anfrage.heading,
      de.Datenschutz.rechte.heading,
    ]);

    expect(container.querySelectorAll('ul li')).toHaveLength(de.Datenschutz.rechte.items.length);
  });

  it('names the responsible person only with a value, otherwise as a placeholder', async () => {
    const { container } = render(<>{await PrivacyPolicyPage({ params: parameter('de') })}</>);

    expect(container.querySelector('address')).not.toBeNull();
    expect(container.querySelectorAll('[data-rechts-platzhalter="true"]')).toHaveLength(4);

    fillOperator(TEST_OPERATOR_VALUES);
    const filled = render(<>{await PrivacyPolicyPage({ params: parameter('de') })}</>);

    expect(filled.container.querySelectorAll('[data-rechts-platzhalter="true"]')).toHaveLength(0);
    expect(filled.getAllByText('Erika Beispiel').length).toBeGreaterThan(0);
  });

  it('assembles metadata for the English page', async () => {
    const metadata = await privacyPolicyMetadata({ params: parameter('en') });

    expect(metadata.title).toBe(en.Datenschutz.title);
    expect(metadata.alternates?.canonical).toBe('/en/datenschutz');
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.alternates?.languages).toEqual({
      de: '/datenschutz',
      en: '/en/datenschutz',
      'x-default': '/datenschutz',
    });
  });
});
