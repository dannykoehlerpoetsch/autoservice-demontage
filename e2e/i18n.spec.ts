import { test, expect } from '@playwright/test';

/**
 * The brand name stays the same in both languages – so it may not be the proof of the switch.
 * Proving power lies in the texts that are translated: subtitle, navigation label and section
 * heading.
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
    // The name stays – the translation around it switches.
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
