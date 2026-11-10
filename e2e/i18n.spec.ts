import { test, expect } from '@playwright/test';

/**
 * Der Markenname bleibt in beiden Sprachen derselbe – er darf also nicht der Beweis für die
 * Umschaltung sein. Beweiskraft haben die Texte, die übersetzt werden: Untertitel,
 * Navigationsbeschriftung und Sektionsüberschrift.
 */
test.describe('Language switching', () => {
  test('switches the homepage content and URL to English', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Autoservice Demontage', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Alles rund ums Auto. Vom Check bis zur Reparatur.' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Demo-Ablauf' })).toBeVisible();

    await page.getByLabel('Sprache').selectOption('en');

    await expect(page).toHaveURL(/\/en$/);
    // Der Name bleibt – die Übersetzung drumherum wechselt.
    await expect(
      page.getByRole('heading', { name: 'Autoservice Demontage', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Everything around the car. From check to repair.' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Demo Flow' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'How the demo works' })).toBeVisible();
  });

  test('keeps the English locale when navigating to the Impressum page', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('link', { name: 'Legal Notice' }).click();

    await expect(page).toHaveURL(/\/en\/impressum$/);
    await expect(page.getByRole('heading', { name: 'Legal Notice' })).toBeVisible();
  });
});
