import { test, expect, type Page } from '@playwright/test';

/**
 * Verhalten auf schmalen und breiten Viewports – im DOM gemessen, nicht als Bild.
 *
 * Was ein Bildvergleich zeigen sollte, steht hier als behauptete Eigenschaft: welche Steuerung es
 * in schmaler Breite gibt, dass sie bedienbar ist, dass die Seite innerhalb des Viewports bleibt
 * und dass das Hero-Bild seine Proportionen behält. Dafür ist kein Referenzbild nötig
 * – und damit pflegt auch niemand eins.
 *
 * Die schmale Breite ist 375 px: ein kleines Telefon. Dort übergibt der Kopfbereich seine
 * Navigationskette an den Menüknopf, und der Fußbereich bleibt die einzige ständige Linkliste.
 */

const SCHMAL = { width: 375, height: 667 };
const BREIT = { width: 1280, height: 800 };

// Seitenverhältnis der Datei public/Heroimage.png (1686×346).
const HERO_SEITENVERHÄLTNIS = 1686 / 346;

async function ohneHorizontalesUberlaufen(page: Page) {
  const maße = await page.evaluate(() => ({
    inhalt: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));

  expect(
    maße.inhalt,
    `${maße.inhalt} px Inhalt über den Viewport von ${maße.viewport} px hinaus`
  ).toBeLessThanOrEqual(maße.viewport);
}

/** Die beiden `nav`-Elemente im Kopfbereich: die Kette des breiten Viewports und das Menü. */
function kopfNavigationen(page: Page) {
  return page.locator('header nav');
}

test.describe('Schmaler Viewport', () => {
  test.use({ viewport: SCHMAL });

  test('überlässt die Navigation dem Menüknopf und führt zu den Abschnitten', async ({ page }) => {
    await page.goto('/');

    const navigationen = kopfNavigationen(page);

    // Bei 375 px trägt der Knopf die Navigation; die Kette ist im DOM, aber nicht sichtbar.
    await expect(navigationen).toHaveCount(1);
    await expect(navigationen.first()).toBeHidden();
    await expect(page.getByLabel('Menu öffnen')).toBeVisible();

    await page.getByLabel('Menu öffnen').click();

    await expect(navigationen).toHaveCount(2);

    const menue = navigationen.nth(1);
    await expect(menue).toBeVisible();
    await expect(menue.getByRole('link', { name: 'Leistungen' })).toBeVisible();
    await expect(menue.getByRole('link', { name: 'Demo-Ablauf' })).toBeVisible();
    // Sprachwahl und Farbumschaltung wandern in das Menü hinein.
    await expect(menue.getByLabel('Sprache')).toBeVisible();

    // Ein Klick führt zum Abschnitt und räumt das Menü wieder weg.
    await menue.getByRole('link', { name: 'Leistungen' }).click();

    await expect(page.locator('#services')).toBeInViewport();
    await expect(navigationen).toHaveCount(1);
    await expect(page.getByLabel('Menu öffnen')).toBeVisible();

    // Auch ein Druck außerhalb des Menüs schließt es – sonst liegt es über dem Inhalt.
    await page.getByLabel('Menu öffnen').click();
    await expect(navigationen).toHaveCount(2);

    // Ein Druck außerhalb des Menüs schließt es – sonst liegt es über dem Inhalt. Gesteuert über
    // ein `pointerdown` auf `body`, denn ein Klick auf ein Element unter dem Menü würde erst
    // durchgereicht, wenn das Menü schon zu wäre.
    await page.locator('body').dispatchEvent('pointerdown');
    await expect(navigationen).toHaveCount(1);
  });

  test('zeigt das Hero-Bild in seinen Proportionen und läuft nicht über', async ({ page }) => {
    await page.goto('/');

    await ohneHorizontalesUberlaufen(page);

    const bild = page.locator('#home img').first();
    await expect(bild).toBeVisible();

    const maße = await bild.evaluate((knoten) => {
      const element = knoten as HTMLImageElement;
      const kasten = element.getBoundingClientRect();

      return {
        gerendert: kasten.width / kasten.height,
        natur: element.naturalWidth / element.naturalHeight,
        hoehe: kasten.height,
        rechts: kasten.right,
        viewport: document.documentElement.clientWidth,
      };
    });

    // Der Rahmen folgt der Klasse `aspect-[1686/346]`. Weicht das gerenderte Bild davon ab, wurde
    // es gedehnt oder gestaucht.
    expect(
      Math.abs(maße.gerendert / HERO_SEITENVERHÄLTNIS - 1),
      `Rahmenverhältnis ${maße.gerendert} gegen Datei ${HERO_SEITENVERHÄLTNIS}`
    ).toBeLessThan(0.01);

    // Die ausgelieferte Variante ist kleiner als die Datei, und der Bildoptimierer rundet ihre
    // Höhe auf ganze Pixel – deshalb hier 2,5 % und keine Nachkomma-Genauigkeit.
    expect(
      Math.abs(maße.natur / HERO_SEITENVERHÄLTNIS - 1),
      `Ausgelieferte Variante ${maße.natur} gegen 1686×346`
    ).toBeLessThan(0.025);

    expect(maße.hoehe).toBeGreaterThan(40);
    expect(maße.rechts).toBeLessThanOrEqual(maße.viewport);

    // Die Hauptaktion der Seite ist auf dem Telefon zu erreichen; denselben Text gibt es weiter
    // unten ein zweites Mal, deshalb auf den Hero-Bereich eingegrenzt.
    const handels = page.locator('#home').getByRole('link', { name: 'Demo-Anfrage starten' });
    await expect(handels).toBeVisible();
    await expect(handels).toHaveAttribute('href', /termin-anfrage/);
  });

  test('führt im Fußbereich zu beiden Rechtsseiten', async ({ page }) => {
    await page.goto('/');

    const spalte = page.getByRole('navigation', { name: 'Rechtliche Seiten' });
    await expect(spalte).toBeVisible();

    await spalte.getByRole('link', { name: 'Impressum' }).click();
    await expect(page).toHaveURL(/\/impressum$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Impressum' })).toBeVisible();

    await page.goto('/');
    await spalte.getByRole('link', { name: 'Datenschutzerklärung' }).click();
    await expect(page).toHaveURL(/\/datenschutz$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('Breiter Viewport', () => {
  test.use({ viewport: BREIT });

  test('zeigt die Navigationskette ohne jeden Klick und hält die Breite ein', async ({ page }) => {
    await page.goto('/');

    for (const name of ['Start', 'Leistungen', 'Demo-Ablauf']) {
      await expect(
        page.locator('header nav').first().getByRole('link', { name, exact: true })
      ).toBeVisible();
    }

    // Der Menüknopf gehört auf den schmalen Viewport; hier wäre er nur ein zweiter Weg.
    await expect(page.getByLabel('Menu öffnen')).toBeHidden();
    await expect(kopfNavigationen(page)).toHaveCount(1);

    await page.locator('#services').scrollIntoViewIfNeeded();
    await expect(page.locator('#services')).toBeInViewport();

    await ohneHorizontalesUberlaufen(page);
  });
});
