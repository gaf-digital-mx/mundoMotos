import { expect, test } from '@playwright/test';

test.describe('interactive hero', () => {
  test('keeps the headline as the LCP element (canvas starts after idle)', async ({ page }) => {
    await page.goto('/');
    const lcpTag = await page.evaluate(
      () =>
        new Promise<string>((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries() as (PerformanceEntry & {
              element?: Element | null;
            })[];
            resolve(entries.at(-1)?.element?.tagName ?? 'none');
          }).observe({ type: 'largest-contentful-paint', buffered: true });
        }),
    );
    expect(lcpTag).toBe('H1');
  });

  test('renders a decorative canvas and hides the poster once particles start', async ({
    page,
  }) => {
    await page.goto('/');
    const canvas = page.locator('section[aria-labelledby="hero-title"] canvas');
    await expect(canvas).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('section[aria-labelledby="hero-title"] img')).toHaveClass(
      /opacity-0/,
    );
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('still shows the figure without animating it', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('section[aria-labelledby="hero-title"] img')).toHaveClass(
        /opacity-0/,
      );
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
