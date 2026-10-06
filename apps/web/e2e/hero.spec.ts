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
      // Collect every candidate for a settle window (canvas fades in after idle), then take the last.
      const lcpTag = await page.evaluate(
        () =>
          new Promise<string>((resolve) => {
            let last = 'none';
            new PerformanceObserver((list) => {
              const entries = list.getEntries() as (PerformanceEntry & {
                element?: Element | null;
              })[];
              const element = entries.at(-1)?.element;
              // Text painted without JS (wordmark, tagline or intro), never the canvas or an image.
              last = element?.closest(
                'section[aria-labelledby="hero-title"] h1, section[aria-labelledby="hero-title"] p',
              )
                ? 'TEXT'
                : (element?.tagName ?? last);
            }).observe({ type: 'largest-contentful-paint', buffered: true });
            setTimeout(() => {
              resolve(last);
            }, 3000);
          }),
      );
      expect(lcpTag).toBe('TEXT');
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
    const cta = page.locator('section[aria-labelledby="hero-title"] [data-reveal]').last();

    // The wordmark never disappears; everything else waits for the particles.
    await expect(wordmark).toBeVisible();
    await expect(tagline).toHaveCSS('opacity', '0');
    await expect(cta).toHaveCSS('opacity', '0');

    await expect(tagline).toHaveCSS('opacity', '1', { timeout: 5000 });
    await expect(cta).toHaveCSS('opacity', '1', { timeout: 5000 });
    await expect(wordmark).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mundo Motos');
  });

  test('the wordmark leads the intro above the figure and ends in the layout', async ({ page }) => {
    await page.goto('/');
    const wordmark = page.locator('[data-wordmark]');
    const stage = page.locator('[data-intro]');
    await expect(stage).toHaveAttribute('data-intro', 'running');
    const lifted = await wordmark.evaluate((el) => getComputedStyle(el).translate);
    expect(lifted).not.toBe('none');

    await expect(stage).toHaveAttribute('data-intro', 'done', { timeout: 5000 });
    await expect
      .poll(async () => wordmark.evaluate((el) => getComputedStyle(el).translate), {
        timeout: 2000,
      })
      .toMatch(/^(none|0px 0px|0px)$/);
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

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('still shows the figure without animating it, and never hides the text', async ({
      page,
    }) => {
      await page.goto('/');
      const canvas = page.locator('section[aria-labelledby="hero-title"] canvas');
      await expect(canvas).toHaveAttribute('data-ready', 'true');
      // Everything is on screen at once: no intro to wait through.
      await expect(page.locator('#hero-title [data-reveal]')).toHaveCSS('opacity', '1');
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
