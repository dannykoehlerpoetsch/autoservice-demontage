import { test, expect, type Page, type Request } from '@playwright/test';

/**
 * Der Weg einer Demo-Anfrage: Service-Dialog -> Formular -> Zusammenfassung -> E-Mail-Vorschau.
 *
 * Geprüft wird der Fluss, nicht eine Anbindung: Es gibt keinen Server, der die Eingaben je zu
 * sehen bekommt. Ein Test lauscht deshalb auf jedes Netz und verlangt, dass beim Abschließen
 * nichts hinausgeht. Der Tag wird im Kalender-Popover gegriffen (der letzte wählbare Tag des
 * sichtbaren Monats), damit die Specs nicht an ein festes Datum gebunden sind.
 */

const NAME = 'Jennifer Krüger';
const TELEFON = '+49 170 1234567';
const EMAIL = 'j.krueger@beispiel.de';
const BEMERKUNG = 'Das Bremspedal pumpt.';

async function oeffneFormularFuerService(page: Page, serviceHeading: string) {
  await page.locator(`#services button:has-text("${serviceHeading}")`).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  // Der erste Knopf im Dialog ist der Demo-CTA, der zweite schließt.
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

/** Füllt das Formular so, dass das Schema es akzeptieren muss. */
async function gueltigAusfuellen(page: Page, abweichungen: Record<string, string> = {}) {
  const werte = {
    name: NAME,
    phone: TELEFON,
    email: EMAIL,
    note: BEMERKUNG,
    service: 'bremsen',
    ...abweichungen,
  };

  await page.selectOption('#field-service', werte.service);
  await feldSetzen(page, 'name', werte.name);
  await feldSetzen(page, 'phone', werte.phone);
  await feldSetzen(page, 'email', werte.email);
  if (werte.note) {
    await feldSetzen(page, 'note', werte.note);
  }
  await waehleLetztenWahlbarenTag(page);
}

async function abschliessen(page: Page, knopfName = 'Demo-Anfrage abschließen') {
  await page.getByRole('button', { name: knopfName }).click();
  await expect(page).toHaveURL(/termin-anfrage\/bestaetigung$/);
}

/** Öffnet die E-Mail-Vorschau und liefert den Dialog. */
async function vorschauOeffnen(page: Page, knopfName = 'E-Mail-Vorschau ansehen') {
  await page.getByRole('button', { name: knopfName }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('Demo-Terminanfrage', () => {
  test('Demo-Anfrage auf Deutsch bis zur E-Mail-Vorschau', async ({ page }) => {
    await page.goto('/');

    await oeffneFormularFuerService(page, 'Bremsenservice');
    await expect(page.locator('#field-service')).toHaveValue('bremsen');

    // Das Formular sagt selbst, dass es eine Demo ist.
    await expect(
      page.getByText('Es werden keine Daten versendet und keine echten Termine vereinbart.')
    ).toBeVisible();
    await expect(page.getByText(/Testdaten genügen/)).toBeVisible();

    await gueltigAusfuellen(page);

    await abschliessen(page);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Demo-Anfrage erfolgreich abgeschlossen' })
    ).toBeVisible();
    await expect(page).toHaveURL(/termin-anfrage\/bestaetigung$/);
    // Keine Anfrage-Kennung in der URL – die Zusammenfassung kommt aus dem Browser.
    await expect(page).not.toHaveURL(/[?&]id=/);

    const zusammenfassung = page.locator('dl');
    await expect(zusammenfassung).toContainText(NAME);
    await expect(zusammenfassung).toContainText('Bremsenservice');
    await expect(zusammenfassung).toContainText(TELEFON);
    await expect(zusammenfassung).toContainText(EMAIL);
    await expect(zusammenfassung).toContainText(BEMERKUNG);
    await expect(zusammenfassung).toContainText('Terminwunsch');
    await expect(page.getByText(/Es wurde kein echter Termin gebucht/)).toBeVisible();

    // Vorschau: sie zeigt denselben Text, verschickt ihn aber nicht.
    const dialog = await vorschauOeffnen(page);
    await expect(dialog).toContainText('Bennis Garage – Demo');
    await expect(dialog).toContainText(EMAIL);
    await expect(dialog).toContainText('Deine Demo-Terminanfrage – Bremsenservice');
    await expect(dialog).toContainText(`Hallo ${NAME},`);
    await expect(dialog).toContainText('Gewünschter Service: Bremsenservice');
    await expect(dialog).toContainText('Es wurde keine E-Mail versendet');
    // Einen Versandknopf darf es nicht geben.
    await expect(dialog.getByRole('button', { name: /senden|versenden/i })).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Bearbeiten: dieselbe Anfrage, neue Werte, neue Zusammenfassung.
    await page.getByRole('button', { name: 'Angaben bearbeiten' }).click();
    await expect(page).toHaveURL(/\/termin-anfrage$/);
    await expect(page.locator('#field-name')).toHaveValue(NAME);
    await expect(page.locator('#field-service')).toHaveValue('bremsen');

    await feldSetzen(page, 'name', 'Max Mustermann');
    await feldSetzen(page, 'note', 'Nur noch der Rückwärtsgang quietscht.');
    await abschliessen(page);

    await expect(page.locator('dl')).toContainText('Max Mustermann');
    await expect(page.locator('dl')).toContainText('Nur noch der Rückwärtsgang quietscht.');
    await expect(page.locator('dl')).not.toContainText('Das Bremspedal pumpt.');

    await expect(page.getByRole('link', { name: 'Zurück zur Startseite' })).toBeVisible();
  });

  test('Leere Pflichtfelder meldet das Schema, nicht der Browser', async ({ page }) => {
    await page.goto('/termin-anfrage');

    await page.getByRole('button', { name: 'Demo-Anfrage abschließen' }).click();

    await expect(page.locator('#form-errors')).toContainText('Bitte prüf folgende Felder');
    for (const feld of ['name', 'service', 'date']) {
      await expect(page.locator(`#error-${feld}`)).toBeVisible();
    }
    // Freiwillige Felder werden nicht angemahnt.
    await expect(page.locator('#error-phone')).toHaveCount(0);
    await expect(page.locator('#error-email')).toHaveCount(0);
    await expect(page).toHaveURL(/\/termin-anfrage$/);
  });

  test('Ungültige Kontaktdaten werden nur angemahnt, wenn sie eingetragen sind', async ({
    page,
  }) => {
    await page.goto('/termin-anfrage');

    await gueltigAusfuellen(page, { email: 'max@bennis', phone: 'nine one two' });
    await page.getByRole('button', { name: 'Demo-Anfrage abschließen' }).click();

    await expect(page.locator('#error-email')).toContainText('Bitte eine gültige E-Mail-Adresse');
    await expect(page.locator('#error-phone')).toContainText('Bitte eine gültige Telefonnummer');
    await expect(page).toHaveURL(/\/termin-anfrage$/);

    // Beide Felder leer lassen ist erlaubt – die Anfrage geht trotzdem durch.
    await feldSetzen(page, 'email', '');
    await feldSetzen(page, 'phone', '');
    await abschliessen(page);

    await expect(page.locator('dl')).toContainText('Nicht angegeben');
    const dialog = await vorschauOeffnen(page);
    await expect(dialog).toContainText('Empfänger');
    await expect(dialog).toContainText('Nicht angegeben');
    await expect(dialog).toContainText('Hallo Jennifer Krüger,');
  });

  test('Einschleuseversuche im Namen bleiben Text', async ({ page }) => {
    await page.goto('/termin-anfrage');

    await feldSetzen(page, 'name', '<script>alert(1)</script>');
    await feldSetzen(page, 'phone', TELEFON);
    await feldSetzen(page, 'email', EMAIL);
    await waehleLetztenWahlbarenTag(page);
    await page.getByRole('button', { name: 'Demo-Anfrage abschließen' }).click();

    await expect(page.locator('#error-name')).toContainText('Bitte nur Buchstaben');
    await expect(page.locator('form script')).toHaveCount(0);
  });

  test('Ein Termindatum in der Vergangenheit wird auch als Feldwert abgewehrt', async ({
    page,
  }) => {
    await page.goto('/termin-anfrage');

    await gueltigAusfuellen(page);
    // Der Kalender sperrt solche Tage ohnehin – hier kommt der Wert als manipulierte Eingabe rein.
    await page.evaluate(() => {
      const feld = document.querySelector<HTMLInputElement>('input[name="date"]');
      if (feld) {
        feld.value = '2020-01-02';
      }
    });
    await page.getByRole('button', { name: 'Demo-Anfrage abschließen' }).click();

    await expect(page.locator('#error-date')).toContainText('Vergangenheit');
    await expect(page).toHaveURL(/\/termin-anfrage$/);
  });

  test('Beim Abschließen geht nichts über das Netz hinaus', async ({ page }) => {
    const senden: Request[] = [];
    const korper: string[] = [];
    page.on('request', (anfrage) => {
      if (['POST', 'PUT', 'PATCH'].includes(anfrage.method())) {
        senden.push(anfrage);
      }
      // Auch ein GET darf keine Eingaben tragen – etwa als Query-Parameter.
      korper.push(anfrage.url(), anfrage.postData() ?? '');
    });

    await page.goto('/');
    await oeffneFormularFuerService(page, 'Bremsenservice');
    await gueltigAusfuellen(page);
    await abschliessen(page);
    await vorschauOeffnen(page);

    // Server Actions und Mail-APIs sind weg: es gibt keinen Endpunkt, der Eingaben empfangen
    // könnte, und es wird keiner benutzt.
    expect(senden, 'Es werden keine POSTs verschickt.').toEqual([]);

    const altes = korper.join(' ');
    for (const wert of [NAME, EMAIL, TELEFON, BEMERKUNG]) {
      expect(altes, wert).not.toContain(wert);
      expect(altes, wert).not.toContain(encodeURIComponent(wert));
    }
  });

  test('Nach dem Neuladen ist die Demo-Anfrage weg', async ({ page }) => {
    await page.goto('/termin-anfrage');
    await gueltigAusfuellen(page);
    await abschliessen(page);

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

  test('Direkter Aufruf der Bestätigungsseite ohne Anfrage', async ({ page }) => {
    await page.goto('/termin-anfrage/bestaetigung');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Demo-Anfrage nicht mehr verfügbar' })
    ).toBeVisible();
    // Auch eine alte Anfrage-Kennung aus früheren Versionen führt ins Leere, nicht zu Daten.
    await page.goto('/termin-anfrage/bestaetigung?id=00000000-0000-4000-8000-000000000000');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Demo-Anfrage nicht mehr verfügbar' })
    ).toBeVisible();
  });

  test('Demo-Anfrage auf Englisch', async ({ page }) => {
    await page.goto('/en');

    await oeffneFormularFuerService(page, 'Brake service');
    await expect(page.locator('#field-service')).toHaveValue('bremsen');

    await gueltigAusfuellen(page, { name: 'Taylor Example', email: 'taylor@example.com' });
    await abschliessen(page, 'Complete demo request');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Demo request completed' })
    ).toBeVisible();
    await expect(page.locator('dl')).toContainText('Taylor Example');
    await expect(page.locator('dl')).toContainText('Brake service');
    await expect(page.getByText(/no real appointment was booked/)).toBeVisible();

    const dialog = await vorschauOeffnen(page, 'View email preview');
    await expect(dialog).toContainText('Bennis Garage – demo');
    await expect(dialog).toContainText('Your demo appointment request – Brake service');
    await expect(dialog).toContainText('Hello Taylor Example,');
    await expect(dialog).toContainText('No email was sent');

    await dialog.getByRole('button', { name: 'Close preview' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await expect(page.getByRole('link', { name: 'Back to homepage' })).toBeVisible();
  });

  test('Ist auf dem Handy bedienbar', async ({ browser }) => {
    const kontext = await browser.newContext({ viewport: { width: 360, height: 640 } });
    const page = await kontext.newPage();
    await page.goto('/');

    await oeffneFormularFuerService(page, 'Bremsenservice');
    await gueltigAusfuellen(page);
    await abschliessen(page);

    await expect(page.locator('dl')).toContainText(NAME);

    const dialog = await vorschauOeffnen(page);
    const box = await dialog.boundingBox();
    const groesse = await page.evaluate(() => ({
      w: document.documentElement.clientWidth,
      h: document.documentElement.clientHeight,
    }));
    expect(box?.x).toBeGreaterThanOrEqual(8);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(groesse.w - 8);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(groesse.h - 8);

    // Lange Eingaben sprengen die Box nicht: kein horizontales Überlaufen.
    await expect
      .soft(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(groesse.w);

    await kontext.close();
  });

  test('Funktioniert im Dunkelmodus', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
    });
    await page.goto('/termin-anfrage');

    await gueltigAusfuellen(page);
    await abschliessen(page);

    await expect(page.locator('html')).toHaveAttribute('class', /dark/);
    const dialog = await vorschauOeffnen(page);
    await expect(dialog).toContainText('Hallo Jennifer Krüger,');
    await expect(await dialog.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
      'rgba(0, 0, 0, 0)'
    );
  });

  test('Ist mit der Tastatur zu bedienen', async ({ page }) => {
    await page.goto('/termin-anfrage');

    await page.focus('#field-name');
    await page.keyboard.type(NAME);
    await page.focus('#field-service');
    await page.keyboard.press('b'); // springt im select auf "Bremsenservice"
    await expect(page.locator('#field-service')).toHaveValue('bremsen');

    await page.focus('#field-date');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('grid')).toBeVisible();
    await page.keyboard.press('Escape');

    await waehleLetztenWahlbarenTag(page);

    // Enter im Textfeld reicht zum Abschließen – der Knopf ist nicht der einzige Weg.
    await page.focus('#field-email');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/termin-anfrage\/bestaetigung$/);

    const dialog = await vorschauOeffnen(page);
    await expect(dialog).toBeVisible();
    await expect
      .soft(await dialog.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Der Fokus wandert zurück zum Knopf, der die Vorschau geöffnet hat.
    const fokus = await page.evaluate(
      () => (document.activeElement as HTMLElement)?.textContent ?? 'kein Fokus'
    );
    expect(fokus).toContain('E-Mail-Vorschau ansehen');
  });
});
