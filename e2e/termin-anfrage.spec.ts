import { test, expect, type Page } from '@playwright/test';

/**
 * Der Weg einer Terminanfrage: Service-Dialog -> Formular -> Bestätigung -> E-Mail-Angebot.
 *
 * Der Tag wird im Kalender-Popover gegriffen (der letzte wählbare Tag des sichtbaren Monats),
 * damit die Spean nicht an ein festes Datum gebunden ist. Die Kalenderregeln selbst –
 * Vergangenheit gesperrt, Wert im versteckten Feld – prüft
 * `src/components/__tests__/AppointmentForm.test.tsx`.
 */

async function oeffneFormularFuerService(page: Page, serviceHeading: string) {
  await page.locator(`#services button:has-text("${serviceHeading}")`).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  // Der erste Knopf im Dialog ist der Termin-CTA, der zweite schließt.
  await page.getByRole('dialog').getByRole('button').first().click();
  await expect(page).toHaveURL(/\/termin-anfrage$/);
}

async function feldSetzen(page: Page, feld: string, wert: string) {
  await page.fill(`#field-${feld}`, wert);
}

async function waehleLetztenWahlbarenTag(page: Page) {
  await page.evaluate(() => {
    document.querySelector('button[data-min-date]')?.scrollIntoView({ block: 'center' });
  });
  await page.locator('button[data-min-date]').click();
  await page.locator('td[data-day] button:not([disabled])').last().click();
}

test.describe('Terminanfrage', () => {
  test('Terminanfrage auf Deutsch bis zur Bestätigung', async ({ page }) => {
    await page.goto('/');

    await oeffneFormularFuerService(page, 'Bremsenservice');
    await expect(page.locator('#field-service')).toHaveValue('bremsen');

    await feldSetzen(page, 'name', 'Jennifer Krüger');
    await feldSetzen(page, 'phone', '+49 170 1234567');
    await feldSetzen(page, 'email', 'j.krueger@beispiel.de');
    await feldSetzen(page, 'note', 'Das Bremspedal pumpt.');

    await waehleLetztenWahlbarenTag(page);
    await expect(page.locator('input[name="date"]')).not.toHaveValue('');

    await page.getByRole('button', { name: 'Terminanfrage senden' }).click();

    await expect(page).toHaveURL(/termin-anfrage\/bestaetigung\?id=[0-9a-f-]{36}$/);
    await expect(
      page.getByRole('heading', { name: 'Ihre Terminanfrage ist erfasst' })
    ).toBeVisible();
    await expect(page.getByText('Jennifer Krüger')).toBeVisible();
    await expect(page.getByText('Bremsenservice')).toBeVisible();
    await expect(page.getByText('Das Bremspedal pumpt.')).toBeVisible();

    // Von hier aus zurück nach Hause – und die Mail-Kopie kündigt sich ehrlich an.
    await expect(page.getByRole('link', { name: 'Zurück zur Startseite' })).toBeVisible();

    await page.getByRole('button', { name: 'Anfrage per E-Mail senden' }).click();
    await expect(page.getByRole('status')).toContainText(/kein Mailversand eingerichtet/);
  });

  test('Leere Pflichtfelder meldet der Server, nicht der Browser', async ({ page }) => {
    await page.goto('/termin-anfrage');

    await page.getByRole('button', { name: 'Terminanfrage senden' }).click();

    await expect(page.locator('#form-errors')).toContainText('Bitte prüfen Sie folgende Felder');
    for (const feld of ['name', 'phone', 'email', 'service', 'date']) {
      await expect(page.locator(`#error-${feld}`)).toBeVisible();
    }
  });

  test('Einschleuseversuche im Namen bleiben Text', async ({ page }) => {
    await page.goto('/termin-anfrage');

    await feldSetzen(page, 'name', '<script>alert(1)</script>');
    await feldSetzen(page, 'phone', '+49 170 1234567');
    await feldSetzen(page, 'email', 'j.krueger@beispiel.de');

    await waehleLetztenWahlbarenTag(page);
    await page.getByRole('button', { name: 'Terminanfrage senden' }).click();

    await expect(page.locator('#error-name')).toContainText('Bitte nur Buchstaben');
    await expect(page.locator('form script')).toHaveCount(0);
  });

  test('Ein Termindatum in der Vergangenheit wird auch als Formularfeld abgewehrt', async ({
    page,
  }) => {
    await page.goto('/termin-anfrage');

    await feldSetzen(page, 'name', 'Jennifer Krüger');
    await feldSetzen(page, 'phone', '+49 170 1234567');
    await feldSetzen(page, 'email', 'j.krueger@beispiel.de');

    // Der Kalender sperrt solche Tage ohnehin – hier kommt der Wert als manipulierte Eingabe rein.
    await page.evaluate(() => {
      const feld = document.querySelector<HTMLInputElement>('input[name="date"]');
      if (feld) {
        feld.value = '2020-01-02';
      }
    });
    await page.getByRole('button', { name: 'Terminanfrage senden' }).click();

    await expect(page.locator('#error-date')).toContainText('Vergangenheit');
  });

  test('Eine fremde Anfrage-ID führt ins Leere', async ({ page }) => {
    await page.goto('/termin-anfrage/bestaetigung?id=00000000-0000-4000-8000-000000000000');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Anfrage nicht gefunden' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Neue Terminanfrage stellen' })).toBeVisible();
  });

  test('Terminanfrage auf Englisch', async ({ page }) => {
    await page.goto('/en');

    await oeffneFormularFuerService(page, 'Brake service');
    await expect(page.locator('#field-service')).toHaveValue('bremsen');

    await feldSetzen(page, 'name', 'Taylor Example');
    await feldSetzen(page, 'phone', '+49 170 1234567');
    await feldSetzen(page, 'email', 'taylor@example.com');

    await waehleLetztenWahlbarenTag(page);
    await page.getByRole('button', { name: 'Send appointment request' }).click();

    await expect(
      page.getByRole('heading', { name: 'Your appointment request has been recorded' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to homepage' })).toBeVisible();
  });
});
