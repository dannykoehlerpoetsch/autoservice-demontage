import { test, expect, type Page } from '@playwright/test';
import { BETREIBER, type BetreiberFeld } from '../src/lib/legal/operator';

/**
 * Impressum und Datenschutzerklärung im gebauten Auftritt: von jeder Seite erreichbar, in beiden
 * Sprachen gleich gebaut, ohne erfundene Betreiberangaben und ohne Entwicklerhinweise für
 * Besucher. Was in `src/lib/legal/operator.ts` fehlt, muss als Platzhalter zu sehen sein; was
 * dort steht, muss als Wert zu sehen sein. Die Spec prüft genau die jeweils andere Hälfte.
 */

const PFLICHT: BetreiberFeld[] = ['name', 'strasse', 'ort', 'email'];

const wert = (feld: BetreiberFeld) => BETREIBER[feld].trim();
const fehlt = (feld: BetreiberFeld) => wert(feld) === '';
const offenePflicht = PFLICHT.filter(fehlt);

async function werteSichtbar(page: Page) {
  const haupttext = page.locator('main');

  for (const feld of PFLICHT) {
    if (fehlt(feld)) continue;

    // Der eingetragene Wert muss im Klartext der Seite stehen.
    await expect(haupttext, feld).toContainText(wert(feld));
  }

  if (offenePflicht.length === 0) {
    // Ohne freie Stelle darf auch kein Platzhaltertext mehr irgendwo stehen.
    await expect(haupttext).not.toContainText('[noch eintragen:');
    await expect(haupttext).not.toContainText('[to be added:');
  }

  const werte = page.locator('[data-rechts-wert="true"]');

  await expect(werte.first()).toBeVisible();
}

function rechteSpalte(page: Page) {
  return page.getByRole('navigation', { name: 'Rechtliche Seiten' });
}

async function sichtbarerText(page: Page) {
  return (await page.locator('main').innerText()) ?? '';
}

test.describe('Navigation zu den rechtlichen Seiten', () => {
  test('führt von der Startseite zum Impressum – auf Deutsch', async ({ page }) => {
    await page.goto('/');

    await rechteSpalte(page).getByRole('link', { name: 'Impressum' }).click();

    await expect(page).toHaveURL(/\/impressum$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Impressum' })).toBeVisible();
  });

  test('führt von der Startseite zur Datenschutzerklärung – auf Deutsch', async ({ page }) => {
    await page.goto('/');

    await rechteSpalte(page).getByRole('link', { name: 'Datenschutzerklärung' }).click();

    await expect(page).toHaveURL(/\/datenschutz$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Datenschutzerklärung' })
    ).toBeVisible();
  });

  test('führt auf Englisch zu beiden Seiten', async ({ page }) => {
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

test.describe('Impressum', () => {
  test('hält sich an die zwei Abschnitte für Anbieter und Kontakt', async ({ page }) => {
    await page.goto('/impressum');

    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'Diensteanbieter' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Kontakt' })).toBeVisible();

    // Kein Warnband, kein Zähler, keine Sonderfälle.
    await expect(page.locator('main')).not.toContainText(/veröffentlichungsfertig/i);
    await expect(page.locator('main')).not.toContainText(/Noch zu prüfen/i);
    await expect(page.locator('main')).not.toContainText(/Weitere Angaben/i);
  });

  test('zeigt eingetragene Angaben als Wert und freie Stellen als Platzhalter', async ({
    page,
  }) => {
    await page.goto('/impressum');

    const platzhalter = page.locator('[data-rechts-platzhalter="true"]');

    await expect(platzhalter).toHaveCount(offenePflicht.length);

    for (const text of await platzhalter.allInnerTexts()) {
      expect(text.startsWith('[noch eintragen:')).toBe(true);
      expect(text.length).toBeGreaterThan('[noch eintragen: '.length + 2);
    }

    await werteSichtbar(page);
  });

  test('nennt keine Anschrift, kein Telefon und keine Mail einer echten Werkstatt', async ({
    page,
  }) => {
    await page.goto('/impressum');

    expect(await page.locator('a[href^="tel:"], a[href^="mailto:"]').count()).toBe(0);

    const text = await sichtbarerText(page);

    // Die alten Musterangaben dürfen nirgends zurückkehren; eine echte Anschrift wäre davon
    // nicht betroffen – realer Name und reale Straße enthalten kein „Muster“.
    expect(text).not.toMatch(/Max Mustermann|Musterstra|Musterstadt/i);

    await expect(page.getByRole('heading', { name: /Öffnungszeiten/i })).toHaveCount(0);
  });

  test('zeigt Besuchern keine Dateipfade und keine Prüfpunkte', async ({ page }) => {
    await page.goto('/impressum');

    const text = await sichtbarerText(page);

    expect(text).not.toMatch(/src\/|operator\.ts|docs\/[A-Z_]+|\.tsx?\b/);
    expect(text).not.toMatch(/\{anzahl\}|TODO|platzhalter:/i);
  });

  test('bleibt beim Recht, das gilt: keine Paragrafen des abgelösten TMG', async ({ page }) => {
    await page.goto('/impressum');

    const text = await sichtbarerText(page);

    expect(text).not.toMatch(/§ ?\d+[^.\n]{0,25}TMG/);
  });
});

test.describe('Datenschutzerklärung', () => {
  test('beschreibt die tatsächlich eingesetzte Technik', async ({ page }) => {
    await page.goto('/datenschutz');

    const text = await sichtbarerText(page);

    for (const begriff of ['Vercel', 'NEXT_LOCALE', 'theme', 'Art. 6', 'Art. 77']) {
      expect(text, begriff).toContain(begriff);
    }

    expect(text).not.toMatch(/Google Maps|Cookie-Banner|Datenbank|keinerlei personenbezogene/i);
    expect(text).not.toMatch(/src\/|operator\.ts|Noch zu prüfen/i);
  });

  test('bleibt kompakt: fünf Abschnitte, eine Rechte-Liste', async ({ page }) => {
    await page.goto('/datenschutz');

    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(5);
    await expect(page.locator('main').getByRole('list').getByRole('listitem')).toHaveCount(6);
  });

  test('führt die verantwortliche Person mit Wert oder Platzhalter', async ({ page }) => {
    await page.goto('/datenschutz');

    await expect(page.locator('[data-rechts-platzhalter="true"]')).toHaveCount(
      offenePflicht.length
    );
    await expect(page.locator('address')).toHaveCount(1);

    await werteSichtbar(page);
  });

  test('merkt die umgeschaltete Sprache in einem Sitzungs-Cookie', async ({ context, page }) => {
    // Genau der Fall, den die Datenschutzerklärung beschreibt: Die Sprache wurde gewechselt,
    // und die Anwendung merkt sie in einem Cookie ohne Ablaufzeit.
    await page.goto('/');
    await page.getByLabel('Sprache').selectOption('en');

    await expect(page).toHaveURL(/\/en$/);

    const cookie = (await context.cookies()).find((eintrag) => eintrag.name === 'NEXT_LOCALE');

    expect(cookie, 'NEXT_LOCALE fehlt nach der Umschaltung').toBeTruthy();
    expect(cookie!.value).toBe('en');
    // expires === -1 ist ein Sitzungs-Cookie – die Datenschutzerklärung sagt genau das.
    expect(cookie!.expires).toBe(-1);
    expect(cookie!.sameSite).toBe('Lax');
  });
});
