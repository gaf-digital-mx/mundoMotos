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
 * Where along its travel each layer is pinned, as fractions from one end to the other. Not a
 * list of percentages: how far a layer drifts is the section's own `--drift-travel`, so a
 * section that widened its parallax would keep being measured at extremes it no longer reaches.
 *
 * Nine of them rather than the two ends and the middle, because a photograph's worst alignment
 * is not at its ends: sweeping densely found `#contact-title` dipping to 5.10:1 between two
 * stops that read 5.83 and 9.16. The ends are two samples, not an envelope.
 */
const SWEEP = Array.from({ length: 9 }, (_, step) => step / 4 - 1);

const channel = (value: number) => {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

const luminance = (r: number, g: number, b: number) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/**
 * `rgb(r g b)` or `rgb(r g b / a)`. Anything else throws rather than guessing: a computed colour
 * can come back as `oklab(...)`, and reading the numbers out of that gives a colour that is only
 * right when it happens to be black — a wrong reading that looks like a measurement.
 */
const parseRgb = (color: string): [number, number, number, number] => {
  if (!/^rgba?\(/.test(color)) throw new Error(`cannot read "${color}" as sRGB`);
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
      // Painted into a canvas rather than parsed: `bg-void/20` computes to `oklab(0 0 0 / 0.2)`,
      // and reading the numbers out of that string gives a colour that is only right by accident
      // when the tint happens to be black.
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const paint = canvas.getContext('2d');
      if (!paint) throw new Error('no 2d context to resolve the tint with');
      paint.fillStyle = style.backgroundColor;
      paint.fillRect(0, 0, 1, 1);
      const [red = 0, green = 0, blue = 0, alpha = 0] = paint.getImageData(0, 0, 1, 1).data;
      return {
        radius: Number(blur[1]),
        tint: [red, green, blue, alpha / 255] as [number, number, number, number],
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
const worstAgainst = async (
  page: Page,
  region: Locator,
  hide: Locator,
  color: string,
  /**
   * A control's own fill, when it has one. A rule is adjacent to the surface outside it and to
   * the fill inside it, and 1.4.11 asks that it stand out from what is next to it — so a filled
   * field clears the bar on the strength of either side. Measuring only the outside is what made
   * a dark ground look like it changed nothing: the element is hidden before the shot, and its
   * own fill goes with it.
   */
  fill?: [number, number, number, number],
) => {
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

  // A read past the end of the buffer would come back as pure black, which scores 21:1 and
  // quietly lowers nothing — an assertion that cannot fail. Playwright trims a clip to the
  // viewport, so a panel running under the fold is exactly how that happens.
  // A pixel of slack on each side: the clip is trimmed and the buffer rounded independently, so
  // a box flush against the frame can miss by one without being off it.
  const right = Math.round((box.x - frame.x + box.width) * dpr);
  const bottom = Math.round((box.y - frame.y + box.height) * dpr);
  expect(
    right <= info.width + 1 &&
      bottom <= info.height + 1 &&
      box.x >= frame.x - 1 &&
      box.y >= frame.y - 1,
    'the element being measured is off the captured frame',
  ).toBe(true);

  const [tintR, tintG, tintB, tintA] = glass ? glass.tint : [0, 0, 0, 0];
  const over = (value: number, tint: number) => value * (1 - tintA) + tint * tintA;
  const [r, g, b] = parseRgb(color);
  const front = luminance(r, g, b);
  const left = Math.max(0, Math.round((box.x - frame.x) * dpr));
  const top = Math.max(0, Math.round((box.y - frame.y) * dpr));
  const [fillR, fillG, fillB, fillA] = fill ?? [0, 0, 0, 0];
  const inside = (value: number, tint: number) => value * (1 - fillA) + tint * fillA;
  let outside = 21;
  let within = 21;
  for (let y = top; y < Math.min(bottom, info.height); y++) {
    for (let x = left; x < Math.min(right, info.width); x++) {
      const i = (y * info.width + x) * info.channels;
      const [red, green, blue] = [
        over(data[i] ?? 0, tintR),
        over(data[i + 1] ?? 0, tintG),
        over(data[i + 2] ?? 0, tintB),
      ];
      outside = Math.min(outside, ratio(front, luminance(red, green, blue)));
      if (fillA > 0) {
        const lit = luminance(inside(red, fillR), inside(green, fillG), inside(blue, fillB));
        within = Math.min(within, ratio(front, lit));
      }
    }
  }
  return Math.max(outside, fillA > 0 ? within : 0);
};

/** Pins every layer at one point of its own travel, as a fraction from one end to the other. */
const pinDrift = async (page: Page, fraction: number) => {
  await page.locator('[data-parallax]').evaluateAll((nodes, at) => {
    for (const node of nodes as HTMLElement[]) {
      const travel = getComputedStyle(node).getPropertyValue('--drift-travel').trim() || '8%';
      node.style.animation = 'none';
      node.style.translate = `0 calc(${travel} * ${at})`;
    }
  }, fraction);
};

/** A rule, a border, anything that is not text: 1.4.11 asks 3:1 of it. */
const CONTROL = { bar: 3, of: 'borderBottomColor' } as const;

type Subject = { selector: string; of?: 'borderBottomColor' };

/**
 * Walks every subject across the whole sweep and asserts the worst reading each one reaches.
 * Every match is measured, not the first: the second label in the contact form sits 10 points
 * lower than the first, and checking only the comfortable one proves nothing about the other.
 */
const sweepContrast = async (page: Page, subjects: Subject[]) => {
  const worst = new Map<string, { value: number; bar: number }>();
  for (const fraction of SWEEP) {
    await pinDrift(page, fraction);
    for (const { selector, of } of subjects) {
      const matches = await page.locator(selector).all();
      expect(matches.length, `nothing matches ${selector}`).toBeGreaterThan(0);
      for (const [index, target] of matches.entries()) {
        // A rejected form is taller than a blank one, and a panel running under the fold is how
        // a clip gets trimmed out from under the sampling loop. Pinned layers do not move with
        // the scroll, so this changes what is on screen and nothing else.
        await target.scrollIntoViewIfNeeded();
        const { color, size, weight, fill } = await target.evaluate(
          (node, property: 'borderBottomColor' | null) => {
            const style = getComputedStyle(node);
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const paint = canvas.getContext('2d');
            if (!paint) throw new Error('no 2d context to resolve the fill with');
            paint.fillStyle = style.backgroundColor;
            paint.fillRect(0, 0, 1, 1);
            const [red = 0, green = 0, blue = 0, alpha = 0] = paint.getImageData(0, 0, 1, 1).data;
            return {
              color: property === null ? style.color : style[property],
              size: Number.parseFloat(style.fontSize),
              weight: Number.parseInt(style.fontWeight, 10) || 400,
              fill: [red, green, blue, alpha / 255] as [number, number, number, number],
            };
          },
          of ?? null,
        );
        const bar = of ? CONTROL.bar : required(size, weight);
        // Only a control answers to what is inside it; text sits on whatever is behind it.
        const value = await worstAgainst(page, target, target, color, of ? fill : undefined);
        const key = `${selector}${matches.length > 1 ? ` #${index + 1}` : ''}${
          of ? ' (its rule)' : ` at ${size}px/${weight}`
        }`;
        const seen = worst.get(key);
        if (!seen || value < seen.value) worst.set(key, { value, bar });
      }
    }
  }
  for (const [key, { value, bar }] of worst) {
    expect(value, key).toBeGreaterThanOrEqual(bar);
  }
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
  const CTA = [{ selector: '#cta-title' }, { selector: '#cta-title + p' }];
  const HEADING = [{ selector: '#contact-title' }, { selector: '#contact-title ~ p' }];
  const FORM = [
    { selector: '#contacto label' },
    // The worked example, which used to be a placeholder and is now a line of its own.
    { selector: '#contacto [id$="-query-example"]' },
    { selector: '#contacto textarea', of: CONTROL.of },
    { selector: '#contacto input', of: CONTROL.of },
  ];

  /** Submitting an empty form is the shortest way into the state nobody designs for. */
  const failValidation = async (page: Page) => {
    await page.locator('#contacto button[type="submit"]').click();
    await expect(page.locator('#contacto [id$="-query-error"]')).toBeVisible();
  };

  test.describe('on a phone', () => {
    test('the closing CTA holds its copy', async ({ page }) => {
      await settle(page, '[aria-labelledby="cta-title"]');
      await sweepContrast(page, CTA);
    });

    test('the contact section holds its copy', async ({ page }) => {
      await settle(page, '#contacto');
      await sweepContrast(page, [...HEADING, ...FORM]);
    });

    test('the contact form holds what it says when it rejects something', async ({ page }) => {
      await settle(page, '#contacto');
      await failValidation(page);
      await sweepContrast(page, [
        { selector: '#contacto [id$="-error"]' },
        { selector: '#contacto [aria-invalid="true"]', of: CONTROL.of },
      ]);
    });
  });

  test.describe('on a wide screen', () => {
    // The only place the contact section is two columns, with the form beside the heading
    // rather than under it — and the form is the half that lands on the lit half of the photo.
    test.use({ viewport: { width: 1440, height: 900 } });

    test('the closing CTA holds its copy', async ({ page }) => {
      await settle(page, '[aria-labelledby="cta-title"]');
      await sweepContrast(page, CTA);
    });

    test('the contact form stays legible', async ({ page }) => {
      await settle(page, '#contacto');
      await sweepContrast(page, [...HEADING, ...FORM]);
    });

    test('the contact form holds what it says when it rejects something', async ({ page }) => {
      await settle(page, '#contacto');
      await failValidation(page);
      await sweepContrast(page, [
        { selector: '#contacto [id$="-error"]' },
        { selector: '#contacto [aria-invalid="true"]', of: CONTROL.of },
      ]);
    });

    test('the confirmation reads once it has something to say', async ({ page }) => {
      await settle(page, '#contacto');
      // The live region is empty until a message is sent, and an empty box measures nothing.
      await page.locator('#contacto [aria-live]').evaluate((node, text) => {
        node.textContent = text;
      }, 'Listo, abrimos WhatsApp con tu mensaje.');
      await sweepContrast(page, [{ selector: '#contacto [aria-live]' }]);
    });
  });
});
