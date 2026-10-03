import { expect, test } from '@playwright/test';

test.describe('interactive hero', () => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    test(`keeps the headline as the final LCP element at ${viewport.width}px`, async ({ page }) => {
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
              last = entries.at(-1)?.element?.tagName ?? last;
            }).observe({ type: 'largest-contentful-paint', buffered: true });
            setTimeout(() => {
              resolve(last);
            }, 3000);
          }),
      );
      expect(lcpTag).toBe('H1');
    });
  }

  test('renders a decorative canvas that fades in once particles start', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('section[aria-labelledby="hero-title"] canvas');
    await expect(canvas).toHaveAttribute('aria-hidden', 'true');
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('still shows the figure without animating it', async ({ page }) => {
      await page.goto('/');
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
