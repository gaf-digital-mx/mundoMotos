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

/**
 * Where along its travel each layer is pinned. Not a list of percentages: how far a layer drifts
 * is the section's own `--drift-travel`, so a section that widens its parallax would otherwise
 * keep being measured at the old extremes — which are no longer the worst of it.
 */
const STOPS = ['start', 'middle', 'end'] as const;

const channel = (value: number) => {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

const luminance = (r: number, g: number, b: number) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** `rgb(r g b)` or `rgb(r g b / a)`, with the alpha a translucent panel carries. */
const parseRgb = (color: string): [number, number, number, number] => {
  const parts = color.match(/[\d.]+/g)?.map(Number) ?? [];
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
};

/** 1.4.3: 18.66px bold or 24px counts as large text, and the bar drops from 4.5:1 to 3:1. */
const required = (fontSize: number, weight: number) =>
  fontSize >= 24 || (fontSize >= 18.66 && weight >= 700) ? 3 : 4.5;

/**
 * Marks the nearest ancestor that filters its backdrop, and reports what it does.
 *
 * A screenshot does not composite `backdrop-filter` — forcing it to `none`, `blur(4px)` and
 * `blur(64px)` gives byte-identical pixels — so a panel of blurred glass is captured as if it
 * were plain. That reads far too harshly: the point of the blur is that it spreads the highlight
 * which would otherwise sit under a word. The filter has to be reproduced here instead.
 */
const findGlass = async (region: Locator) =>
  region.evaluate((node: HTMLElement) => {
    for (let element = node.parentElement; element; element = element.parentElement) {
      const style = getComputedStyle(element);
      const blur = /blur\(([\d.]+)px\)/.exec(style.backdropFilter);
      if (!blur) continue;
      element.dataset.glassProbe = '';
      const box = element.getBoundingClientRect();
      return {
        radius: Number(blur[1]),
        tint: style.backgroundColor,
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
      };
    }
    return null;
  });

/**
 * The worst contrast `color` reaches against anything painted behind `region`, with `hide` taken
 * out of the picture first so the shot is background only.
 *
 * Behind glass the shot is of the panel's own backdrop, taken with the panel hidden and over a
 * margin wide enough to feed the kernel, then blurred and tinted the way the browser would:
 * CSS defines `blur(r)` as a Gaussian of standard deviation `r / 2`, and the tint composites
 * over the result.
 */
const worstAgainst = async (page: Page, region: Locator, hide: Locator, color: string) => {
  const box = await region.boundingBox();
  if (!box) throw new Error('the element being measured has no box');
  const glass = await findGlass(region);
  const dpr = await page.evaluate(() => window.devicePixelRatio);
  const view = page.viewportSize() ?? { width: 0, height: 0 };

  // Hide the glass itself rather than just the text, so the shot is the backdrop it filters.
  const hidden = glass ? page.locator('[data-glass-probe]') : hide;
  const margin = glass ? Math.ceil(glass.radius * 3) : 0;
  const frame = glass
    ? {
        x: Math.max(0, glass.box.x - margin),
        y: Math.max(0, glass.box.y - margin),
        width:
          Math.min(view.width, glass.box.x + glass.box.width + margin) -
          Math.max(0, glass.box.x - margin),
        height:
          Math.min(view.height, glass.box.y + glass.box.height + margin) -
          Math.max(0, glass.box.y - margin),
      }
    : box;

  await hidden.evaluate((node: HTMLElement) => {
    node.style.visibility = 'hidden';
  });
  const shot = await page.screenshot({ clip: frame });
  await hidden.evaluate((node: HTMLElement) => {
    node.style.visibility = '';
    delete node.dataset.glassProbe;
  });

  const pipeline = sharp(shot);
  const { data, info } = await (glass ? pipeline.blur((glass.radius * dpr) / 2) : pipeline)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const [tintR, tintG, tintB, tintA] = glass ? parseRgb(glass.tint) : [0, 0, 0, 0];
  const over = (value: number, tint: number) => value * (1 - tintA) + tint * tintA;
  const [r, g, b] = parseRgb(color);
  const front = luminance(r, g, b);
  const left = Math.round((box.x - frame.x) * dpr);
  const top = Math.round((box.y - frame.y) * dpr);
  let worst = 21;
  for (let y = top; y < top + Math.round(box.height * dpr); y++) {
    for (let x = left; x < left + Math.round(box.width * dpr); x++) {
      const i = (y * info.width + x) * info.channels;
      const behind = luminance(
        over(data[i] ?? 0, tintR),
        over(data[i + 1] ?? 0, tintG),
        over(data[i + 2] ?? 0, tintB),
      );
      worst = Math.min(worst, ratio(front, behind));
    }
  }
  return worst;
};

/** Pins every layer at one end of its own travel, or at the middle of it. */
const pinDrift = async (page: Page, stop: (typeof STOPS)[number]) => {
  await page.locator('[data-parallax]').evaluateAll((nodes, which) => {
    for (const node of nodes as HTMLElement[]) {
      const travel = getComputedStyle(node).getPropertyValue('--drift-travel').trim() || '8%';
      node.style.animation = 'none';
      node.style.translate =
        which === 'middle' ? '0 0%' : `0 calc(${travel} * ${which === 'start' ? -1 : 1})`;
    }
  }, stop);
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
    for (const drift of STOPS) {
      test(`the closing CTA holds its copy at the ${drift} of the drift`, async ({ page }) => {
        await settle(page, '[aria-labelledby="cta-title"]');
        await pinDrift(page, drift);
        await checkText(page, '#cta-title');
        await checkText(page, '#cta-title + p');
      });

      test(`the contact section holds its copy at the ${drift} of the drift`, async ({ page }) => {
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

    for (const drift of STOPS) {
      test(`the closing CTA holds its copy at the ${drift} of the drift`, async ({ page }) => {
        await settle(page, '[aria-labelledby="cta-title"]');
        await pinDrift(page, drift);
        await checkText(page, '#cta-title');
        await checkText(page, '#cta-title + p');
      });

      test(`the contact form stays legible at the ${drift} of the drift`, async ({ page }) => {
        await settle(page, '#contacto');
        await pinDrift(page, drift);
        await checkText(page, '#contact-title');
        await checkText(page, '#contact-title ~ p');
        await checkText(page, '#contacto label');

        // The worked example, which used to be a placeholder and is now a line of its own.
        await checkText(page, '#contacto [id$="-query-example"]');

        const field = page.locator('#contacto textarea').first();
        const border = await field.evaluate((node) => getComputedStyle(node).borderBottomColor);
        // The rule under each field is all there is to say where to type, so it answers to
        // 1.4.11 and its 3:1 rather than to the text bar.
        const worstBorder = await worstAgainst(page, field, field, border);
        expect(worstBorder, 'the rule under a field').toBeGreaterThanOrEqual(3);
      });
    }
  });
});
