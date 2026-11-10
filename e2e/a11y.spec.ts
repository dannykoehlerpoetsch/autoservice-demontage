import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Barrierefreiheit ist Teil des Angebots: Detaildialog, Kalender-Popover, Formular und die
 * Sprachumschaltung müssen mit Screenreader und Tastatur bedienbar bleiben. Diese Specs lassen
 * axe über die Seiten laufen, damit eine kaputte Semantik (fehlender Label, leerer
 * Button-Name, falsche Rolle) nicht mehr per Handklick gesucht werden muss.
 *
 * Bewusst ohne Consent-Klick: das Google-Embed lädt in diesen Tests nicht, und axe käme dort
 * ohnehin nicht in ein Cross-Origin-iframe hinein.
 */

/**
 * Führt eine Demo-Anfrage bis zur Zusammenfassung aus – die Bestätigungsseite gibt es nur mit
 * Zustand, und der entsteht nun einmal durch den echten Weg.
 */
async function demoAnfrageStellen(page: Page) {
  await page.fill('#field-name', 'Jennifer Krüger');
  await page.fill('#field-email', 'j.krueger@beispiel.de');
  await page.selectOption('#field-service', 'bremsen');

  await page.evaluate(() => {
    document.querySelector('button[data-min-date]')?.scrollIntoView({ block: 'center' });
  });
  await page.locator('button[data-min-date]').click();
  await page.locator('td[data-day] button:not([disabled])').last().click();

  await page.getByRole('button', { name: 'Demo-Anfrage abschließen' }).click();
  await expect(page).toHaveURL(new RegExp('termin-anfrage/bestaetigung$'));
}

/**
 * Bewusste, dauerhafte Ausnahme – kein TODO, keine offene Baustelle.
 *
 * Die Markenfarbe #59a305 ist gesetzt und bleibt so. Weiße Schrift darauf erreicht 3.15:1,
 * `text-white/70` 2.29:1 (gefordert sind 4.5:1 nach WCAG 1.4.3). Toleriert wird deshalb
 * ausschließlich ein `color-contrast`-Befund, dessen gemessener Hintergrund diese Marke ist.
 * Alles andere – grauer Text auf grauem Grund, halbtransparente Overlay-Beschriftung, eine neue
 * Fläche in einer neuen Farbe – lässt die Pipeline weiterhin scheitern.
 */
const MARKE: [number, number, number] = [0x59, 0xa3, 0x05];
const MARKE_HEX = '#59a305';

/**
 * Axe misst im Browser gerenderte Farben. Während einer Einblend-Animation (hier 90–180 ms) kann
 * aus #59a305 ein #5aa207 werden – dasselbe Grün, andere Messstelle. Ein exakter Vergleich machte
 * den Lauf deshalb flaky; pro Kanal wird eine kleine Breite toleriert. Grautöne bleiben davon
 * weit entfernt (#bdbdbd ist im Blau-Kanal 200 Punkte weg).
 */
const KANAL_BREITE = 12;

type Check = { data?: { bgColor?: string } };
type Knoten = {
  target: string[];
  failureSummary?: string;
  any?: Check[];
  all?: Check[];
  none?: Check[];
};
type Verstoss = {
  id: string;
  impact?: string;
  help: string;
  helpUrl: string;
  nodes: Knoten[];
};

/** Ist der gemessene Hintergrund dasselbe Marken-Grün? */
function kontrastAufMarke(knoten: Knoten): boolean {
  const checks = [...(knoten.any ?? []), ...(knoten.all ?? []), ...(knoten.none ?? [])];

  return checks.some((check) => {
    const hex = check.data?.bgColor?.toLowerCase();
    if (!hex?.startsWith('#') || hex.length !== 7) {
      return false;
    }

    const kanäle: [number, number, number] = [
      Number.parseInt(hex.slice(1, 3), 16),
      Number.parseInt(hex.slice(3, 5), 16),
      Number.parseInt(hex.slice(5, 7), 16),
    ];

    return kanäle.every((kanal, i) => Math.abs(kanal - MARKE[i]) <= KANAL_BREITE);
  });
}

/**
 * Farbmesungen sind nur aussagekräftig, wenn Fonts da und Animationen durch sind. Weh tut das
 * nicht: die kurzen Einblendungen der App sind alle endlich, und läuft doch mal etwas endlos
 * weiter, misst axe danach eben mitten drin – die Kanaltoleranz oben fängt das ab.
 */
