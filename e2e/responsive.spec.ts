import { test, expect, type Page } from '@playwright/test';

/**
 * Behaviour on narrow and wide viewports – measured in the DOM.
 *
 * Claimed are the properties themselves: which control exists at a narrow width, that it is
 * operable, that the page stays inside the viewport and that the hero image keeps its proportions.
 *
 * The narrow width is 375 px: a small phone. There the header hands its navigation chain over to the
 * menu button, and the footer stays the only permanent link list.
 */

const NARROW_VIEWPORT = { width: 375, height: 667 };
const WIDE_VIEWPORT = { width: 1280, height: 800 };

// Aspect ratio of the file public/Heroimage.png (1686×346).
const HERO_ASPECT_RATIO = 1686 / 346;

async function withoutHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));

  expect(
    dimensions.content,
    `${dimensions.content} px Inhalt über den Viewport von ${dimensions.viewport} px hinaus`
  ).toBeLessThanOrEqual(dimensions.viewport);
}

/** The two `nav` elements in the header: the chain of the wide viewport and the menu. */
function headerNavLinks(page: Page) {
  return page.locator('header nav');
}

test.describe('Narrow viewport', () => {
  test.use({ viewport: NARROW_VIEWPORT });

  test('leaves navigation to the menu button and leads to the sections', async ({ page }) => {
    await page.goto('/');

    const navLinks = headerNavLinks(page);

    // At 375 px the button carries the navigation; the chain is in the DOM but not visible.
    await expect(navLinks).toHaveCount(1);
    await expect(navLinks.first()).toBeHidden();
    await expect(page.getByLabel('Menu öffnen')).toBeVisible();

    await page.getByLabel('Menu öffnen').click();

    await expect(navLinks).toHaveCount(2);

    const menu = navLinks.nth(1);
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Leistungen' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Demo-Ablauf' })).toBeVisible();
    // Language choice and colour switch move into the menu.
    await expect(menu.getByLabel('Sprache')).toBeVisible();

    // One click leads to the section and clears the menu again.
    await menu.getByRole('link', { name: 'Leistungen' }).click();

    await expect(page.locator('#services')).toBeInViewport();
    await expect(navLinks).toHaveCount(1);
    await expect(page.getByLabel('Menu öffnen')).toBeVisible();

    // A press outside the menu closes it as well – otherwise it lies over the content.
    await page.getByLabel('Menu öffnen').click();
    await expect(navLinks).toHaveCount(2);

    // A press outside the menu closes it – otherwise it lies over the content. Driven through
    // a `pointerdown` on `body`, because a click on an element below the menu would only be
    // passed through once the menu was already closed.
    await page.locator('body').dispatchEvent('pointerdown');
    await expect(navLinks).toHaveCount(1);
  });

  test('shows the hero image in its proportions without overflowing', async ({ page }) => {
    await page.goto('/');

    await withoutHorizontalOverflow(page);

    const image = page.locator('#home img').first();
    await expect(image).toBeVisible();

    const dimensions = await image.evaluate((node) => {
      const element = node as HTMLImageElement;
      const box = element.getBoundingClientRect();

      return {
        rendered: box.width / box.height,
        natural: element.naturalWidth / element.naturalHeight,
        height: box.height,
        right: box.right,
        viewport: document.documentElement.clientWidth,
      };
    });

    // The frame follows the class `aspect-[1686/346]`. If the rendered image deviates, it was
    // es gedehnt oder gestaucht.
    expect(
      Math.abs(dimensions.rendered / HERO_ASPECT_RATIO - 1),
      `Rahmenverhältnis ${dimensions.rendered} gegen Datei ${HERO_ASPECT_RATIO}`
    ).toBeLessThan(0.01);

    // The delivered variant is smaller than the file, and the image optimiser rounds its
    // height to whole pixels – which is why 2.5 % here and no decimal precision.
    expect(
      Math.abs(dimensions.natural / HERO_ASPECT_RATIO - 1),
      `Ausgelieferte Variante ${dimensions.natural} gegen 1686×346`
    ).toBeLessThan(0.025);

    expect(dimensions.height).toBeGreaterThan(40);
    expect(dimensions.right).toBeLessThanOrEqual(dimensions.viewport);

    // The main action of the page is reachable on the phone; the same text exists further
    // down a second time, which is why this is scoped to the hero area.
    const handels = page.locator('#home').getByRole('link', { name: 'Demo-Anfrage starten' });
    await expect(handels).toBeVisible();
    await expect(handels).toHaveAttribute('href', /termin-anfrage/);
  });

  test('leads in the footer to both legal pages', async ({ page }) => {
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

test.describe('Wide viewport', () => {
  test.use({ viewport: WIDE_VIEWPORT });

  test('shows the navigation chain without any click and keeps the width', async ({ page }) => {
    await page.goto('/');

    for (const name of ['Start', 'Leistungen', 'Demo-Ablauf']) {
      await expect(
        page.locator('header nav').first().getByRole('link', { name, exact: true })
      ).toBeVisible();
    }

    // The menu button belongs to the narrow viewport; here it would only be a second path.
    await expect(page.getByLabel('Menu öffnen')).toBeHidden();
    await expect(headerNavLinks(page)).toHaveCount(1);

    await page.locator('#services').scrollIntoViewIfNeeded();
    await expect(page.locator('#services')).toBeInViewport();

    await withoutHorizontalOverflow(page);
  });
});
