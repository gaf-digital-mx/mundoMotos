import { expect, test } from '@playwright/test';

test.describe('business information @smoke', () => {
  test('publishes valid LocalBusiness structured data', async ({ page }) => {
    await page.goto('/');
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(raw ?? '{}') as Record<string, unknown>;

    expect(data['@type']).toEqual(['AutoPartsStore', 'AutoRepair']);
    expect(data).toMatchObject({
      name: 'Mundo Motos',
      address: { addressLocality: 'Tepetlixpa', postalCode: '56880', addressCountry: 'MX' },
    });
    expect(String(data.telephone)).toMatch(/^\+\d{10,15}$/);
  });

  test('shows address, hours and contact links in the footer', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');

    await expect(footer.getByText('Av. 20 de Noviembre 159')).toBeVisible();
    await expect(footer.getByText('Lunes a viernes')).toBeVisible();
    await expect(footer.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      /^\/api\/go\/whatsapp\?src=footer&/,
    );
    const call = footer.getByRole('link', { name: /Llámanos/ });
    // tel: stays a direct link; the click is reported with <a ping>.
    await expect(call).toHaveAttribute('href', /^tel:\+\d+/);
    await expect(call).toHaveAttribute('ping', '/api/track?target=phone&src=footer');
  });

  test('reports phone clicks with <a ping> while tel: stays direct (ADR-0013)', async ({
    page,
  }) => {
    await page.goto('/');
    const ping = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().includes('/api/track'),
    );
    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: /Llámanos/ })
      .click();
    expect(new URL((await ping).url()).searchParams.get('target')).toBe('phone');
  });

  test('links to the privacy notice', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Aviso de privacidad' }).click();

    await expect(page).toHaveURL(/\/aviso-de-privacidad$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aviso de privacidad');
  });
});
