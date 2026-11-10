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

  test('the demo flow link from another page lands on the demo section', async ({ page }) => {
    await page.goto('/impressum');
    await page.getByRole('link', { name: 'Demo-Ablauf' }).click();

    await expect(page).toHaveURL(/\/#demo$/);
    await expect(page.getByRole('heading', { name: 'So funktioniert die Demo' })).toBeInViewport();
  });

  test('the demo section explains the flow and leads to the request form', async ({ page }) => {
    await page.goto('/#demo');

    const section = page.locator('#demo');
    await expect(section.getByRole('listitem')).toHaveCount(4);
    await expect(
      section.getByText(
        'Alle Schritte dienen ausschließlich der Demonstration. Es werden weder echte Termine vereinbart noch Bestätigungs-E-Mails verschickt.'
      )
    ).toBeVisible();

    await section.getByRole('link', { name: 'Demo-Anfrage starten' }).click();
    await expect(page).toHaveURL(/\/termin-anfrage$/);
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
    await expect(notice).toContainText('Autoservice Demontage ist eine fiktive Kfz-Werkstatt');

    const portfolio = notice.getByRole('link', { name: /Zum Portfolio/ });
    await expect(portfolio).toHaveAttribute('href', 'https://dakopo.vercel.app/');
    await expect(portfolio).toHaveAttribute('target', '_blank');
  });
});

test.describe('Kein realer Betrieb', () => {
  test('offers no phone, email or map link anywhere on the page', async ({ page }) => {
    for (const pfad of ['/', '/en', '/impressum', '/termin-anfrage']) {
      await page.goto(pfad);

      await expect(page.locator('a[href^="tel:"], a[href^="mailto:"]')).toHaveCount(0);
      await expect(page.locator('iframe')).toHaveCount(0);
    }
  });
});
