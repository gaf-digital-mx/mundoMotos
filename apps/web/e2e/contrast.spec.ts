import { expect, test, type Locator, type Page } from '@playwright/test';
import sharp from 'sharp';

/**
 * Contrast over the section photographs, which nothing else checks.
 *
 * axe reports text on an image as `incomplete` rather than a violation, and the accessibility
 * assertions elsewhere only fail on violations — so the veils that keep this copy readable were
 * never covered. These sample the pixels the browser actually painted behind each element.
 *
 * Every element is measured at both ends of the parallax travel, because the drift slides the
 * picture under the copy: contrast over a moving photograph is a range, not a number, and the
 * middle of the range is the one position that proves nothing.
 */

/** The keyframes in globals.css. The layer is pinned at each in turn. */
const DRIFTS = ['-8%', '0%', '8%'] as const;

const channel = (value: number) => {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

const luminance = (r: number, g: number, b: number) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const parseRgb = (color: string): [number, number, number] => {
  const parts = color.match(/[\d.]+/g)?.map(Number) ?? [];
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
};

/** 1.4.3: 18.66px bold or 24px counts as large text, and the bar drops from 4.5:1 to 3:1. */
const required = (fontSize: number, weight: number) =>
  fontSize >= 24 || (fontSize >= 18.66 && weight >= 700) ? 3 : 4.5;

/**
 * The worst contrast `color` reaches against anything painted behind `region`, with `hide`
 * taken out of the picture first so the shot is background only.
 */
const worstAgainst = async (page: Page, region: Locator, hide: Locator, color: string) => {
  const box = await region.boundingBox();
  if (!box) throw new Error('the element being measured has no box');
  await hide.evaluate((node: HTMLElement) => {
    node.style.visibility = 'hidden';
  });
  const shot = await page.screenshot({ clip: box });
  await hide.evaluate((node: HTMLElement) => {
    node.style.visibility = '';
  });
  const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
  const [r, g, b] = parseRgb(color);
  const front = luminance(r, g, b);
  let worst = 21;
  for (let i = 0; i < data.length; i += info.channels) {
    const behind = luminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
    worst = Math.min(worst, ratio(front, behind));
  }
  return worst;
};

/** Pins the drift so the photograph is measured where it actually reaches, not mid-travel. */
const pinDrift = async (page: Page, drift: string) => {
  await page.locator('[data-parallax]').evaluateAll((nodes, value) => {
    for (const node of nodes as HTMLElement[]) {
      node.style.animation = 'none';
      node.style.translate = `0 ${value}`;
    }
  }, drift);
};

const checkText = async (page: Page, selector: string) => {
  const target = page.locator(selector).first();
  const { color, size, weight } = await target.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      color: style.color,
      size: Number.parseFloat(style.fontSize),
      weight: Number.parseInt(style.fontWeight, 10) || 400,
    };
  });
  const worst = await worstAgainst(page, target, target, color);
  expect(worst, `${selector} at ${size}px/${weight}`).toBeGreaterThanOrEqual(
    required(size, weight),
  );
};

const settle = async (page: Page, anchor: string) => {
  await page.goto('/');
  await page.locator(anchor).scrollIntoViewIfNeeded();
  // The photographs are lazy-loaded, and a frame that has not decoded yet measures as the page
  // behind it, which would pass for the wrong reason.
  await expect
    .poll(async () =>
      page
        .locator('[data-parallax]')
        .evaluateAll((nodes) => nodes.every((n) => (n as HTMLImageElement).complete)),
    )
    .toBe(true);
  await page.waitForTimeout(400);
};

// Contrast is a property of the stylesheet and the picture, not of the engine, and sampling
// rendered pixels across two of them only buys rounding differences.
test.skip(({ browserName }) => browserName !== 'chromium', 'one engine is enough for pixels');

test.describe('contrast over the section photographs', () => {
  test.describe('on a phone', () => {
    for (const drift of DRIFTS) {
      test(`the closing CTA holds its copy at ${drift}`, async ({ page }) => {
        await settle(page, '[aria-labelledby="cta-title"]');
        await pinDrift(page, drift);
        await checkText(page, '#cta-title');
        await checkText(page, '#cta-title + p');
      });

      test(`the contact section holds its copy at ${drift}`, async ({ page }) => {
        await settle(page, '#contacto');
        await pinDrift(page, drift);
        await checkText(page, '#contact-title');
        await checkText(page, '#contact-title ~ p');
        await checkText(page, '#contacto label');
      });
    }
  });

  test.describe('on a wide screen', () => {
    // The only place the contact section is two columns, with the form beside the heading
    // rather than under it — and the form is the half that lands on the lit half of the photo.
    test.use({ viewport: { width: 1440, height: 900 } });

    for (const drift of DRIFTS) {
      test(`the closing CTA holds its copy at ${drift}`, async ({ page }) => {
        await settle(page, '[aria-labelledby="cta-title"]');
        await pinDrift(page, drift);
        await checkText(page, '#cta-title');
        await checkText(page, '#cta-title + p');
      });

      test(`the contact form stays legible at ${drift}`, async ({ page }) => {
        await settle(page, '#contacto');
        await pinDrift(page, drift);
        await checkText(page, '#contact-title');
        await checkText(page, '#contact-title ~ p');
        await checkText(page, '#contacto label');

        const field = page.locator('#contacto textarea').first();
        const { border, placeholder } = await field.evaluate((node) => ({
          border: getComputedStyle(node).borderBottomColor,
          placeholder: getComputedStyle(node, '::placeholder').color,
        }));
        // The rule under each field is all there is to say where to type, so it answers to
        // 1.4.11 and its 3:1 rather than to the text bar.
        const worstBorder = await worstAgainst(page, field, field, border);
        expect(worstBorder, 'the rule under a field').toBeGreaterThanOrEqual(3);
        // The hint inside the empty field is ordinary small text.
        const worstHint = await worstAgainst(page, field, field, placeholder);
        expect(worstHint, 'the hint inside a field').toBeGreaterThanOrEqual(4.5);
      });
    }
  });
});
