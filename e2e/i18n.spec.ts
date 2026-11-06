import { test, expect } from '@playwright/test';

test.describe('Language switching', () => {
  test('switches the homepage content and URL to English', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Willkommen bei Bennis Autoservice' })
    ).toBeVisible();

    await page.getByLabel('Sprache').selectOption('en');

    await expect(page).toHaveURL(/\/en$/);
    await expect(
      page.getByRole('heading', { name: 'Welcome to Bennis Autoservice' })
    ).toBeVisible();
  });

  test('keeps the English locale when navigating to the Impressum page', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('link', { name: 'Legal Notice' }).click();

    await expect(page).toHaveURL(/\/en\/impressum$/);
    await expect(page.getByRole('heading', { name: 'Legal Notice' })).toBeVisible();
  });
});
