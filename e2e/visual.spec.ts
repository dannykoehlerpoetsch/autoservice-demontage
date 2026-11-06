import { test, expect, type Page } from '@playwright/test';

/**
 * Visuelle Abnahme: ein Referenzbild pro Kernansicht. Ein Test fällt aus, wenn die Seite sich
 * sichtbar verändert – was den funktionellen Specs entgeht, weil sie Rollen und Texte prüfen,
 * nicht die Wirkung.
 *
 * Die Referenzbilder liegen in `e2e/visual.spec.ts-snapshots/`. Sie werden auf Ubuntu erzeugt
 * (CI), nicht lokal unter Windows: Schriftkanten unterscheiden sich zwischen Plattformen.
 * Anleitung steht im README unter „Visuelle Regression".
 */

async function warteAufStil(page: Page) {
  // Ohne geladene Fonts und auslaufende Animationen vergleicht man Rauschen.
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForLoadState('load');
}

test.describe('Visuelle Regression @visual', () => {
  test('Startseite hell', async ({ page }) => {
    await page.goto('/');
    await warteAufStil(page);

    await expect(page).toHaveScreenshot('startseite-de.png', { fullPage: true });
  });

  test('Startseite dunkel', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
    });
    await page.goto('/');
    await warteAufStil(page);

    await expect(page).toHaveScreenshot('startseite-dark.png', { fullPage: true });
  });

  test('Startseite englisch', async ({ page }) => {
    await page.goto('/en');
    await warteAufStil(page);

    await expect(page).toHaveScreenshot('startseite-en.png', { fullPage: true });
  });

  test('Leistungsdialog', async ({ page }) => {
    await page.goto('/');
    await page.locator('#services button').first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await expect(dialog).toHaveScreenshot('leistungsdialog.png');
  });

  test('Terminformular', async ({ page }) => {
    await page.goto('/termin-anfrage');
    await warteAufStil(page);

    await expect(page).toHaveScreenshot('terminformular.png', { fullPage: true });
  });

  test('Impressum', async ({ page }) => {
    await page.goto('/impressum');
    await warteAufStil(page);

    await expect(page).toHaveScreenshot('impressum.png', { fullPage: true });
  });

  test('404', async ({ page }) => {
    await page.goto('/es-gibt-hier-nichts');
    await warteAufStil(page);

    await expect(page).toHaveScreenshot('404.png');
  });
});
