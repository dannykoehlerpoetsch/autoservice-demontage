import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { OPERATOR_DETAILS, type OperatorField } from '../legal/operator';
import de from '../../../messages/de.json';
import en from '../../../messages/en.json';

/**
 * The translations are the content of this website – and the only place the brand stands. Checked is
 * therefore the structure, not the single case: which keys do both languages have? Where do
 * interpolations drift apart? Which namespace is no longer read (an earlier rework otherwise leaves
 * text corpses behind)? And where stand data a fictional business cannot have: addresses, phone,
 * email or map links?
 */

const BRAND = 'Autoservice Demontage';

/** Key tree as a flat path list; arrays count with an index so lengths are carried along. */
function formKey(value: unknown, pathname = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => formKey(entry, `${pathname}[${index}]`));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([name, childValue]) =>
      formKey(childValue, pathname ? `${pathname}.${name}` : name)
    );
  }

  return [pathname];
}

/** All `{placeholder}` slots of one language tree, grouped by key. */
function interpolation(value: unknown, pathname = '', acc: Record<string, string[]> = {}) {
  if (typeof value === 'string') {
    const foundPlaceholders = value.match(/\{[a-zA-Z][\w]*\}/g);
    if (foundPlaceholders) {
      acc[pathname] = foundPlaceholders.sort();
    }
    return acc;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => interpolation(entry, `${pathname}[${index}]`, acc));
    return acc;
  }

  if (value && typeof value === 'object') {
    for (const [name, childValue] of Object.entries(value as Record<string, unknown>)) {
      interpolation(childValue, pathname ? `${pathname}.${name}` : name, acc);
    }
  }

  return acc;
}

/** Every text value of one language tree. */
function texts(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(texts);
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(texts);
  }

  return [];
}

