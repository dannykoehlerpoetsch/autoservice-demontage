import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility is part of the offer: the detail dialog, the calendar popover, the form and the
 * language switch must stay operable with screen reader and keyboard. These specs run axe over the
 * pages so that broken semantics (missing label, empty button name, wrong role) no longer have to be
 * hunted by manual clicking.
 *
 * Deliberately without a consent click: the page never asks anyone for consent, and axe could not
 * reach into a cross-origin iframe anyway – there are no iframes here.
 *
 * This file used to carry an exception for contrast violations on the brand colour. It is gone
 * because the cause is fixed: surfaces with white text run over `--color-brand-strong` (6.33:1),
 * text on the brand colour over dark text respectively the darker token. Measuring now happens
 * without any waiver – a new violation makes the pipeline fail.
 */

/**
 * Runs a demo request through to the summary – the confirmation page only exists with state, and
 * that state comes from taking the real path.
 */
async function submitDemoRequest(page: Page) {
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
type Violation = {
  id: string;
  impact?: string;
  help: string;
  helpUrl: string;
  nodes: Knoten[];
};

/**
 * Colour measurements only mean something when the fonts are there and the animations are done.
 * Waiting does no harm: the app's short reveals are all finite, and if something does run endlessly
 * then axe simply measures in the middle of it.
 */
async function waitForSettledPage(page: Page) {
  await page.evaluate(() => document.fonts?.ready);

  await page
    .waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'), null, {
      timeout: 2_000,
    })
    .catch(() => {});
}

async function noAxeViolations(page: Page, region?: string) {
  await waitForSettledPage(page);

  const audit = new AxeBuilder({ page });
  if (region) {
    audit.include(region);
  }

  const { violations } = await audit.analyze();
  const newViolations = violations as Violation[];

  const message = newViolations
    .map(
      (violation) =>
        `[${violation.impact ?? '?'}] ${violation.id}: ${violation.help}\n` +
        `  ${violation.helpUrl}\n` +
        violation.nodes
          .slice(0, 5)
          .map((node) => `   ${node.target.join(' ')} – ${node.failureSummary ?? ''}`)
          .join('\n')
    )
    .join('\n\n');

  expect(newViolations, message || 'no violations').toEqual([]);
}

test.describe('Accessibility', () => {
  test('Homepage in German', async ({ page }) => {
    await page.goto('/');

    await noAxeViolations(page);
  });

  test('Homepage in English', async ({ page }) => {
    await page.goto('/en');

    await noAxeViolations(page);
  });

  test('Service dialog in the open state', async ({ page }) => {
    await page.goto('/');

    await page.locator('#services button').first().click();

    // The title has to verifiably hang on the dialog before measuring: Radix sets
    // `aria-labelledby` only after the title mounts, and axe would run into this
    // Moment einen leeren Namen melden.
    await expect(page.getByRole('dialog', { name: /Inspektion und Wartung/ })).toBeVisible();

    // The dialog sits in a portal – the whole document is checked so that overlay,
    // focus trap and title are checked along.
    await noAxeViolations(page);
  });

  test('Appointment form', async ({ page }) => {
    await page.goto('/termin-anfrage');

    await noAxeViolations(page);
  });

  test('Summary of the demo request', async ({ page }) => {
    await page.goto('/termin-anfrage');
    await submitDemoRequest(page);

    await noAxeViolations(page);
  });

  test('Email preview in the open state', async ({ page }) => {
    await page.goto('/termin-anfrage');
    await submitDemoRequest(page);

    await page.getByRole('button', { name: 'E-Mail-Vorschau ansehen' }).click();
    await expect(page.getByRole('dialog', { name: /E-Mail/ })).toBeVisible();

    // The dialog sits in a portal – the whole document is measured.
    await noAxeViolations(page);
  });

  test('Notice without a demo request', async ({ page }) => {
    await page.goto('/termin-anfrage/bestaetigung');

    await noAxeViolations(page);
  });

  test('Legal notice', async ({ page }) => {
    await page.goto('/impressum');

    await noAxeViolations(page);
  });

  test('Privacy policy', async ({ page }) => {
    await page.goto('/datenschutz');

    await noAxeViolations(page);
  });

  test('Calendar popover inside the form', async ({ page }) => {
    await page.goto('/termin-anfrage');

    await page.locator('button[data-min-date]').click();
    await expect(page.getByRole('grid')).toBeVisible();

    await noAxeViolations(page);
  });

  test('404 page', async ({ page }) => {
    await page.goto('/es-gibt-hier-nichts');

    await noAxeViolations(page);
  });
});
