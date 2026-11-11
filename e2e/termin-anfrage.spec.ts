import { test, expect, type Page, type Request } from '@playwright/test';

/**
 * The path of a demo request: service dialog -> form -> summary -> email preview.
 *
 * Checked is the flow, not an integration: there is no server that ever gets to see the input. One
 * test therefore listens on every network and demands that nothing goes out while finishing. The day
 * is taken in the calendar popover (the last selectable day of the visible month) so the specs are
 * not tied to a fixed date.
 */

const NAME_LABEL = 'Jennifer Krüger';
const PHONE_LABEL = '+49 170 1234567';
const EMAIL_LABEL = 'j.krueger@beispiel.de';
const NOTE_TEXT = 'Das Bremspedal pumpt.';

async function openFormForService(page: Page, serviceHeading: string) {
  await page.locator(`#services button:has-text("${serviceHeading}")`).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  // The first button in the dialog is the demo CTA, the second one closes.
  await page.getByRole('dialog').getByRole('button').first().click();
  await expect(page).toHaveURL(/\/termin-anfrage$/);
}

async function setFieldValue(page: Page, field: string, value: string) {
  await page.fill(`#field-${field}`, value);
}

async function selectLastSelectableDay(page: Page) {
  await page.evaluate(() => {
    document.querySelector('button[data-min-date]')?.scrollIntoView({ block: 'center' });
  });
  await page.locator('button[data-min-date]').click();
  await page.locator('td[data-day] button:not([disabled])').last().click();
}

/** Fills the form so the schema has to accept it. */
async function fillValidValues(page: Page, overrides: Record<string, string> = {}) {
  const values = {
    name: NAME_LABEL,
    phone: PHONE_LABEL,
    email: EMAIL_LABEL,
    note: NOTE_TEXT,
    service: 'bremsen',
    ...overrides,
  };

  await page.selectOption('#field-service', values.service);
  await setFieldValue(page, 'name', values.name);
  await setFieldValue(page, 'phone', values.phone);
  await setFieldValue(page, 'email', values.email);
  if (values.note) {
    await setFieldValue(page, 'note', values.note);
  }
  await selectLastSelectableDay(page);
}

async function completeRequest(page: Page, buttonName = 'Demo-Anfrage abschließen') {
  await page.getByRole('button', { name: buttonName }).click();
  await expect(page).toHaveURL(/termin-anfrage\/bestaetigung$/);
}

