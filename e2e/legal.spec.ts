import { test, expect, type Page } from '@playwright/test';
import { OPERATOR_DETAILS, type OperatorField } from '../src/lib/legal/operator';

/**
 * Legal notice and privacy policy in the built deployment: reachable from every page, built the same
 * in both languages, without invented operator details and without developer hints for visitors.
 * Whatever is missing in `src/lib/legal/operator.ts` must be visible as a placeholder; whatever
 * stands there must be visible as a value. The spec checks exactly the other half each time.
 */

const REQUIRED_FIELDS: OperatorField[] = ['name', 'strasse', 'ort', 'email'];

const value = (field: OperatorField) => OPERATOR_DETAILS[field].trim();
const fehlt = (field: OperatorField) => value(field) === '';
const missingRequired = REQUIRED_FIELDS.filter(fehlt);

async function valuesVisible(page: Page) {
  const mainText = page.locator('main');

  for (const field of REQUIRED_FIELDS) {
    if (fehlt(field)) continue;

    // The entered value has to stand in the plain text of the page.
    await expect(mainText, field).toContainText(value(field));
  }

  if (missingRequired.length === 0) {
    // Without a blank spot no placeholder text may stand anywhere any more.
    await expect(mainText).not.toContainText('[noch eintragen:');
    await expect(mainText).not.toContainText('[to be added:');
  }

  const values = page.locator('[data-rechts-wert="true"]');

  await expect(values.first()).toBeVisible();
}

function rightsColumn(page: Page) {
  return page.getByRole('navigation', { name: 'Rechtliche Seiten' });
}

async function visibleText(page: Page) {
  return (await page.locator('main').innerText()) ?? '';
}

test.describe('Navigation to the legal pages', () => {
  test('leads from the homepage to the legal notice – in German', async ({ page }) => {
    await page.goto('/');

    await rightsColumn(page).getByRole('link', { name: 'Impressum' }).click();

    await expect(page).toHaveURL(/\/impressum$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Impressum' })).toBeVisible();
  });

  test('leads from the homepage to the privacy policy – in German', async ({ page }) => {
    await page.goto('/');

    await rightsColumn(page).getByRole('link', { name: 'Datenschutzerklärung' }).click();

    await expect(page).toHaveURL(/\/datenschutz$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Datenschutzerklärung' })
    ).toBeVisible();
  });

  test('leads in English to both pages', async ({ page }) => {
    await page.goto('/en');

    const spalte = page.getByRole('navigation', { name: 'Legal pages' });

    await spalte.getByRole('link', { name: 'Legal Notice' }).click();
    await expect(page).toHaveURL(/\/en\/impressum$/);

    await page.goto('/en');
    await spalte.getByRole('link', { name: 'Privacy Policy' }).click();
    await expect(page).toHaveURL(/\/en\/datenschutz$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
  });
});

test.describe('Legal notice', () => {
  test('sticks to the two sections for provider and contact', async ({ page }) => {
    await page.goto('/impressum');

    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'Diensteanbieter' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Kontakt' })).toBeVisible();

    // No warning band, no counter, no special cases.
    await expect(page.locator('main')).not.toContainText(/veröffentlichungsfertig/i);
    await expect(page.locator('main')).not.toContainText(/Noch zu prüfen/i);
    await expect(page.locator('main')).not.toContainText(/Weitere Angaben/i);
  });

  test('shows entered details as values and blank ones as placeholders', async ({ page }) => {
    await page.goto('/impressum');

    const placeholder = page.locator('[data-rechts-platzhalter="true"]');

    await expect(placeholder).toHaveCount(missingRequired.length);

    for (const text of await placeholder.allInnerTexts()) {
      expect(text.startsWith('[noch eintragen:')).toBe(true);
      expect(text.length).toBeGreaterThan('[noch eintragen: '.length + 2);
    }

    await valuesVisible(page);
  });

  test('names no address, phone or email of a real workshop', async ({ page }) => {
    await page.goto('/impressum');

    expect(await page.locator('a[href^="tel:"], a[href^="mailto:"]').count()).toBe(0);

    const text = await visibleText(page);

    // The old sample details may not return anywhere; a real address would not be affected
    // by that – a real name and a real street do not contain "Muster".
    expect(text).not.toMatch(/Max Mustermann|Musterstra|Musterstadt/i);

    await expect(page.getByRole('heading', { name: /Öffnungszeiten/i })).toHaveCount(0);
  });

  test('shows visitors no file paths and no checkpoints', async ({ page }) => {
    await page.goto('/impressum');

    const text = await visibleText(page);

    expect(text).not.toMatch(/src\/|operator\.ts|docs\/[A-Z_]+|\.tsx?\b/);
    expect(text).not.toMatch(/\{anzahl\}|TODO|platzhalter:/i);
  });

  test('sticks to the law that applies: no paragraphs of the repealed TMG', async ({ page }) => {
    await page.goto('/impressum');

    const text = await visibleText(page);

    expect(text).not.toMatch(/§ ?\d+[^.\n]{0,25}TMG/);
  });
});

test.describe('Privacy policy', () => {
  test('describes the technology actually used', async ({ page }) => {
    await page.goto('/datenschutz');

    const text = await visibleText(page);

    for (const term of ['Vercel', 'NEXT_LOCALE', 'theme', 'Art. 6', 'Art. 77']) {
      expect(text, term).toContain(term);
    }

    expect(text).not.toMatch(/Google Maps|Cookie-Banner|Datenbank|keinerlei personenbezogene/i);
    expect(text).not.toMatch(/src\/|operator\.ts|Noch zu prüfen/i);
  });

  test('stays compact: five sections, one rights list', async ({ page }) => {
    await page.goto('/datenschutz');

    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(5);
    await expect(page.locator('main').getByRole('list').getByRole('listitem')).toHaveCount(6);
  });

  test('lists the responsible person with a value or a placeholder', async ({ page }) => {
    await page.goto('/datenschutz');

    await expect(page.locator('[data-rechts-platzhalter="true"]')).toHaveCount(
      missingRequired.length
    );
    await expect(page.locator('address')).toHaveCount(1);

    await valuesVisible(page);
  });

  test('records the switched language in a session cookie', async ({ context, page }) => {
    // Exactly the case the privacy policy describes: the language was switched, and the
    // application records it in a cookie without an expiry time.
    await page.goto('/');
    await page.getByLabel('Sprache').selectOption('en');

    await expect(page).toHaveURL(/\/en$/);

    const cookie = (await context.cookies()).find((entry) => entry.name === 'NEXT_LOCALE');

    expect(cookie, 'NEXT_LOCALE missing after the switch').toBeTruthy();
    expect(cookie!.value).toBe('en');
    // expires === -1 is a session cookie – the privacy policy says exactly that.
    expect(cookie!.expires).toBe(-1);
    expect(cookie!.sameSite).toBe('Lax');
  });
});
