import { expect, test } from '@playwright/test';

test.describe('tablet layout', () => {
  for (const width of [768, 1024, 1180]) {
    test(`has no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('responsive layout', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const path of ['/', '/aviso-de-privacidad']) {
    test(`has no horizontal scroll at 320px on ${path} (WCAG 1.4.10)`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('skip link moves focus to the main landmark', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#contenido')).toBeFocused();
  });
});