describe('Translations – parity between German and English', () => {
  it('both languages know the same keys', () => {
    expect(formKey(en).sort()).toEqual(formKey(de).sort());
  });

  it('assume the same interpolation placeholders', () => {
    expect(interpolation(en)).toEqual(interpolation(de));
  });

  it('leave no value empty', () => {
    for (const text of [...texts(de), ...texts(en)]) {
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('Translations – brand without invented business data', () => {
  it('is named the same in both languages and is not translated', () => {
    for (const messages of [de, en]) {
      expect(messages.Home.hero.title).toBe(BRAND);
      expect(messages.Header.logoAlt).toContain(BRAND);
      expect(messages.DemoBanner.text).toContain(BRAND);
      expect(messages.Metadata.title).toContain(BRAND);
      expect(messages.DemoEmail.from.startsWith(BRAND)).toBe(true);
    }
  });

  it('says in both languages that appointments and emails are demo only', () => {
    expect(de.DemoBanner.text).toContain('keine echten Termine');
    expect(en.DemoBanner.text).toContain('No real appointments');
    expect(de.DemoFlow.note).toContain('weder echte Termine');
    expect(en.DemoFlow.note).toContain('No real appointments');
  });

  it('shows no address, phone, email address or map', () => {
    const suspiciousPatterns = [/tel:/i, /mailto:/i, /maps\.google/i, /google\.com\/maps/i];

    for (const text of [...texts(de), ...texts(en)]) {
      for (const pattern of suspiciousPatterns) {
        expect(text, text).not.toMatch(pattern);
      }
    }
  });

  it('no longer hides location or contact fields in the key tree', () => {
    // A legal notice may carry an address (as placeholder); the hero section may not.
    expect(Object.keys(de.Home.hero)).not.toContain('address');
    expect(Object.keys(en.Home.hero)).not.toContain('address');

    const orphanedKeys = [/callButton/i, /iframe/i, /planRoute/i, /hideMap/i, /navAnfahrt/i];

    for (const pathname of [...formKey(de), ...formKey(en)]) {
      for (const pattern of orphanedKeys) {
        expect(pathname, pathname).not.toMatch(pattern);
      }
    }
  });

  it('signs the email preview with the brand and without a business address', () => {
    for (const messages of [de, en]) {
      expect(messages.DemoEmail.signature.startsWith(BRAND)).toBe(true);
      // An address would need a house number or a postal code – both are missing.
      expect(messages.DemoEmail.signature).not.toMatch(/\d{4,}/);
    }
  });

  it('keeps placeholders in the legal notice and privacy policy instead of inventing data', () => {
    for (const messages of [de, en]) {
      // Both pages work with the same bracketed placeholder template.
      expect(messages.Impressum.platzhalter).toContain('[');
      expect(messages.Datenschutz.platzhalter).toContain('[');
      expect(messages.Impressum.platzhalter).toContain('{feld}');
      expect(messages.Datenschutz.platzhalter).toContain('{feld}');

      // The old sample details are gone – also as a remainder inside another text.
      const alle = [...texts(messages.Impressum), ...texts(messages.Datenschutz)].join(' ');
      for (const pattern of [/Max Mustermann/i, /Musterstra/i, /Musterstadt/i]) {
        expect(alle, pattern.toString()).not.toMatch(pattern);
      }
    }
  });

  it('cites the Digitale-Dienste-Gesetz instead of the repealed TMG', () => {
    for (const messages of [de, en]) {
      const alle = [...texts(messages.Impressum), ...texts(messages.Datenschutz)].join(' ');
      // A paragraph reference to the TMG would be wrong: §§ 7 to 10 TMG have no successor inside the DDG
      // for a page without third-party content. The explanation that the TMG was repealed
      // may name it – just not as a paragraph citation nearby.
      const oldTmgPattern = /(§{1,2} ?\d+[^.,;\n]{0,25}TMG)|(TMG[^.,;\n]{0,12}§ ?\d+)/;
      expect(alle, alle).not.toMatch(oldTmgPattern);
    }
  });

  it('explains the privacy policy along the actual technology', () => {
    for (const messages of [de, en]) {
      const alle = texts(messages.Datenschutz).join(' ');

      /**
       * The translations are the content of this website – and the only place the brand stands. Checked is
       * therefore the structure, not the single case: which keys do both languages have? Where do
       * interpolations drift apart? Which namespace is no longer read (an earlier rework otherwise leaves
       * text corpses behind)? And where stand data a fictional business cannot have: addresses, phone,
       * email or map links?
       */
      for (const term of ['Vercel', 'NEXT_LOCALE', 'theme', 'Art. 6', 'Art. 77']) {
        expect(alle, term).toContain(term);
      }

      // … and what it does not use may not be claimed or stay as an old burden.
      for (const pattern of [/google.?maps/i, /Datenbank/i, /verschlüsselt/i, /Cookie-Banner/i]) {
        expect(alle, pattern.toString()).not.toMatch(pattern);
      }

      // No blanket statement that no personal data is collected at all.
      expect(alle).not.toMatch(/keinerlei personenbezogene Daten/i);
      expect(alle).not.toMatch(/without any personal data/i);
    }
  });

  it('has a field for every operator detail in both languages', () => {
    const fieldTexts = Object.keys(OPERATOR_DETAILS) as OperatorField[];

    for (const messages of [de, en]) {
      // The legal notice knows every field of the configuration, including the optional ones.
      for (const field of fieldTexts) {
        expect(messages.Impressum.felder[field], field).toBeTruthy();
      }

      // For the privacy policy, name, address and email address suffice.
      for (const field of ['name', 'strasse', 'ort', 'email'] as const) {
        expect(messages.Datenschutz.felder[field], field).toBeTruthy();
      }

      // The placeholder texts of both pages are templates with the field name, not fixed values.
      for (const namespace of ['Impressum', 'Datenschutz'] as const) {
        expect(messages[namespace].platzhalter, namespace).toContain('{feld}');
      }
    }

    // The configuration carries real details – so what is checked is the shape, not the content:
    // no value with surrounding whitespace, and the email address is an address.
    for (const field of Object.keys(OPERATOR_DETAILS) as OperatorField[]) {
      const value = OPERATOR_DETAILS[field];

      expect(value, field).toBe(value.trim());
    }

    const email = OPERATOR_DETAILS.email.trim();

    if (email !== '') {
      expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/);
    }
  });

  it('shows visitors no file paths, counters or checkpoints', () => {
    for (const messages of [de, en]) {
      const publicPages = [...texts(messages.Impressum), ...texts(messages.Datenschutz)];

      for (const text of publicPages) {
        // Open points and internal paths do not belong into the texts of the pages.
        expect(text, text).not.toMatch(/src\/(lib|app|components)|operator\.ts|docs\/[A-Z_]+/);
        expect(text, text).not.toMatch(/\.tsx?\b/);
        expect(text, text).not.toMatch(/veröffentlichungsfertig|publish[- ]?ready/i);
        expect(text, text).not.toMatch(/Noch zu prüfen|to be checked|\{anzahl\}/i);
      }
    }
  });

  it('no longer references the old project or Vercel URL in any text', () => {
    const pattern = [/bennis/i, /bennis-garage\.vercel\.app/i, /dannykoehlerpoetsch\.github\.io/i];

    for (const text of [...texts(de), ...texts(en)]) {
      for (const regex of pattern) {
        expect(text, text).not.toMatch(regex);
      }
    }
  });
});

describe('Translations – no dead key, no dead anchor', () => {
  const sourceText = (relativ: string) =>
    fs.readFileSync(path.resolve(process.cwd(), relativ), 'utf8');

  const sourceCode = (() => {
    const files: string[] = [];

    const walkthrough = (ordner: string) => {
      for (const entry of fs.readdirSync(ordner, { withFileTypes: true })) {
        const pathname = path.join(ordner, entry.name);

        if (entry.isDirectory()) {
          if (entry.name !== '__tests__') {
            walkthrough(pathname);
          }
        } else if (/\.tsx?$/.test(entry.name)) {
          files.push(pathname);
        }
      }
    };

    walkthrough(path.resolve(process.cwd(), 'src'));

    return files.map((pathname) => fs.readFileSync(pathname, 'utf8')).join('\n');
  })();

  it('actually reads every namespace', () => {
    for (const namespace of Object.keys(de)) {
      const apostrophe = String.fromCharCode(39);
      const backtick = String.fromCharCode(96);
      // "Read" means: the namespace appears as 'Ns' or as the start of an
      // absolute key in some source file.
      const expectedLines = [
        apostrophe + namespace + apostrophe,
        apostrophe + namespace + '.',
        backtick + namespace + '.',
      ].some((variant) => sourceCode.includes(variant));

      expect(expectedLines, `namespace ${namespace} is never read`).toBe(true);
    }
  });

  it('every navigation anchor hits a section on the homepage', () => {
    const anchors = [...sourceText('src/components/Header.tsx').matchAll(/#([a-z][a-z-]*)/g)].map(
      (match) => match[1]
    );
    const homePage = [
      sourceText('src/app/[locale]/page.tsx'),
      sourceText('src/components/PageSkeleton.tsx'),
    ].join('\n');
    const declaredIds = [...homePage.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);

    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) {
      expect(declaredIds, `#${anchor} missing on the homepage`).toContain(anchor);
    }
  });

  it('does not point the navigation at a removed section', () => {
    const navLinks = [...sourceText('src/components/Header.tsx').matchAll(/href: '([^']+)'/g)].map(
      (match) => match[1]
    );

    expect(navLinks).toEqual(['/', '/#services', '/#demo']);
  });
});
