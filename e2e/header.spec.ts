import { test, expect, type Page } from '@playwright/test';

/**
 * Header and brand colours in a real browser.
 *
 * Two things are checked that a DOM test cannot see:
 *
 * 1. The logo is rendered in its real aspect ratio – the file measures 2172×724 (exactly 3:1). A
 *    squeezed logo only shows on the rendered image, not on the DOM.
 * 2. The brand-colour surfaces carry text over WCAG-AA. Measured is the actually computed text
 *    colour against the actually computed surface, in the light as in the dark scheme. axe checks
 *    that additionally close to the page (e2e/a11y.spec.ts); these specs pin the four core surfaces
 *    explicitly so that an exception cannot quietly move back in there.
 */

const ASPECT_RATIO = 2172 / 724;

type rgb = { red: number; green: number; blue: number; alpha: number };

function parseColor(value: string): rgb {
  const hex = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const digits = hex[1].split('');
    const isShortForm = digits.length === 3 || digits.length === 4;
    const channel = (index: number) =>
      isShortForm
        ? Number(`0x${digits[index]}${digits[index]}`)
        : Number(`0x${digits[index * 2]}${digits[index * 2 + 1]}`);
    const alphaDigit = isShortForm ? digits[3] : (digits[6] ?? 'f');

    return {
      red: channel(0),
      green: channel(1),
      blue: channel(2),
      alpha: alphaDigit === undefined ? 1 : Number(`0x${alphaDigit}`) / 15,
    };
  }

  const match = value.match(
    /^rgba?\((\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)(?:[,/\s]+(\d+(?:\.\d+)?%?))?\)$/
  );

  if (!match) {
    throw new Error(`colour value not measurable (erwartet rgb/rgba): ${value}`);
  }

  const [red, green, blue] = [1, 2, 3].map((i) => Number(match[i]));
  const rawAlpha = match[4];
  const alpha =
    rawAlpha === undefined
      ? 1
      : rawAlpha.endsWith('%')
        ? Number(rawAlpha.slice(0, -1)) / 100
        : Number(rawAlpha);

  return { red, green, blue, alpha };
}

function contrast(textColor: string, backgroundColor: string): number {
  const toLinearChannel = (value: number) => {
    const k = value / 255;
    return k <= 0.04045 ? k / 12.92 : Math.pow((k + 0.055) / 1.055, 2.4);
  };

  const channelValue = (colorParts: rgb) =>
    0.2126 * toLinearChannel(colorParts.red) +
    0.7152 * toLinearChannel(colorParts.green) +
    0.0722 * toLinearChannel(colorParts.blue);

  // Semi-transparent text lies on the surface and is blended the way the browser shows it.
  const topEdge = parseColor(textColor);
  const bottomEdge = parseColor(backgroundColor);
  const blend = (share: number, topValue: number, bottomValue: number) =>
    share * topValue + (1 - share) * bottomValue;

  const blended = {
    red: blend(topEdge.alpha, topEdge.red, bottomEdge.red),
    green: blend(topEdge.alpha, topEdge.green, bottomEdge.green),
    blue: blend(topEdge.alpha, topEdge.blue, bottomEdge.blue),
    alpha: 1,
  };

  const [heller, dunkler] = [channelValue(blended), channelValue(bottomEdge)].sort((a, b) => b - a);

  return (heller + 0.05) / (dunkler + 0.05);
}

/** Reads the text colour of an element in the browser and the first covering surface above it. */
async function colorsOf(page: Page, selector: string) {
  return page.evaluate((target) => {
    const element = document.querySelector<HTMLElement>(target);
    if (!element) {
      throw new Error(`element not found: ${target}`);
    }

    /*
     * Tailwind delivers white with opacity as oklab(... / 0.9) and Chrome returns such values as
     * they are – computationally nothing can be started with that. Measuring therefore happens
     * through one pixel: the canvas converts any valid CSS colour value to sRGB.
     */
    const pixel = document.createElement('canvas');
    pixel.width = 1;
    pixel.height = 1;
    const surface = pixel.getContext('2d', { willReadFrequently: true });
    if (!surface) {
      throw new Error('no canvas available for measuring');
    }

    const srgbReading = (value: string) => {
      surface.fillStyle = '#010203';
      surface.fillStyle = value;
      // A disallowed value leaves the previous state standing – the marker shows it.
      if (surface.fillStyle === '#010203' && value !== '#010203') {
        throw new Error(`colour value not measurable: ${value}`);
      }

      surface.clearRect(0, 0, 1, 1);
      surface.fillRect(0, 0, 1, 1);
      const [red, green, blue, alphaByte] = Array.from(surface.getImageData(0, 0, 1, 1).data);

      return `rgba(${red}, ${green}, ${blue}, ${alphaByte / 255})`;
    };

    const textColor = srgbReading(getComputedStyle(element).color);

    let backgroundColor: string | null = null;
    for (let node: HTMLElement | null = element; node; node = node.parentElement) {
      const background = getComputedStyle(node).backgroundColor;
      if (background && background !== 'transparent' && !background.endsWith(', 0)')) {
        backgroundColor = srgbReading(background);
        break;
      }
    }

    if (!backgroundColor) {
      throw new Error(`no surface measured for: ${target}`);
    }

    return { textColor, backgroundColor, selector: target };
  }, selector);
}

