import { expect, test } from '@playwright/test';

test.describe('landing page', () => {
  test('renders every section in order @smoke', async ({ page }) => {
    await page.goto('/');
    const headings = page.getByRole('heading', { level: 2 });
    await expect(headings).toContainText([
      'Buen precio, buen servicio',
      'Servicios para que tu moto ruede como nueva',
      'Lo que más nos piden',
      'Estamos en Tepetlixpa',
      'Escríbenos y te respondemos por WhatsApp',
      '¿Tu moto necesita algo?',
    ]);
  });

  test('every WhatsApp CTA is a tracked link with a section and a prefilled message', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(0);
    const links = await page.locator('a[href^="/api/go/whatsapp"]').evaluateAll((elements) =>
      elements.map((link) => ({
        href: link.getAttribute('href') ?? '',
        rel: link.getAttribute('rel') ?? '',
      })),
    );
    expect(links.length).toBeGreaterThan(10);
    for (const { href, rel } of links) {
      const url = new URL(href, 'https://example.test');
      expect(url.searchParams.get('src')).toBeTruthy();
      expect(url.searchParams.get('text')).toBeTruthy();
      expect(rel).toContain('nofollow');
    }
  });

  test('tracked WhatsApp links redirect to wa.me with the message (ADR-0013)', async ({ page }) => {
    await page.goto('/');
    const href = await page.getByRole('link', { name: /Cotizar.*Afinación/ }).getAttribute('href');
    expect(new URL(href ?? '', page.url()).searchParams.get('src')).toBe('services');
    const res = await page.request.get(href ?? '', { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    const location = new URL(res.headers().location ?? '');
    expect(location.hostname).toBe('wa.me');
    expect(location.searchParams.get('text')).toContain('Afinación');
  });

  test('carousel duplicate is hidden from assistive tech and keyboard', async ({ page }) => {
    await page.goto('/');
    const duplicate = page.locator('#refacciones [aria-hidden="true"][inert]');
    await expect(duplicate).toHaveCount(1);
    await expect(page.getByRole('link', { name: /Preguntar disponibilidad/ })).toHaveCount(18);
  });

  test('carousel can be paused and resumed (WCAG 2.2.2)', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Pausar carrusel' });
    await toggle.click();
    const resume = page.getByRole('button', { name: 'Reanudar carrusel' });
    await expect(page.locator('#refacciones [data-paused]')).toHaveCount(1);
    await resume.click();
    await expect(page.locator('#refacciones [data-paused]')).toHaveCount(0);
  });

  test('loads the Google Maps embed only after the visitor asks', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('iframe[src*="google.com/maps"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Mostrar mapa' }).click();
    const map = page.locator('iframe[src*="google.com/maps"]');
    await expect(map).toHaveCount(1);
    await expect(map).toBeFocused();
  });

  test('floating directions button points to Google Maps directions', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('link', { name: /Cómo llegar/ }).last();
    await expect(link).toBeVisible();
    const href = (await link.getAttribute('href')) ?? '';
    expect(new URL(href, page.url()).searchParams.get('src')).toBe('floating');
    const res = await page.request.get(href, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    const url = new URL(res.headers().location ?? '');
    expect(url.hostname).toBe('www.google.com');
    expect(url.pathname).toBe('/maps/dir/');
    expect(url.searchParams.get('destination')).toContain('Mundo Motos');
  });
});

test.describe('contact form', () => {
  test('validates required fields and focuses the first invalid one', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Enviar por WhatsApp/ }).click();
    await expect(page.getByText('Escribe tu nombre.')).toBeVisible();
    await expect(page.getByLabel('Tu nombre')).toBeFocused();
    await expect(page.getByLabel('Tu nombre')).toHaveAttribute('aria-invalid', 'true');
  });

  test('opens WhatsApp once in a new tab and keeps the visitor on the site', async ({
    page,
    context,
  }) => {
    // Never hit the real wa.me from tests.
    await context.route('https://wa.me/**', (route) => route.fulfill({ body: 'whatsapp' }));
    await page.goto('/');
    await page.getByLabel('Tu nombre').fill('Ana');
    await page.getByLabel('¿Qué necesitas?').fill('¿Tienen balatas para FT150?');

    const beacon = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().includes('/api/track'),
    );
    const popups: string[] = [];
    context.on('page', (popup) => popups.push(popup.url()));
    const popupPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: /Enviar por WhatsApp/ }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState();

    const url = new URL(popup.url());
    expect(url.hostname).toBe('wa.me');
    expect(url.searchParams.get('text')).toBe(
      'Hola, Mundo Motos. Soy Ana. ¿Tienen balatas para FT150?',
    );
    expect(new URL(page.url()).hostname).not.toBe('wa.me');
    expect(popups).toHaveLength(1);
    // The click is counted without the message: what the visitor typed never reaches the site.
    const request = await beacon;
    expect(request.postData()).toBeNull();
    const report = new URL(request.url());
    expect(Object.fromEntries(report.searchParams)).toEqual({
      target: 'whatsapp',
      src: 'contact-form',
    });
    await expect(page.getByText(/Abrimos WhatsApp/)).toBeVisible();
  });
});
