import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('landing page', () => {
  test('renders every section in order @smoke', async ({ page }) => {
    await page.goto('/');
    const headings = page.getByRole('heading', { level: 2 });
    await expect(headings).toContainText([
      'Que tu moto ruede como nueva',
      'Lo que más nos piden',
      'Estamos en Tepetlixpa',
      'Cuéntanos qué necesitas.',
      '¿Listo para darle vida a tu moto?',
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
    // The service quote now lives in the card's dialog.
    await page
      .getByRole('button', { name: /Ver más/ })
      .first()
      .click();
    const href = await page
      .getByRole('dialog')
      .getByRole('link', { name: /Cotizar.*Afinación/ })
      .getAttribute('href');
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

  test('offers a call on phones and WhatsApp elsewhere', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('section[aria-labelledby="hero-title"] a[href^="tel:"]');
    const call = page.locator('section[aria-labelledby="cta-title"] a[href^="tel:"]');
    const write = page.locator('section[aria-labelledby="cta-title"] a[href^="/api/go/whatsapp"]');
    for (const link of [hero, call]) {
      await expect(link).toHaveAttribute('href', /^tel:\+\d+$/);
      // tel: never goes through the redirect; the click is reported with <a ping>.
      await expect(link).toHaveAttribute('ping', /^\/api\/track\?target=phone&src=/);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(hero).toBeVisible();
    await expect(call).toBeVisible();
    await expect(write).toBeHidden();

    // A tel: link does nothing on a desktop: the hero leans on the header button, and the
    // closing CTA (far below it, the header isn't sticky) offers WhatsApp instead.
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(hero).toBeHidden();
    await expect(call).toBeHidden();
    await expect(write).toBeVisible();
    await expect(page.locator('header a[href^="/api/go/whatsapp"]')).toBeVisible();
  });

  test('reports the call as coming from its section', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const ping = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().includes('/api/track'),
    );
    await page.locator('section[aria-labelledby="hero-title"] a[href^="tel:"]').click();
    expect(new URL((await ping).url()).searchParams.get('src')).toBe('hero');
  });

  test('loads the Google Maps map as the section approaches, without a click', async ({ page }) => {
    await page.goto('/');
    const map = page.getByTitle('Mapa de Mundo Motos en Google Maps');
    // Requested only when the section approaches, never on page load (even on desktop).
    await expect(map).not.toHaveAttribute('src');
    await page.locator('#ubicacion address').scrollIntoViewIfNeeded();
    // By place id, so the map opens the business listing instead of bare coordinates.
    await expect(map).toHaveAttribute('src', /^https:\/\/www\.google\.com\/maps\?cid=\d+&/);
    await expect(page.getByRole('button', { name: 'Mostrar mapa' })).toHaveCount(0);
  });

  test('the directions pill redirects to Google Maps directions', async ({ page }) => {
    await page.goto('/');
    const href = (await page.locator('[data-directions="floating"]').getAttribute('href')) ?? '';
    expect(new URL(href, page.url()).searchParams.get('src')).toBe('floating');
    const res = await page.request.get(href, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    const url = new URL(res.headers().location ?? '');
    expect(url.hostname).toBe('www.google.com');
    expect(url.pathname).toBe('/maps/dir/');
    expect(url.searchParams.get('destination')).toContain('Mundo Motos');
  });
});

test.describe('service cards', () => {
  test('the intro copy links to the contact form and to Visítanos', async ({ page }) => {
    await page.goto('/');
    const intro = page.locator('#servicios header p');
    await expect(intro.getByRole('link', { name: 'escríbenos por WhatsApp' })).toHaveAttribute(
      'href',
      '#contacto',
    );
    await expect(intro.getByRole('link', { name: 've aquí' })).toHaveAttribute(
      'href',
      '#ubicacion',
    );
  });

  test('shows the six services as cards with a lazy, decorative photo each @smoke', async ({
    page,
  }) => {
    await page.goto('/');
    const cards = page.locator('#servicios [data-service-card]');
    await expect(cards).toHaveCount(6);
    await expect(cards.first().getByRole('heading', { level: 3 })).toHaveText('Afinación');
    // Decorative: the name sits right below, so the photo adds nothing to a screen reader.
    await expect(cards.first().locator('img')).toHaveAttribute('alt', '');
    await expect(cards.first().locator('img')).toHaveAttribute('loading', 'lazy');
  });

  test('"Ver más" opens a dialog with that service, and Escape returns focus', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('#servicios [data-service-card]').nth(1);
    const button = card.getByRole('button', { name: /Ver más/ });
    // Opened from the keyboard: macOS WebKit doesn't focus a button on click, and focus return
    // is only meaningful for a visitor who had focus there in the first place.
    await button.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('Cambio de balatas');
    // The card clamps its copy; the dialog is where the whole thing lives.
    await expect(dialog).toContainText('balatas delanteras y traseras');
    await expect(dialog.getByRole('link', { name: /Cotizar/ })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
  });

  test('each button names its service, and a second card replaces the copy', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('#servicios [data-service-card]');
    // Six buttons reading only "Ver más" would be six identical controls in a screen reader's
    // list, so each one carries its service name.
    await expect(
      cards.nth(4).getByRole('button', { name: /Ver más.*Iluminación/ }),
    ).toHaveAttribute('aria-haspopup', 'dialog');

    const dialog = page.getByRole('dialog');
    await cards
      .first()
      .getByRole('button', { name: /Ver más/ })
      .click();
    await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('Afinación');
    await page.keyboard.press('Escape');
    await cards
      .nth(4)
      .getByRole('button', { name: /Ver más/ })
      .click();
    await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('Iluminación y accesorios');
    await expect(dialog.getByRole('link', { name: /Cotizar.*Iluminación/ })).toBeVisible();
  });

  test('the dialog closes on "Cerrar" and on a click outside its panel', async ({ page }) => {
    await page.goto('/');
    const button = page.locator('#servicios [data-service-card]').first().getByRole('button');
    await button.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cerrar' }).click();
    await expect(dialog).toBeHidden();

    await button.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(dialog).toBeHidden();
  });

  test('the open dialog has no serious or critical axe violations', async ({ page }) => {
    await page.goto('/');
    await page.locator('#servicios [data-service-card]').first().getByRole('button').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('the page behind the open dialog cannot be scrolled', async ({ page }) => {
    await page.goto('/');
    // Asserted through the style rather than a wheel event: mobile WebKit has no wheel.
    const overflow = () => page.evaluate(() => getComputedStyle(document.documentElement).overflow);
    expect(await overflow()).not.toBe('hidden');
    await page.locator('#servicios [data-service-card]').first().getByRole('button').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await overflow()).toBe('hidden');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(await overflow()).not.toBe('hidden');
  });
});

test.describe('service cards without scripting', () => {
  test.use({ javaScriptEnabled: false });

  test('the cards offer the quote link the dialog would have led to', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('#servicios [data-service-card]').first();
    await expect(card.getByRole('button', { name: /Ver más/ })).toBeHidden();
    const quote = card.getByRole('link', { name: /Cotizar.*Afinación/ });
    await expect(quote).toBeVisible();
    expect(
      new URL((await quote.getAttribute('href')) ?? '', page.url()).searchParams.get('src'),
    ).toBe('services');
  });
});

test.describe('"Cómo llegar" pill', () => {
  test('docks into the hero and the location section, and floats in between', async ({ page }) => {
    await page.goto('/');
    const floating = page.locator('[data-directions="floating"]');
    const hero = page.locator('[data-dock="hero"]');
    const location = page.locator('[data-dock="location"]');

    // On load the hero is on screen: the pill sits next to the WhatsApp CTA.
    await expect(hero).toBeVisible();
    await expect(floating).toBeHidden();
    await expect(location).toBeHidden();

    await page.locator('#servicios').scrollIntoViewIfNeeded();
    await expect(floating).toBeVisible();
    await expect(hero).toBeHidden();

    await location.evaluate((element) => {
      window.scrollBy(0, element.getBoundingClientRect().top - window.innerHeight / 3);
    });
    await expect(location).toBeVisible();
    await expect(floating).toBeHidden();

    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await expect(hero).toBeVisible();
    await expect(floating).toBeHidden();
  });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    test(`a pill is always on screen around a dock slot at ${String(viewport.width)}x${String(viewport.height)}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const slot = page.locator('[data-dock="location"]');
      // Slot just below the viewport, then just above it: the floating pill must cover both.
      for (const offset of [viewport.height + 20, -80]) {
        await slot.evaluate((element, delta) => {
          window.scrollBy(0, element.getBoundingClientRect().top - delta);
        }, offset);
        await expect(page.locator('[data-directions="floating"]')).toBeInViewport();
        await expect(slot).toBeHidden();
      }
      // Fully on screen, clear of the floating band: docked.
      await slot.evaluate((element) => {
        window.scrollBy(0, element.getBoundingClientRect().top - window.innerHeight / 3);
      });
      await expect(slot).toBeInViewport();
      await expect(page.locator('[data-directions="floating"]')).toBeHidden();
    });
  }

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    test(`scrolling the whole page never leaves it without a pill nor makes it oscillate at ${String(viewport.width)}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.evaluate(() => {
        const w = window as unknown as { __dockChanges: number };
        w.__dockChanges = 0;
        new MutationObserver(() => {
          w.__dockChanges += 1;
        }).observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-directions-dock'],
        });
      });
      // Exactly one copy of the pill — floating or docked — is ever visible on screen.
      const pillOnScreen = () =>
        page.evaluate(
          () =>
            [...document.querySelectorAll('[data-directions]')].filter((element) => {
              if (getComputedStyle(element).visibility === 'hidden') return false;
              const rect = element.getBoundingClientRect();
              return rect.bottom > 0 && rect.top < window.innerHeight;
            }).length === 1,
        );
      const scrollable = await page.evaluate(
        () => document.documentElement.scrollHeight - window.innerHeight,
      );
      const steps = Math.ceil(scrollable / 150) + 2;
      for (const direction of [1, -1]) {
        for (let step = 0; step < steps; step++) {
          // scrollBy, not mouse.wheel (unsupported in mobile WebKit): same scroll/IO events.
          await page.evaluate((delta) => {
            window.scrollBy(0, delta);
          }, 150 * direction);
          // Poll: the swap happens on the next IntersectionObserver callback, so a brief
          // transition is expected (and invisible to a person) on a slow machine.
          await expect.poll(pillOnScreen, { timeout: 2000 }).toBe(true);
        }
      }
      // Settled at the top: docked in the hero, and no more state changes (no feedback loop).
      await expect(page.locator('[data-dock="hero"]')).toBeVisible();
      const changes = await page.evaluate(
        () => (window as unknown as { __dockChanges: number }).__dockChanges,
      );
      await page.waitForTimeout(1000);
      expect(
        await page.evaluate(() => (window as unknown as { __dockChanges: number }).__dockChanges),
      ).toBe(changes);
      // Down and back up crosses each dock twice (hero, location, closing CTA), floating in
      // between: a handful of changes, not hundreds.
      expect(changes).toBeLessThanOrEqual(14);
    });
  }

  test('focus follows the pill when it docks', async ({ page }) => {
    await page.goto('/');
    await page.locator('#servicios').scrollIntoViewIfNeeded();
    const floating = page.locator('[data-directions="floating"]');
    await expect(floating).toBeVisible();
    await floating.focus();
    await page.locator('[data-dock="location"]').evaluate((element) => {
      window.scrollBy(0, element.getBoundingClientRect().top - window.innerHeight / 3);
    });
    await expect(page.locator('[data-dock="location"]')).toBeFocused();
  });

  test('attributes clicks to where the pill is', async ({ page }) => {
    await page.goto('/');
    for (const [selector, source] of [
      ['[data-directions="floating"]', 'floating'],
      ['[data-dock="hero"]', 'hero'],
      ['[data-dock="location"]', 'location'],
    ] as const) {
      const href = (await page.locator(selector).getAttribute('href')) ?? '';
      expect(new URL(href, page.url()).searchParams.get('src')).toBe(source);
    }
  });

  test('only the visible copy is focusable', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-dock="hero"]')).toBeVisible();
    // Hidden copies leave the accessibility tree: exactly one "Cómo llegar" link is exposed.
    await expect(page.getByRole('link', { name: /Cómo llegar/ })).toHaveCount(1);
  });

  test('keeps the floating pill on pages without dock sections', async ({ page }) => {
    await page.goto('/aviso-de-privacidad');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await expect(page.locator('[data-directions="floating"]')).toBeVisible();
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
    await page.getByLabel('Describe tu duda').fill('¿Tienen balatas para FT150?');

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