/** The four surfaces that carry text of the brand. */
const SURFACE_SELECTORS = [
  'header nav a',
  'header select',
  'footer a',
  'footer p.text-xs',
  'main a[href="/termin-anfrage"]',
];

async function measureAreas(page: Page) {
  const messung = [];

  for (const selector of SURFACE_SELECTORS) {
    const { textColor, backgroundColor } = await colorsOf(page, selector);

    messung.push({
      selector,
      textColor,
      backgroundColor,
      value: contrast(textColor, backgroundColor),
    });
  }

  return messung;
}

async function loadLogo(page: Page) {
  await page.goto('/');

  const logo = page.getByRole('link', { name: 'Zur Startseite' }).locator('img');
  await expect(logo).toBeVisible();
  await page.waitForFunction(() => {
    const image = document.querySelector<HTMLImageElement>('header img');
    return image !== null && image.complete && image.naturalWidth > 0;
  });

  return logo;
}

test.describe('Header logo', () => {
  test("renders at the file's aspect ratio – light colour scheme", async ({ page }) => {
    const logo = await loadLogo(page);

    const dimensions = await logo.evaluate((node) => {
      const image = node as HTMLImageElement;
      const box = image.getBoundingClientRect();
      return {
        natural: image.naturalWidth / image.naturalHeight,
        rendered: box.width / box.height,
        width: box.width,
        height: box.height,
      };
    });

    // The delivered image is optimised and may be rounded in edge length; the
    // aspect ratios may only differ by rounding margins.
    expect(dimensions.natural).toBeCloseTo(ASPECT_RATIO, 1);
    // Undistorted means: rendered box and image content have the same ratio. The two
    // percent tolerance covers rounding the edge length to whole device pixels.
    expect(Math.abs(dimensions.rendered / dimensions.natural - 1)).toBeLessThan(0.02);
    // No collapsed height: the logo fills the header, the header stays a bar.
    expect(dimensions.height).toBeGreaterThan(30);
    expect(dimensions.width).toBeGreaterThan(dimensions.height);
  });

  test('renders undistorted in the dark colour scheme', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
    });

    const logo = await loadLogo(page);

    const dimensions = await logo.evaluate((node) => {
      const image = node as HTMLImageElement;
      const box = image.getBoundingClientRect();
      return {
        rendered: box.width / box.height,
        natural: image.naturalWidth / image.naturalHeight,
      };
    });

    expect(Math.abs(dimensions.rendered / dimensions.natural - 1)).toBeLessThan(0.02);
  });

  test('keeps the geometry in the narrow viewport', async ({ browser }) => {
    const requestContext = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await requestContext.newPage();

    await page.goto('/');
    const logo = page.getByRole('link', { name: 'Zur Startseite' }).locator('img');
    await expect(logo).toBeVisible();

    const dimensions = await logo.evaluate((node) => {
      const image = node as HTMLImageElement;
      const box = image.getBoundingClientRect();
      return {
        ratio: box.width / box.height,
        natural: image.naturalWidth / image.naturalHeight,
        height: box.height,
        withinViewport: box.right <= window.innerWidth,
      };
    });

    expect(dimensions.withinViewport).toBe(true);
    expect(Math.abs(dimensions.ratio / dimensions.natural - 1)).toBeLessThan(0.02);
    expect(dimensions.height).toBeGreaterThan(24);

    // The menu button carries the navigation – in the narrow viewport instead of the link chain.
    await expect(page.getByLabel('Menu öffnen')).toBeVisible();
    await expect(page.locator('header nav').first()).toBeHidden();

    await requestContext.close();
  });
});

test.describe('Contrast on the brand surfaces', () => {
  test('holds 4.5:1 in the light colour scheme', async ({ page }) => {
    await page.goto('/');

    for (const messung of await measureAreas(page)) {
      expect(
        messung.value,
        `${messung.selector}: ${messung.textColor} auf ${messung.backgroundColor}`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('holds 4.5:1 in the dark colour scheme', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
    });
    await page.goto('/');

    for (const messung of await measureAreas(page)) {
      expect(
        messung.value,
        `${messung.selector}: ${messung.textColor} auf ${messung.backgroundColor}`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('uses the darker token for surfaces with white text, not the pure brand colour', async ({
    page,
  }) => {
    await page.goto('/');

    const values = await page.evaluate(() => {
      const stil = getComputedStyle(document.documentElement);

      return {
        brandColor: stil.getPropertyValue('--color-brand').trim(),
        backgroundColor: stil.getPropertyValue('--color-brand-strong').trim(),
        header: getComputedStyle(document.querySelector('header')!).backgroundColor,
      };
    });

    // The light brand stays the accent colour; surfaces carrying text are the darker tone.
    expect(values.brandColor.toLowerCase()).toBe('#59a305');
    expect(values.backgroundColor.toLowerCase()).toBe('#3f6b0b');
    expect(values.header).toBe('rgb(63, 107, 11)');
    // White on this tone: 6.33:1.
    expect(contrast('rgb(255, 255, 255)', values.header)).toBeGreaterThanOrEqual(4.5);
  });
});
