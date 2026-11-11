import { test, expect, type Page } from '@playwright/test';

/**
 * Header und Markenfarben im echten Browser.
 *
 * Geprüft wird zweierlei, das ein DOM-Test nicht sieht:
 *
 * 1. Das Logo wird in seinem echten Seitenverhältnis gerendert – die Datei misst 2172×724
 *    (genau 3:1). Ein gequetschtes Logo fällt nur am gerenderten Bild auf, nicht am DOM.
 * 2. Die Flächen der Markenfarbe tragen Schrift über WCAG-AA. Gemessen wird die tatsächlich
 *    berechnete Schriftfarbe gegen die tatsächlich berechnete Fläche, im hellen wie im
 *    dunklen Farbschema. axe prüft das zusätzlich seitennah (e2e/a11y.spec.ts); diese Specs
 *    halten die vier Kernflächen ausdrücklich fest, damit eine Ausnahme dort nicht still
 *    wieder einziehen kann.
 */

const SEITENVERHÄLTNIS = 2172 / 724;

type rgb = { rot: number; gruen: number; blau: number; alpha: number };

function zerlege(wert: string): rgb {
  const hex = wert.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const ziffern = hex[1].split('');
    const kurz = ziffern.length === 3 || ziffern.length === 4;
    const kanal = (index: number) =>
      kurz
        ? Number(`0x${ziffern[index]}${ziffern[index]}`)
        : Number(`0x${ziffern[index * 2]}${ziffern[index * 2 + 1]}`);
    const alphaZiffer = kurz ? ziffern[3] : (ziffern[6] ?? 'f');

    return {
      rot: kanal(0),
      gruen: kanal(1),
      blau: kanal(2),
      alpha: alphaZiffer === undefined ? 1 : Number(`0x${alphaZiffer}`) / 15,
    };
  }

  const treffer = wert.match(
    /^rgba?\((\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)(?:[,/\s]+(\d+(?:\.\d+)?%?))?\)$/
  );

  if (!treffer) {
    throw new Error(`Farbwert nicht messbar (erwartet rgb/rgba): ${wert}`);
  }

  const [rot, gruen, blau] = [1, 2, 3].map((i) => Number(treffer[i]));
  const alphaRoh = treffer[4];
  const alpha =
    alphaRoh === undefined
      ? 1
      : alphaRoh.endsWith('%')
        ? Number(alphaRoh.slice(0, -1)) / 100
        : Number(alphaRoh);

  return { rot, gruen, blau, alpha };
}

function kontrast(schrift: string, flaeche: string): number {
  const linie = (wert: number) => {
    const k = wert / 255;
    return k <= 0.04045 ? k / 12.92 : Math.pow((k + 0.055) / 1.055, 2.4);
  };

  const tonwert = (farbe: rgb) =>
    0.2126 * linie(farbe.rot) + 0.7152 * linie(farbe.gruen) + 0.0722 * linie(farbe.blau);

  // Halbtransparente Schrift liegt auf der Fläche und wird gemischt, wie der Browser sie zeigt.
  const oben = zerlege(schrift);
  const unten = zerlege(flaeche);
  const mischen = (anteil: number, obenWert: number, untenWert: number) =>
    anteil * obenWert + (1 - anteil) * untenWert;

  const gemischt = {
    rot: mischen(oben.alpha, oben.rot, unten.rot),
    gruen: mischen(oben.alpha, oben.gruen, unten.gruen),
    blau: mischen(oben.alpha, oben.blau, unten.blau),
    alpha: 1,
  };

  const [heller, dunkler] = [tonwert(gemischt), tonwert(unten)].sort((a, b) => b - a);

  return (heller + 0.05) / (dunkler + 0.05);
}