/** Opens the email preview and returns the dialog. */
async function openPreview(page: Page, buttonName = 'E-Mail-Vorschau ansehen') {
  await page.getByRole('button', { name: buttonName }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('Demo appointment request', () => {
  test('German demo request through to the email preview', async ({ page }) => {
    await page.goto('/');

    await openFormForService(page, 'Bremsenservice');
    await expect(page.locator('#field-service')).toHaveValue('bremsen');

    // Das Formular sagt selbst, dass es eine Demo ist.
    await expect(
      page.getByText('Es werden keine Daten versendet und keine echten Termine vereinbart.')
    ).toBeVisible();
    await expect(page.getByText(/Testdaten genügen/)).toBeVisible();

    await fillValidValues(page);

    await completeRequest(page);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Demo-Anfrage erfolgreich abgeschlossen' })
    ).toBeVisible();
    await expect(page).toHaveURL(/termin-anfrage\/bestaetigung$/);
    // No request id in the URL – the summary comes from the browser.
    await expect(page).not.toHaveURL(/[?&]id=/);

    const summary = page.locator('dl');
    await expect(summary).toContainText(NAME_LABEL);
    await expect(summary).toContainText('Bremsenservice');
    await expect(summary).toContainText(PHONE_LABEL);
    await expect(summary).toContainText(EMAIL_LABEL);
    await expect(summary).toContainText(NOTE_TEXT);
    await expect(summary).toContainText('Terminwunsch');
    await expect(page.getByText(/Es wurde kein echter Termin gebucht/)).toBeVisible();

    // Preview: it shows the same text but does not send it.
    const dialog = await openPreview(page);
    await expect(dialog).toContainText('Autoservice Demontage – Demo');
    await expect(dialog).toContainText(EMAIL_LABEL);
    await expect(dialog).toContainText('Deine Demo-Terminanfrage – Bremsenservice');
    await expect(dialog).toContainText(`Hallo ${NAME_LABEL},`);
    await expect(dialog).toContainText('Gewünschter Service: Bremsenservice');
    await expect(dialog).toContainText('Es wurde keine E-Mail versendet');
    // There may not be a send button.
    await expect(dialog.getByRole('button', { name: /senden|versenden/i })).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Bearbeiten: dieselbe Anfrage, neue Werte, neue Zusammenfassung.
    await page.getByRole('button', { name: 'Angaben bearbeiten' }).click();
    await expect(page).toHaveURL(/\/termin-anfrage$/);
    await expect(page.locator('#field-name')).toHaveValue(NAME_LABEL);
    await expect(page.locator('#field-service')).toHaveValue('bremsen');

    await setFieldValue(page, 'name', 'Max Mustermann');
    await setFieldValue(page, 'note', 'Nur noch der Rückwärtsgang quietscht.');
    await completeRequest(page);

    await expect(page.locator('dl')).toContainText('Max Mustermann');
    await expect(page.locator('dl')).toContainText('Nur noch der Rückwärtsgang quietscht.');
    await expect(page.locator('dl')).not.toContainText('Das Bremspedal pumpt.');

    await expect(page.getByRole('link', { name: 'Zurück zur Startseite' })).toBeVisible();
  });

  test('Empty required fields are reported by the schema, not the browser', async ({ page }) => {
    await page.goto('/termin-anfrage');

    await page.getByRole('button', { name: 'Demo-Anfrage abschließen' }).click();

    await expect(page.locator('#form-errors')).toContainText('Bitte prüf folgende Felder');
    for (const field of ['name', 'service', 'date']) {
      await expect(page.locator(`#error-${field}`)).toBeVisible();
    }
    // Optional fields are not complained about.
    await expect(page.locator('#error-phone')).toHaveCount(0);
    await expect(page.locator('#error-email')).toHaveCount(0);
    await expect(page).toHaveURL(/\/termin-anfrage$/);
  });

  test('Invalid contact data is only reported once it is filled in', async ({ page }) => {
    await page.goto('/termin-anfrage');

    await fillValidValues(page, { email: 'max@beispiel', phone: 'nine one two' });
    await page.getByRole('button', { name: 'Demo-Anfrage abschließen' }).click();

    await expect(page.locator('#error-email')).toContainText('Bitte eine gültige E-Mail-Adresse');
    await expect(page.locator('#error-phone')).toContainText('Bitte eine gültige Telefonnummer');
    await expect(page).toHaveURL(/\/termin-anfrage$/);

    // Leaving both fields empty is allowed – the request goes through anyway.
    await setFieldValue(page, 'email', '');
    await setFieldValue(page, 'phone', '');
    await completeRequest(page);

    await expect(page.locator('dl')).toContainText('Nicht angegeben');
    const dialog = await openPreview(page);
    await expect(dialog).toContainText('Empfänger');
    await expect(dialog).toContainText('Nicht angegeben');
    await expect(dialog).toContainText('Hallo Jennifer Krüger,');
  });

  test('Injection attempts in the name stay text', async ({ page }) => {
    await page.goto('/termin-anfrage');

    await setFieldValue(page, 'name', '<script>alert(1)</script>');
    await setFieldValue(page, 'phone', PHONE_LABEL);
    await setFieldValue(page, 'email', EMAIL_LABEL);
    await selectLastSelectableDay(page);
    await page.getByRole('button', { name: 'Demo-Anfrage abschließen' }).click();

    await expect(page.locator('#error-name')).toContainText('Bitte nur Buchstaben');
    await expect(page.locator('form script')).toHaveCount(0);
  });

  test('An appointment date in the past is also rejected as a field value', async ({ page }) => {
    await page.goto('/termin-anfrage');

    await fillValidValues(page);
    // The calendar blocks such days anyway – here the value comes in as manipulated input.
    await page.evaluate(() => {
      const field = document.querySelector<HTMLInputElement>('input[name="date"]');
      if (field) {
        field.value = '2020-01-02';
      }
    });
    await page.getByRole('button', { name: 'Demo-Anfrage abschließen' }).click();

    await expect(page.locator('#error-date')).toContainText('Vergangenheit');
    await expect(page).toHaveURL(/\/termin-anfrage$/);
  });

  test('Finishing never leaves the browser over the network', async ({ page }) => {
    const postRequests: Request[] = [];
    const payloads: string[] = [];
    page.on('request', (fired) => {
      if (['POST', 'PUT', 'PATCH'].includes(fired.method())) {
        postRequests.push(fired);
      }
      // A GET may not carry input either – for example as query parameters.
      payloads.push(fired.url(), fired.postData() ?? '');
    });

    await page.goto('/');
    await openFormForService(page, 'Bremsenservice');
    await fillValidValues(page);
    await completeRequest(page);
    await openPreview(page);

    // Server actions and mail APIs are gone: there is no endpoint that could receive input,
    // and none is used.
    expect(postRequests, 'no POST requests are sent').toEqual([]);

    const allTraffic = payloads.join(' ');
    for (const value of [NAME_LABEL, EMAIL_LABEL, PHONE_LABEL, NOTE_TEXT]) {
      expect(allTraffic, value).not.toContain(value);
      expect(allTraffic, value).not.toContain(encodeURIComponent(value));
    }
  });

  test('After a reload the demo request is gone', async ({ page }) => {
    await page.goto('/termin-anfrage');
    await fillValidValues(page);
    await completeRequest(page);

    await page.reload();

    await expect(
      page.getByRole('heading', { level: 1, name: 'Demo-Anfrage nicht mehr verfügbar' })
    ).toBeVisible();
    await expect(
      page.getByText(
        'Deine Demo-Anfrage ist nicht mehr verfügbar. Da dieses Projekt keine Daten speichert, kannst du jederzeit eine neue Anfrage erstellen.'
      )
    ).toBeVisible();

    await page.getByRole('link', { name: 'Neue Demo-Anfrage stellen' }).click();
    await expect(page).toHaveURL(/\/termin-anfrage$/);
    await expect(page.locator('#field-name')).toHaveValue('');
  });

  test('Opening the confirmation page directly without a request', async ({ page }) => {
    await page.goto('/termin-anfrage/bestaetigung');
    // Even an old request id from earlier versions leads into the void, not to data.
    await expect(
      page.getByRole('heading', { level: 1, name: 'Demo-Anfrage nicht mehr verfügbar' })
    ).toBeVisible();
    // Even an old request id from earlier versions leads into the void, not to data.
    await page.goto('/termin-anfrage/bestaetigung?id=00000000-0000-4000-8000-000000000000');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Demo-Anfrage nicht mehr verfügbar' })
    ).toBeVisible();
  });

  test('English demo request', async ({ page }) => {
    await page.goto('/en');

    await openFormForService(page, 'Brake service');
    await expect(page.locator('#field-service')).toHaveValue('bremsen');

    await fillValidValues(page, { name: 'Taylor Example', email: 'taylor@example.com' });
    await completeRequest(page, 'Complete demo request');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Demo request completed' })
    ).toBeVisible();
    await expect(page.locator('dl')).toContainText('Taylor Example');
    await expect(page.locator('dl')).toContainText('Brake service');
    await expect(page.getByText(/no real appointment was booked/)).toBeVisible();

    const dialog = await openPreview(page, 'View email preview');
    await expect(dialog).toContainText('Autoservice Demontage – demo');
    await expect(dialog).toContainText('Your demo appointment request – Brake service');
    await expect(dialog).toContainText('Hello Taylor Example,');
    await expect(dialog).toContainText('No email was sent');

    await dialog.getByRole('button', { name: 'Close preview' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await expect(page.getByRole('link', { name: 'Back to homepage' })).toBeVisible();
  });

  test('Is usable on a phone', async ({ browser }) => {
    const requestContext = await browser.newContext({ viewport: { width: 360, height: 640 } });
    const page = await requestContext.newPage();
    await page.goto('/');

    await openFormForService(page, 'Bremsenservice');
    await fillValidValues(page);
    await completeRequest(page);

    await expect(page.locator('dl')).toContainText(NAME_LABEL);

    const dialog = await openPreview(page);
    const box = await dialog.boundingBox();
    const size = await page.evaluate(() => ({
      w: document.documentElement.clientWidth,
      h: document.documentElement.clientHeight,
    }));
    expect(box?.x).toBeGreaterThanOrEqual(8);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(size.w - 8);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(size.h - 8);

    // Long input does not burst the box: no horizontal overflow.
    await expect
      .soft(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(size.w);

    await requestContext.close();
  });

  test('Works in dark mode', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
    });
    await page.goto('/termin-anfrage');

    await fillValidValues(page);
    await completeRequest(page);

    await expect(page.locator('html')).toHaveAttribute('class', /dark/);
    const dialog = await openPreview(page);
    await expect(dialog).toContainText('Hallo Jennifer Krüger,');
    await expect(await dialog.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
      'rgba(0, 0, 0, 0)'
    );
  });

  test('Is operable with the keyboard', async ({ page }) => {
    await page.goto('/termin-anfrage');

    await page.focus('#field-name');
    await page.keyboard.type(NAME_LABEL);
    await page.focus('#field-service');
    await page.keyboard.press('b'); // jumps to "Bremsenservice" in the select
    await expect(page.locator('#field-service')).toHaveValue('bremsen');

    await page.focus('#field-date');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('grid')).toBeVisible();
    await page.keyboard.press('Escape');

    await selectLastSelectableDay(page);

    // Enter in the text field is enough to finish – the button is not the only path.
    await page.focus('#field-email');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/termin-anfrage\/bestaetigung$/);

    const dialog = await openPreview(page);
    await expect(dialog).toBeVisible();
    await expect
      .soft(await dialog.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Focus moves back to the button that opened the preview.
    const focus = await page.evaluate(
      () => (document.activeElement as HTMLElement)?.textContent ?? 'kein Fokus'
    );
    expect(focus).toContain('E-Mail-Vorschau ansehen');
  });
});
