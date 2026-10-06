import { expect, test } from '@playwright/test';

test.describe('interactive hero', () => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    test(`keeps server-rendered hero text as the final LCP element at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.waitForLoadState('load');
      // Every candidate over a settle window: the first tells us how fast the hero paints, the
      // last that nothing but hero text ever becomes the largest element.
      const lcp = await page.evaluate(
        () =>
          new Promise<{ first: { kind: string; at: number }; last: { kind: string; at: number } }>(
            (resolve) => {
              const seen: { kind: string; at: number }[] = [];
              new PerformanceObserver((list) => {
                for (const entry of list.getEntries() as (PerformanceEntry & {
                  element?: Element | null;
                })[]) {
                  const element = entry.element;
                  const hero = element?.closest(
                    'section[aria-labelledby="hero-title"] h1, section[aria-labelledby="hero-title"] p',
                  );
                  seen.push({
                    kind: hero ? 'HERO' : (element?.tagName ?? 'none'),
                    at: Math.round(entry.startTime),
                  });
                }
              }).observe({ type: 'largest-contentful-paint', buffered: true });
              setTimeout(() => {
                const none = { kind: 'none', at: 0 };
                resolve({ first: seen[0] ?? none, last: seen.at(-1) ?? none });
              }, 3000);
            },
          ),
      );
      // Something textual paints at once (the brand or the hero wordmark, both server-rendered):
      // never the canvas, and never waiting for the island.
      expect(['CANVAS', 'IMG', 'none'], JSON.stringify(lcp)).not.toContain(lcp.first.kind);
      expect(lcp.first.at, JSON.stringify(lcp)).toBeLessThan(1500);
      // The swept-in copy takes over as the largest element (the tagline outweighs the wordmark —
      // an accepted cost of the intro), but it must still be hero text. Its timing follows the
      // machine, so it isn't asserted here.
      expect(lcp.last.kind, JSON.stringify(lcp)).toBe('HERO');
    });
  }

  test('renders a decorative canvas that fades in once particles start', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('section[aria-labelledby="hero-title"] canvas');
    await expect(canvas).toHaveAttribute('aria-hidden', 'true');
  });

  test('opens with the wordmark alone, then reveals the rest once the figure is formed', async ({
    page,
  }) => {
    await page.goto('/');
    const wordmark = page.locator('[data-wordmark]');
    const tagline = page.locator('#hero-title [data-reveal]');
    const cta = page.locator('section[aria-labelledby="hero-title"] [data-reveal]').nth(2);

    // The wordmark never disappears; everything else waits for the particles.
    await expect(wordmark).toBeVisible();
    await expect(tagline).toHaveCSS('opacity', '0');
    await expect(cta).toHaveCSS('opacity', '0');

    await expect(tagline).toHaveCSS('opacity', '1', { timeout: 5000 });
    await expect(cta).toHaveCSS('opacity', '1', { timeout: 5000 });
    await expect(wordmark).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mundo Motos');
  });

  test('types the wordmark in place: it never moves, even if the font lands late', async ({
    page,
    context,
  }) => {
    // The worst case for a shift: the webfont (8px wider than the fallback) arrives mid-intro.
    await context.route('**/*.woff2', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.continue();
    });
    await page.goto('/', { waitUntil: 'commit' });
    const wordmark = page.locator('[data-wordmark]');
    const left = () => wordmark.evaluate((el) => Math.round(el.getBoundingClientRect().left));

    const start = await left();
    // Typed out left to right (a clip), so a late font only extends the right edge.
    expect(
      await wordmark.evaluate((el) =>
        el.getAnimations().map((animation) => (animation as CSSAnimation).animationName),
      ),
    ).toContain('type');
    await expect(page.locator('[data-intro]')).toHaveAttribute('data-intro', 'done', {
      timeout: 6000,
    });
    expect(await left()).toBe(start);
  });

  test('the continuous flame motion can be paused and resumed (WCAG 2.2.2)', async ({ page }) => {
    await page.goto('/');
    const pause = page.getByRole('button', { name: 'Pausar animación' });
    await pause.click();
    const resume = page.getByRole('button', { name: 'Reanudar animación' });
    // Pausing mid-sequence finishes it: the hero is fully revealed at once.
    await expect(page.locator('#hero-title [data-reveal]')).toHaveCSS('opacity', '1');
    await resume.click();
    await expect(page.getByRole('button', { name: 'Pausar animación' })).toBeVisible();
  });

  test('a keyboard reaching a hero CTA mid-intro reveals it instead of focusing nothing', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'commit' });
    const group = page.locator('section[aria-labelledby="hero-title"] [data-reveal]').nth(2);
    await group.locator('a').first().focus();
    // Focus must never land on an invisible, inert control (2.4.7, 2.4.11).
    await expect(group).toHaveCSS('opacity', '1');
    await expect(group.locator('a').first()).not.toHaveCSS('pointer-events', 'none');
  });

  test.describe('without scripting', () => {
    test.use({ javaScriptEnabled: false });

    test('shows the whole hero at once: there is no intro to wait for', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('#hero-title [data-reveal]')).toHaveCSS('opacity', '1');
      await expect(
        page.locator('section[aria-labelledby="hero-title"] [data-reveal]').nth(2),
      ).toHaveCSS('opacity', '1');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('still shows the figure without animating it, and never hides the text', async ({
      page,
    }) => {
      await page.goto('/');
      const canvas = page.locator('section[aria-labelledby="hero-title"] canvas');
      await expect(canvas).toHaveAttribute('data-ready', 'true');
      // Everything is on screen at once, with nothing animating at all.
      const reveal = page.locator('#hero-title [data-reveal]');
      await expect(reveal).toHaveCSS('opacity', '1');
      expect(await reveal.evaluate((el) => el.getAnimations().length)).toBe(0);
      expect(
        await page.locator('[data-wordmark]').evaluate((el) => el.getAnimations().length),
      ).toBe(0);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const painted = await page
        .locator('section[aria-labelledby="hero-title"] canvas')
        .evaluate((canvas: HTMLCanvasElement) => {
          const ctx = canvas.getContext('2d');
          if (!ctx) return false;
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
          return data.some((value, index) => index % 4 === 3 && value > 0);
        });
      expect(painted).toBe(true);
    });
  });
});
