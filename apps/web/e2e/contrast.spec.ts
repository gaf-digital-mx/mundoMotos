import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';

/**
 * Contrast over the section photographs, which nothing else checks.
 *
 * axe reports text on an image as `incomplete` rather than a violation, and the accessibility
 * assertions elsewhere only fail on violations — so the veils that keep this copy readable were
 * never covered. These sample the pixels the browser actually painted behind each element.
 *
 * One shot serves every element that shares a backdrop. Shooting and blurring per element put
 * these tests at fifty screenshots apiece, which fits in a 30s timeout on this machine and does
 * not on CI's.
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

/** Pixel work is slow and this does a lot of it; the default is for tests that click things. */
const BUDGET_MS = 120_000;

type Box = { x: number; y: number; width: number; height: number };
type Rgba = [number, number, number, number];

const channel = (value: number) => {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

const luminance = (r: number, g: number, b: number) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

type Subject = { selector: string; of?: 'borderBottomColor' };

/** What `sharp` hands back with a raw buffer; the package exports no namespace to borrow. */
type Raw = { width: number; height: number; channels: number };

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

/**
 * Everything the page can tell us in one trip: what each subject is, where it is, and which
 * ancestor — if any — filters the backdrop they all share.
 *
 * Colours are painted into a canvas rather than parsed. `bg-void/20` computes to
 * `oklab(0 0 0 / 0.2)`, and reading the numbers out of that string is right only while the
 * colour happens to be black; a lighter panel would be read as nearly black, and believed to
 * darken what it in fact lightens.
 */
const survey = (page: Page, subjects: Subject[]) =>
  page.evaluate((wanted) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const paint = canvas.getContext('2d');
    if (!paint) throw new Error('no 2d context to resolve colours with');
    const resolve = (value: string): [number, number, number, number] => {
      paint.clearRect(0, 0, 1, 1);
      paint.fillStyle = value;
      paint.fillRect(0, 0, 1, 1);
      const [red = 0, green = 0, blue = 0, alpha = 0] = paint.getImageData(0, 0, 1, 1).data;
      return [red, green, blue, alpha / 255];
    };
    const rect = (element: Element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    };

    const measured = [];
    let glass: {
      radius: number;
      tint: [number, number, number, number];
      box: ReturnType<typeof rect>;
    } | null = null;
    for (const { selector, of } of wanted) {
      const matches = [...document.querySelectorAll<HTMLElement>(selector)];
      for (const [index, element] of matches.entries()) {
        const style = getComputedStyle(element);
        const fill = resolve(style.backgroundColor);
        let glassed = false;
        for (let node = element.parentElement; node; node = node.parentElement) {
          if (/blur\([\d.]+px\)/.test(getComputedStyle(node).backdropFilter)) {
            glassed = true;
            break;
          }
        }
        measured.push({
          glassed,
          key: `${selector}${matches.length > 1 ? ` #${index + 1}` : ''}${
            of ? ' (its rule)' : ` at ${Number.parseFloat(style.fontSize)}px/${style.fontWeight}`
          }`,
          bar: of
            ? 3
            : Number.parseFloat(style.fontSize) >= 24 ||
                (Number.parseFloat(style.fontSize) >= 18.66 &&
                  (Number.parseInt(style.fontWeight, 10) || 400) >= 700)
              ? 3
              : 4.5,
          box: rect(element),
          color: resolve(of ? style[of] : style.color),
          // Only a control answers to what is inside it; text sits on whatever is behind it.
          fill: of ? fill : null,
        });
        for (let node = element.parentElement; node && !glass; node = node.parentElement) {
          const blur = /blur\(([\d.]+)px\)/.exec(getComputedStyle(node).backdropFilter);
          if (blur) {
            node.dataset.glassProbe = '';
            glass = {
              radius: Number(blur[1]),
              tint: resolve(getComputedStyle(node).backgroundColor),
              box: rect(node),
            };
          }
        }
      }
    }
    return {
      measured,
      glass,
      counts: wanted.map(({ selector }) => document.querySelectorAll(selector).length),
    };
  }, subjects);

/**
 * The worst contrast `color` reaches anywhere behind `box`, read out of an already-captured
 * backdrop.
 *
 * A control's rule is judged against both sides: 1.4.11 asks it to stand out from what is next
 * to it, and a filled field has its fill on the inside. Measuring only the outside is what made
 * a dark ground look like it changed nothing — the element is hidden before the shot, and its
 * own fill goes with it.
 */
const score = (
  shot: { data: Buffer; info: Raw; frame: Box; dpr: number },
  box: Box,
  color: Rgba,
  fill: Rgba | null,
  tint: Rgba,
) => {
  const { data, info, frame, dpr } = shot;
  // A pixel of slack on each side: the clip is trimmed and the buffer rounded independently, so
  // a box flush against the frame can miss by one without being off it.
  const left = Math.round((box.x - frame.x) * dpr);
  const top = Math.round((box.y - frame.y) * dpr);
  const right = Math.round((box.x - frame.x + box.width) * dpr);
  const bottom = Math.round((box.y - frame.y + box.height) * dpr);
  // A read past the end of the buffer comes back as pure black, which scores 21:1 and lowers
  // nothing — an assertion that cannot fail. Playwright trims a clip to the viewport, so a panel
  // running under the fold is exactly how that happens.
  if (left < -1 || top < -1 || right > info.width + 1 || bottom > info.height + 1) return null;

  const over = (value: number, by: Rgba, index: 0 | 1 | 2) =>
    value * (1 - by[3]) + by[index] * by[3];
  const front = luminance(color[0], color[1], color[2]);
  let outside = 21;
  let within = 21;
  for (let y = Math.max(0, top); y < Math.min(bottom, info.height); y++) {
    for (let x = Math.max(0, left); x < Math.min(right, info.width); x++) {
      const i = (y * info.width + x) * info.channels;
      const red = over(data[i] ?? 0, tint, 0);
      const green = over(data[i + 1] ?? 0, tint, 1);
      const blue = over(data[i + 2] ?? 0, tint, 2);
      outside = Math.min(outside, ratio(front, luminance(red, green, blue)));
      if (fill && fill[3] > 0) {
        within = Math.min(
          within,
          ratio(front, luminance(over(red, fill, 0), over(green, fill, 1), over(blue, fill, 2))),
        );
      }
    }
  }
  return Math.max(outside, fill && fill[3] > 0 ? within : 0);
};

/**
 * Walks every subject across the whole sweep and asserts the worst reading each one reaches.
 * Every match of a selector is measured, not the first: the second label in the contact form
 * sits ten points below the first, and checking only the comfortable one proves nothing.
 */
const sweepContrast = async (page: Page, subjects: Subject[]) => {
  test.setTimeout(BUDGET_MS);
  const dpr = await page.evaluate(() => window.devicePixelRatio);
  const view = page.viewportSize() ?? { width: 0, height: 0 };
  const worst = new Map<string, { value: number; bar: number }>();

  for (const fraction of SWEEP) {
    await pinDrift(page, fraction);
    const { measured, glass, counts } = await survey(page, subjects);
    for (const [index, count] of counts.entries()) {
      expect(count, `nothing matches ${subjects[index]?.selector ?? ''}`).toBeGreaterThan(0);
    }

    // Two backdrops at most: whatever the glass filters, and the page itself. Everything that
    // shares one is read out of a single shot — the panel hidden for the first, the copy itself
    // for the second, since there is nothing between it and the photograph.
    for (const onGlass of [true, false]) {
      const group = measured.filter(({ glassed }) => glassed === onGlass);
      if (group.length === 0) continue;
      const pane = onGlass ? glass : null;
      const margin = pane ? Math.ceil(pane.radius * 3) : 0;
      const span: Box = pane
        ? pane.box
        : group.reduce<Box>(
            (all, { box }) => ({
              x: Math.min(all.x, box.x),
              y: Math.min(all.y, box.y),
              width: Math.max(all.x + all.width, box.x + box.width) - Math.min(all.x, box.x),
              height: Math.max(all.y + all.height, box.y + box.height) - Math.min(all.y, box.y),
            }),
            group[0]?.box ?? { x: 0, y: 0, width: 0, height: 0 },
          );
      const frame = {
        x: Math.max(0, span.x - margin),
        y: Math.max(0, span.y - margin),
        width: Math.min(view.width, span.x + span.width + margin) - Math.max(0, span.x - margin),
        height: Math.min(view.height, span.y + span.height + margin) - Math.max(0, span.y - margin),
      };

      const toHide = pane
        ? page.locator('[data-glass-probe]')
        : page.locator(subjects.map(({ selector }) => selector).join(', '));
      await toHide.evaluateAll((nodes) => {
        for (const node of nodes as HTMLElement[]) node.style.visibility = 'hidden';
      });
      const capture = await page.screenshot({ clip: frame });
      await toHide.evaluateAll((nodes) => {
        for (const node of nodes as HTMLElement[]) node.style.visibility = '';
      });

      const pipeline = sharp(capture);
      const { data, info } = await (pane ? pipeline.blur((pane.radius * dpr) / 2) : pipeline)
        .raw()
        .toBuffer({ resolveWithObject: true });
      const shot = { data, info, frame, dpr };
      const tint: Rgba = pane ? pane.tint : [0, 0, 0, 0];

      for (const { key, bar, box, color, fill } of group) {
        const value = score(shot, box, color, fill, tint);
        expect(value, `${key} is off the captured frame`).not.toBeNull();
        const seen = worst.get(key);
        if (value !== null && (!seen || value < seen.value)) worst.set(key, { value, bar });
      }
    }
    await page.locator('[data-glass-probe]').evaluateAll((nodes) => {
      for (const node of nodes as HTMLElement[]) delete node.dataset.glassProbe;
    });
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
  const layers = page.locator('[data-parallax]');
  expect(await layers.count()).toBeGreaterThan(0);
  await expect
    .poll(async () =>
      layers.evaluateAll((nodes) => nodes.every((n) => (n as HTMLImageElement).complete)),
    )
    .toBe(true);
  await page.waitForTimeout(400);
};

// Contrast is a property of the stylesheet and the picture, not of the engine, and sampling
// rendered pixels across two of them only buys rounding differences.
test.skip(({ browserName }) => browserName !== 'chromium', 'one engine is enough for pixels');

test.describe('contrast over the section photographs', () => {
  const CTA: Subject[] = [{ selector: '#cta-title' }, { selector: '#cta-title + p' }];
  const HEADING: Subject[] = [{ selector: '#contact-title' }, { selector: '#contact-title ~ p' }];
  const FORM: Subject[] = [
    { selector: '#contacto label' },
    // The worked example, which used to be a placeholder and is now a line of its own.
    { selector: '#contacto [id$="-query-example"]' },
    { selector: '#contacto textarea', of: 'borderBottomColor' },
    { selector: '#contacto input', of: 'borderBottomColor' },
  ];
  const REJECTED: Subject[] = [
    { selector: '#contacto [id$="-error"]' },
    { selector: '#contacto [aria-invalid="true"]', of: 'borderBottomColor' },
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
      await sweepContrast(page, REJECTED);
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
      await sweepContrast(page, REJECTED);
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
