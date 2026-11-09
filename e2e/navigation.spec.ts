import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('clicking a section link from the Impressum page lands on the correct homepage section', async ({
    page,
  }) => {
    await page.goto('/impressum');
    await page.getByRole('link', { name: 'Leistungen' }).click();

    await expect(page).toHaveURL(/\/#services$/);
    await expect(page.locator('#services')).toBeInViewport();
  });

  test('home logo link returns to the homepage', async ({ page }) => {
    await page.goto('/impressum');
    await page.getByRole('link', { name: 'Zur Startseite' }).click();

    await expect(page).toHaveURL(/\/(#home)?$/);
  });

  test('footer impressum link navigates to the legal notice page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Impressum' }).click();

    await expect(page).toHaveURL(/\/impressum$/);
    await expect(page.getByRole('heading', { name: 'Impressum' })).toBeVisible();
  });

  test('the demo notice above the header points at the portfolio', async ({ page }) => {
    await page.goto('/');

    const notice = page.getByRole('complementary', { name: 'Hinweis: Demo-Projekt' });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('Demo-Projekt für meine Portfoliowebsite');

    const portfolio = notice.getByRole('link', { name: /Zum Portfolio/ });
    await expect(portfolio).toHaveAttribute('href', 'https://dakopo.vercel.app/');
    await expect(portfolio).toHaveAttribute('target', '_blank');
  });
});