/** Liest im Browser die Schriftfarbe eines Elements und die erste deckende Fläche darüber. */
async function farbenVon(page: Page, selektor: string) {
  return page.evaluate((sel) => {
    const element = document.querySelector<HTMLElement>(sel);
    if (!element) {
      throw new Error(`Element nicht gefunden: ${sel}`);
    }

    /*
     * Tailwind liefert Weiß mit Deckkraft als oklab(... / 0.9), und Chrome gibt solche Werte
     * auch so zurück – rechnerisch ist damit nichts anzufangen. Gemessen wird deshalb über
     * einen Bildpunkt: die Zeichenfläche rechnet jeden gültigen CSS-Farbwert nach sRGB um.
     */
    const bildpunkt = document.createElement('canvas');
    bildpunkt.width = 1;
    bildpunkt.height = 1;
    const malgrund = bildpunkt.getContext('2d', { willReadFrequently: true });
    if (!malgrund) {
      throw new Error('Keine Zeichenfläche zum Messen verfügbar');
    }

    const srgbMessung = (wert: string) => {
      malgrund.fillStyle = '#010203';
      malgrund.fillStyle = wert;
      // Ein unzulässiger Wert lässt den vorherigen Stand stehen – der Marker zeigt ihn an.
      if (malgrund.fillStyle === '#010203' && wert !== '#010203') {
        throw new Error(`Farbwert nicht messbar: ${wert}`);
      }

      malgrund.clearRect(0, 0, 1, 1);
      malgrund.fillRect(0, 0, 1, 1);
      const [rot, gruen, blau, deckung] = Array.from(malgrund.getImageData(0, 0, 1, 1).data);

      return `rgba(${rot}, ${gruen}, ${blau}, ${deckung / 255})`;
    };

    const schrift = srgbMessung(getComputedStyle(element).color);

    let flaeche: string | null = null;
    for (let knoten: HTMLElement | null = element; knoten; knoten = knoten.parentElement) {
      const hintergrund = getComputedStyle(knoten).backgroundColor;
      if (hintergrund && hintergrund !== 'transparent' && !hintergrund.endsWith(', 0)')) {
        flaeche = srgbMessung(hintergrund);
        break;
      }
    }

    if (!flaeche) {
      throw new Error(`Keine Fläche gemessen für: ${sel}`);
    }

    return { schrift, flaeche, selektor: sel };
  }, selektor);
}

/** Die vier Flächen, die Schrift der Marke tragen. */
const FLAECHEN = [
  'header nav a',
  'header select',
  'footer a',
  'footer p.text-xs',
  'main a[href="/termin-anfrage"]',
];

async function flaechenMessen(page: Page) {
  const messung = [];

  for (const selektor of FLAECHEN) {
    const { schrift, flaeche } = await farbenVon(page, selektor);

    messung.push({ selektor, schrift, flaeche, wert: kontrast(schrift, flaeche) });
  }

  return messung;
}

async function ladeLogo(page: Page) {
  await page.goto('/');

  const logo = page.getByRole('link', { name: 'Zur Startseite' }).locator('img');
  await expect(logo).toBeVisible();
  await page.waitForFunction(() => {
    const bild = document.querySelector<HTMLImageElement>('header img');
    return bild !== null && bild.complete && bild.naturalWidth > 0;
  });

  return logo;
}