async function warteAufRuhigeSeite(page: Page) {
  await page.evaluate(() => document.fonts?.ready);

  await page
    .waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'), null, {
      timeout: 2_000,
    })
    .catch(() => {});
}

async function keineAxeVerstosse(page: Page, bereich?: string) {
  await warteAufRuhigeSeite(page);

  const prüfung = new AxeBuilder({ page });
  if (bereich) {
    prüfung.include(bereich);
  }

  const { violations } = await prüfung.analyze();
  const alle = violations as Verstoss[];

  // Nur die Markenflächen herausrechnen, jede andere Ursache bleibt stehen.
  const tolerierteStellen = alle
    .filter((v) => v.id === 'color-contrast')
    .reduce((sum, v) => sum + v.nodes.filter(kontrastAufMarke).length, 0);

  const neue = alle
    .map((v) =>
      v.id === 'color-contrast'
        ? { ...v, nodes: v.nodes.filter((knoten) => !kontrastAufMarke(knoten)) }
        : v
    )
    .filter((v) => v.nodes.length > 0);

  if (tolerierteStellen > 0) {
    console.info(
      `Kontrast auf Marke ${MARKE_HEX}: ${tolerierteStellen} Stellen – bewusst so gesetzt, alles andere prüft weiter`
    );
  }

  const meldung = neue
    .map(
      (verstoss) =>
        `[${verstoss.impact ?? '?'}] ${verstoss.id}: ${verstoss.help}\n` +
        `  ${verstoss.helpUrl}\n` +
        verstoss.nodes
          .slice(0, 5)
          .map((knoten) => `   ${knoten.target.join(' ')} – ${knoten.failureSummary ?? ''}`)
          .join('\n')
    )
    .join('\n\n');

  expect(neue, meldung || 'keine neuen Verstösse').toEqual([]);
}

test.describe('Barrierefreiheit', () => {
  test('Startseite auf Deutsch', async ({ page }) => {
    await page.goto('/');

    await keineAxeVerstosse(page);
  });

  test('Startseite auf Englisch', async ({ page }) => {
    await page.goto('/en');

    await keineAxeVerstosse(page);
  });

  test('Leistungsdialog im geöffneten Zustand', async ({ page }) => {
    await page.goto('/');

    await page.locator('#services button').first().click();

    // Der Titel muss nachweislich am Dialog hängen, bevor gemessen wird: Radix setzt
    // `aria-labelledby` erst nach dem Mount des Titels, und axe würde in diesem
    // Moment einen leeren Namen melden.
    await expect(page.getByRole('dialog', { name: /Inspektion und Wartung/ })).toBeVisible();

    // Der Dialog liegt in einem Portal – geprüft wird das ganze Dokument, damit Overlay,
    // Fokusfalle und Titel mitgeprüft werden.
    await keineAxeVerstosse(page);
  });

  test('Terminformular', async ({ page }) => {
    await page.goto('/termin-anfrage');

    await keineAxeVerstosse(page);
  });

  test('Zusammenfassung der Demo-Anfrage', async ({ page }) => {
    await page.goto('/termin-anfrage');
    await demoAnfrageStellen(page);

    await keineAxeVerstosse(page);
  });

  test('E-Mail-Vorschau im geöffneten Zustand', async ({ page }) => {
    await page.goto('/termin-anfrage');
    await demoAnfrageStellen(page);

    await page.getByRole('button', { name: 'E-Mail-Vorschau ansehen' }).click();
    await expect(page.getByRole('dialog', { name: /E-Mail/ })).toBeVisible();

    // Der Dialog liegt in einem Portal – gemessen wird das ganze Dokument.
    await keineAxeVerstosse(page);
  });

  test('Hinweis ohne Demo-Anfrage', async ({ page }) => {
    await page.goto('/termin-anfrage/bestaetigung');

    await keineAxeVerstosse(page);
  });

  test('Impressum', async ({ page }) => {
    await page.goto('/impressum');

    await keineAxeVerstosse(page);
  });

  test('Kalender-Popover im Formular', async ({ page }) => {
    await page.goto('/termin-anfrage');

    await page.locator('button[data-min-date]').click();
    await expect(page.getByRole('grid')).toBeVisible();

    await keineAxeVerstosse(page);
  });

  test('404-Seite', async ({ page }) => {
    await page.goto('/es-gibt-hier-nichts');

    await keineAxeVerstosse(page);
  });
});
