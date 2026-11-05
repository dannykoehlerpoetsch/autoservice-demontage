import { test, expect } from '@playwright/test';

test.describe('Service detail dialog', () => {
  test('opens the details of the clicked service and closes via the corner button', async ({
    page,
  }) => {
    await page.goto('/');

    const card = page.getByRole('button', { name: /Bremsenservice/ });
    // Direkt springen statt smooth scrollen, damit die Karte stabil liegt.
    await card.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));

    const section = page.locator('#services');
    const sectionBefore = await section.boundingBox();

    await card.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { level: 2, name: 'Bremsenservice' })).toBeVisible();
    await expect(dialog.getByText(/Materialstärke/)).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Jetzt Termin für Bremsenservice buchen' })
    ).toBeVisible();

    // Kein Layoutshift: Scrollbar-Pfad bleibt reserviert, die Sektion liegt gleich.
    const sectionAfter = await section.boundingBox();
    expect({ x: sectionAfter?.x, width: sectionAfter?.width }).toEqual({
      x: sectionBefore?.x,
      width: sectionBefore?.width,
    });

    // Einblend-Animation abwarten, sonst werden die Boxen mitten im
    // scale(0.96 -> 1) gemessen.
    await dialog.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));

    // Modal mittig auf der Seitenachse (ICB = Viewport ohne Scrollbar-Pfad).
    const dialogBox = await dialog.boundingBox();
    const icbWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(
      Math.abs((dialogBox?.x ?? 0) + (dialogBox?.width ?? 0) / 2 - icbWidth / 2)
    ).toBeLessThanOrEqual(1);

    // Der CTA füllt die volle Inhaltsbreite, Schließen gibt es nur noch als X.
    const expectedCtaWidth = await dialog.evaluate((el) => {
      const cs = getComputedStyle(el);
      return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    });
    const ctaBox = await dialog
      .getByRole('button', { name: 'Jetzt Termin für Bremsenservice buchen' })
      .boundingBox();
    expect(Math.abs((ctaBox?.width ?? 0) - expectedCtaWidth)).toBeLessThanOrEqual(1);
    await expect(dialog.getByRole('button', { name: 'Schließen' })).toHaveCount(1);

    await dialog.getByRole('button', { name: 'Schließen', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect.soft(page.locator('body')).toHaveCSS('overflow', 'visible');
    await expect.soft(page.locator('body')).toHaveCSS('pointer-events', 'auto');
  });

  test('closes on Escape and shows the details of another service when reopened', async ({
    page,
  }) => {
    await page.goto('/');

    const first = page.getByRole('button', { name: /Inspektion/ });
    await first.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await first.click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { level: 2, name: 'Inspektion und Wartung' })
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    const oil = page.getByRole('button', { name: /Ölwechsel/ });
    await oil.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await oil.click();

    await expect(dialog.getByRole('heading', { level: 2, name: 'Ölwechsel' })).toBeVisible();
    await expect(dialog.getByText(/Motoröl und Ölfilter/)).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Jetzt Termin für Ölwechsel buchen' })
    ).toBeVisible();
  });

  test('adapts to small screens', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 360, height: 640 } });
    const page = await context.newPage();
    await page.goto('/');

    const card = page.getByRole('button', { name: /Reifenservice/ });
    await card.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await card.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { level: 2, name: 'Reifenservice' })).toBeVisible();

    const box = await dialog.boundingBox();
    const size = await page.evaluate(() => ({
      w: document.documentElement.clientWidth,
      h: document.documentElement.clientHeight,
    }));
    expect(box?.x).toBeGreaterThanOrEqual(8);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(size.w - 8);
    expect(box?.y).toBeGreaterThanOrEqual(8);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(size.h - 8);

    await context.close();
  });

  test('translates the dialog content', async ({ page }) => {
    await page.goto('/en');

    const card = page.getByRole('button', { name: /Brake service/ });
    await card.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await card.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { level: 2, name: 'Brake service' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Book an appointment for Brake service now' })
    ).toBeVisible();
  });
});