test.describe('Header-Logo', () => {
  test('rendered im Seitenverhältnis der Datei – helles Farbschema', async ({ page }) => {
    const logo = await ladeLogo(page);

    const maße = await logo.evaluate((knoten) => {
      const bild = knoten as HTMLImageElement;
      const kasten = bild.getBoundingClientRect();
      return {
        natur: bild.naturalWidth / bild.naturalHeight,
        gerendert: kasten.width / kasten.height,
        breite: kasten.width,
        hoehe: kasten.height,
      };
    });

    // Das ausgelieferte Bild ist optimiert und kann in der Kantenlänge gerundet sein; die
    // Seitenverhältnisse dürfen sich nur um Rundungsgrenzen unterscheiden.
    expect(maße.natur).toBeCloseTo(SEITENVERHÄLTNIS, 1);
    // Unverzerrt heißt: gerenderte Box und Bildinhalt haben dasselbe Verhältnis. Die Toleranz
    // von zwei Prozent deckt die Rundung der Kantenlänge auf volle Gerätepixel ab.
    expect(Math.abs(maße.gerendert / maße.natur - 1)).toBeLessThan(0.02);
    // Keine kollabierte Höhe: das Logo füllt den Header, der Header bleibt eine Leiste.
    expect(maße.hoehe).toBeGreaterThan(30);
    expect(maße.breite).toBeGreaterThan(maße.hoehe);
  });

  test('rendered unverzerrt im dunklen Farbschema', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
    });

    const logo = await ladeLogo(page);

    const maße = await logo.evaluate((knoten) => {
      const bild = knoten as HTMLImageElement;
      const kasten = bild.getBoundingClientRect();
      return {
        gerendert: kasten.width / kasten.height,
        natur: bild.naturalWidth / bild.naturalHeight,
      };
    });

    expect(Math.abs(maße.gerendert / maße.natur - 1)).toBeLessThan(0.02);
  });

  test('behält die Geometrie im schmalen Viewport', async ({ browser }) => {
    const kontext = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await kontext.newPage();

    await page.goto('/');
    const logo = page.getByRole('link', { name: 'Zur Startseite' }).locator('img');
    await expect(logo).toBeVisible();

    const maße = await logo.evaluate((knoten) => {
      const bild = knoten as HTMLImageElement;
      const kasten = bild.getBoundingClientRect();
      return {
        verhaeltnis: kasten.width / kasten.height,
        natur: bild.naturalWidth / bild.naturalHeight,
        hoehe: kasten.height,
        innerhalbDesViewports: kasten.right <= window.innerWidth,
      };
    });

    expect(maße.innerhalbDesViewports).toBe(true);
    expect(Math.abs(maße.verhaeltnis / maße.natur - 1)).toBeLessThan(0.02);
    expect(maße.hoehe).toBeGreaterThan(24);

    // Der Menüknopf trägt die Navigation – im schmalen Viewport statt der Linkskette.
    await expect(page.getByLabel('Menu öffnen')).toBeVisible();
    await expect(page.locator('header nav').first()).toBeHidden();

    await kontext.close();
  });
});

test.describe('Kontrast auf den Markenflächen', () => {
  test('hält im hellen Farbschema 4,5:1', async ({ page }) => {
    await page.goto('/');

    for (const messung of await flaechenMessen(page)) {
      expect(
        messung.wert,
        `${messung.selektor}: ${messung.schrift} auf ${messung.flaeche}`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('hält im dunklen Farbschema 4,5:1', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
    });
    await page.goto('/');

    for (const messung of await flaechenMessen(page)) {
      expect(
        messung.wert,
        `${messung.selektor}: ${messung.schrift} auf ${messung.flaeche}`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('nutzt für Flächen mit weißer Schrift das dunklere Token, nicht die reine Marke', async ({
    page,
  }) => {
    await page.goto('/');

    const werte = await page.evaluate(() => {
      const stil = getComputedStyle(document.documentElement);

      return {
        marke: stil.getPropertyValue('--color-brand').trim(),
        flaeche: stil.getPropertyValue('--color-brand-strong').trim(),
        header: getComputedStyle(document.querySelector('header')!).backgroundColor,
      };
    });

    // Die helle Marke bleibt Akzentfarbe; Flächen mit Schrift sind der dunklere Ton.
    expect(werte.marke.toLowerCase()).toBe('#59a305');
    expect(werte.flaeche.toLowerCase()).toBe('#3f6b0b');
    expect(werte.header).toBe('rgb(63, 107, 11)');
    // Weiß auf diesem Ton: 6,33:1.
    expect(kontrast('rgb(255, 255, 255)', werte.header)).toBeGreaterThanOrEqual(4.5);
  });
});
