import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('site shell @smoke', () => {
  test('serves the Spanish home page with no locale in the URL', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mundo Motos');
    expect(response?.headers()['content-language']).toBe('es');
  });

  test('redirects locale-prefixed URLs to the clean URL', async ({ page }) => {
    await page.goto('/es');
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('answers the health check', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBe(true);
    expect(await response.json()).toMatchObject({ status: 'ok' });
  });

  test('renders the branded 404 page for unknown paths', async ({ page }) => {
    const response = await page.goto('/esta-ruta-no-existe');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Esta página no existe');
  });
});

test.describe('accessibility', () => {
  for (const path of ['/', '/esta-ruta-no-existe']) {
    test(`has no serious or critical axe violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
});

test.describe('pre-launch indexing guard', () => {
  test.skip(process.env.EXPECT_INDEXABLE === 'true', 'Environment is meant to be indexable');

  test('keeps every response out of search engines', async ({ request }) => {
    for (const path of ['/', '/api/health', '/robots.txt']) {
      const response = await request.get(path);
      expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
    }
    expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /');
  });
});
