import { expect, test } from '@playwright/test';

/**
 * The Report-Only policy must already be clean: browsers fire `securitypolicyviolation` even
 * when they only report, so any regression (a new inline script, third-party origin, eval)
 * fails here before the policy is enforced.
 */
test.describe('Content-Security-Policy', () => {
  for (const path of ['/', '/aviso-de-privacidad', '/no-existe']) {
    test(`${path} runs without CSP violations`, async ({ page, context }) => {
      await context.route('https://wa.me/**', (route) => route.fulfill({ body: 'whatsapp' }));
      await page.addInitScript(() => {
        const violations: string[] = [];
        (window as unknown as { __csp: string[] }).__csp = violations;
        document.addEventListener('securitypolicyviolation', (event) => {
          violations.push(`${event.effectiveDirective} ${event.blockedURI}`);
        });
      });
      const response = await page.goto(path);
      expect(response?.headers()['content-security-policy-report-only']).toContain(
        "script-src 'self' 'sha256-",
      );

      if (path === '/') {
        // Exercise every interactive island: hero sequence, map embed, form beacon.
        await expect(page.locator('[data-wordmark]')).toHaveAttribute('data-state', 'typing', {
          timeout: 15_000,
        });
        await page.getByRole('button', { name: 'Mostrar mapa' }).click();
        await expect(page.locator('iframe[src*="google.com/maps"]')).toHaveCount(1);
        await page.getByLabel('Tu nombre').fill('Ana');
        await page.getByLabel('¿Qué necesitas?').fill('Balatas');
        const popup = context.waitForEvent('page');
        await page.getByRole('button', { name: /Enviar por WhatsApp/ }).click();
        await (await popup).close();
      }
      await page.waitForTimeout(500);
      expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).toEqual(
        [],
      );
    });
  }
});
