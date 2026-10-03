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

  test('every WhatsApp link targets wa.me with a prefilled message', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page
      .locator('a[href^="https://wa.me/"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
    expect(hrefs.length).toBeGreaterThan(10);
    for (const href of hrefs) {
      expect(new URL(href).searchParams.get('text')).toBeTruthy();
    }
  });

  test('service quote links name the service', async ({ page }) => {
    await page.goto('/');
    const href = await page.getByRole('link', { name: /Cotizar.*Afinación/ }).getAttribute('href');
    expect(new URL(href ?? '').searchParams.get('text')).toContain('Afinación');
  });

  test('carousel duplicate is hidden from assistive tech and keyboard', async ({ page }) => {
    await page.goto('/');
    const duplicate = page.locator('#refacciones ul[aria-hidden="true"]');
    await expect(duplicate).toHaveAttribute('inert', '');
    await expect(page.getByRole('link', { name: /Preguntar disponibilidad/ })).toHaveCount(18);
  });

  test('loads the Google Maps embed only after the visitor asks', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('iframe[src*="google.com/maps"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Mostrar mapa' }).click();
    await expect(page.locator('iframe[src*="google.com/maps"]')).toHaveCount(1);
  });

  test('floating directions button points to Google Maps directions', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('link', { name: /Cómo llegar/ }).last();
    await expect(link).toBeVisible();
    const url = new URL((await link.getAttribute('href')) ?? '');
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

  test('opens WhatsApp with the visitor name and query', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      (window as unknown as { __opened: string[] }).__opened = [];
      window.open = (url) => {
        (window as unknown as { __opened: string[] }).__opened.push(String(url));
        return window;
      };
    });
    await page.getByLabel('Tu nombre').fill('Ana');
    await page.getByLabel('¿Qué necesitas?').fill('¿Tienen balatas para FT150?');
    await page.getByRole('button', { name: /Enviar por WhatsApp/ }).click();

    const opened = await page.evaluate(
      () => (window as unknown as { __opened: string[] }).__opened,
    );
    expect(opened).toHaveLength(1);
    const url = new URL(opened[0] ?? '');
    expect(url.hostname).toBe('wa.me');
    expect(url.searchParams.get('text')).toBe(
      'Hola, Mundo Motos. Soy Ana. ¿Tienen balatas para FT150?',
    );
    await expect(page.getByText(/Abrimos WhatsApp/)).toBeVisible();
  });
});
