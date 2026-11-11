import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Barrierefreiheit ist Teil des Angebots: Detaildialog, Kalender-Popover, Formular und die
 * Sprachumschaltung müssen mit Screenreader und Tastatur bedienbar bleiben. Diese Specs lassen
 * axe über die Seiten laufen, damit eine kaputte Semantik (fehlender Label, leerer
 * Button-Name, falsche Rolle) nicht mehr per Handklick gesucht werden muss.
 *
 * Bewusst ohne Consent-Klick: die Seite fragt niemanden nach einer Einwilligung, und axe käme
 * in ein Cross-Origin-Iframe ohnehin nicht hinein – Iframes gibt es hier nicht.
 *
 * Früher gab es in dieser Datei eine Ausnahme für Kontrastverstöße auf der Markenfarbe. Sie ist
 * weg, weil der Grund behoben ist: Flächen mit weißer Schrift laufen über `--color-brand-strong`
 * (6,33:1), Schrift auf der Markenfarbe über dunkle Schrift bzw. das dunklere Token. Gemessen
 * wird jetzt ohne jede Freigabe – ein neuer Verstoß lässt die Pipeline laufen oder still scheitern.
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

type Knoten = { target: string[]; failureSummary?: string };
type Verstoss = {
  id: string;
  impact?: string;
  help: string;
  helpUrl: string;
  nodes: Knoten[];
};

/**
 * Farbmessungen sind nur aussagekräftig, wenn Fonts da und Animationen durch sind. Weh tut das
 * nicht: die kurzen Einblendungen der App sind alle endlich, und läuft doch etwas endlos
 * weiter, misst axe eben mitten drin.
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
  const neue = violations as Verstoss[];

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

  expect(neue, meldung || 'keine Verstösse').toEqual([]);
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

  test('Datenschutzerklärung', async ({ page }) => {
    await page.goto('/datenschutz');

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
