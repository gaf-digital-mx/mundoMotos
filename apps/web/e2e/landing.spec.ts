import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Drags the category strip sideways by `dx` pixels, gripping it `offset` pixels from its middle.
 *
 * It checks the strip took the gesture before letting go, because a drag that does nothing can
 * fail in three places — the press never reaching the strip, the strip never claiming the
 * gesture, or the release landing on the wrong card — and only the last one is about the
 * carousel's own arithmetic. A bare assertion on the panel afterwards cannot tell them apart.
 */
const drag = async (page: Page, offset: number, dx: number) => {
  const strip = page.locator('#refacciones [data-coverflow]');
  // The cards sit at the top of the strip; the rest of its box is the space they are drawn in.
  const grip = { x: ((await strip.boundingBox())?.width ?? 0) / 2 + offset, y: 40 };
  // Pointed at rather than pressed at coordinates measured earlier: the section rises into place
  // on its way in, and Playwright waits here for the strip to stop moving and to be the thing
  // under that point. A box measured a moment too early is a press that lands beside the strip,
  // where the island — which listens on the list, not on the window — never hears it.
  await strip.hover({ position: grip });
  const box = await strip.boundingBox();
  const x = (box?.x ?? 0) + grip.x;
  const y = (box?.y ?? 0) + grip.y;
  // What the browser actually sent, in case the strip does not take the gesture: then it says
  // why rather than only that it did not. That answer took three CI rounds the first time.
  const sent = await page.evaluateHandle(() => {
    const log: string[] = [];
    const note = (event: Event) => {
      const { type, pointerType, button, buttons, isPrimary } = event as PointerEvent;
      log.push(`${type}:${pointerType}:button=${button}:buttons=${buttons}:primary=${isPrimary}`);
    };
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      window.addEventListener(type, note);
    }
    return log;
  });
  await page.mouse.down();
  // Far enough to be sideways rather than a tap that wandered (the island's own threshold).
  await page.mouse.move(x + Math.sign(dx) * 20, y);
  const took = 'the strip took the gesture';
  await expect
    .poll(async () =>
      (await strip.evaluate((node) => node.hasAttribute('data-dragging')))
        ? took
        : `the strip never took the gesture; the page saw ${(await sent.jsonValue()).join(' | ')}`,
    )
    .toBe(took);
  await page.mouse.move(x + dx, y, { steps: 12 });
  // The cards follow the gesture as it happens: `--drag` is how many places they have moved.
  // Polled rather than read once, like the assertions around it: an engine is free to resolve
  // the move before the page has run its listener, and a single read would race that.
  await expect
    .poll(async () =>
      Math.abs(Number(await strip.evaluate((node) => node.style.getPropertyValue('--drag')))),
    )
    .toBeGreaterThan(0.5);
  await page.mouse.up();
  await expect(strip).not.toHaveAttribute('data-dragging');
};

test.describe('landing page', () => {
  test('renders every section in order @smoke', async ({ page }) => {
    await page.goto('/');
    const headings = page.getByRole('heading', { level: 2 });
    await expect(headings).toContainText([
      'Que tu moto ruede como nueva',
      'Cuéntanos qué necesitas.',
      'Los más buscados',
      'Estamos en Tepetlixpa',
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

  test('every featured item keeps its own tracked WhatsApp chip', async ({ page }) => {
    await page.goto('/');
    // The 18 items moved from a scrolling strip into seven category cards; none was lost. The
    // carousel only shows the middle category's chips, so the count includes the hidden ones.
    await expect(page.locator('#refacciones a[href^="/api/go/whatsapp"]')).toHaveCount(18);
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

  test('the tune-up dialog tables what the service covers, per vehicle', async ({ page }) => {
    await page.goto('/');
    await page.locator('#servicios [data-service-card]').first().getByRole('button').click();
    const dialog = page.getByRole('dialog');
    const table = dialog.getByRole('table');
    await expect(table).toBeVisible();
    // Eight jobs plus the header row.
    await expect(table.getByRole('row')).toHaveCount(9);
    // The one line that differs is the reason this is a table and not a list: a scooter has no
    // chain to tension. The mark alone says nothing, so the answer is also spelled out.
    const chain = table.getByRole('row', { name: /cadena/ });
    await expect(chain).toContainText('Sí lo incluye');
    await expect(chain).toContainText('No aplica');
    await expect(dialog).toContainText('El costo varía dependiendo marca, modelo y cilindraje');
  });

  test('the figure is fetched when the dialog opens, never with the page', async ({ page }) => {
    const chunks: string[] = [];
    page.on('request', (request) => {
      if (/\.js(\?|$)/.test(request.url())) chunks.push(request.url());
    });
    await page.goto('/');
    await expect(page.locator('#servicios [data-service-card]').first()).toBeVisible();
    const before = chunks.length;
    expect(await page.locator('.iso-svg').count()).toBe(0);

    await page.locator('#servicios [data-service-card]').first().getByRole('button').click();
    const figure = page.locator('.iso-svg');
    await expect(figure).toBeVisible();
    expect(chunks.length, 'the figure arrives in a chunk of its own').toBeGreaterThan(before);

    // The throttle is the only control, and it answers the keyboard as a slider should.
    const throttle = page.getByRole('slider');
    const readout = page.locator('[data-readout]');
    await throttle.focus();
    // The card carries its resting reading before the first frame, so this is never empty.
    const idle = await readout.textContent();
    expect(idle).toMatch(/\d/);
    await throttle.press('End');
    await expect.poll(async () => readout.textContent()).not.toBe(idle);
    await throttle.press('Home');
    await expect.poll(async () => readout.textContent()).toBe(idle);
  });

  test('a service with no detail copy shows its body alone', async ({ page }) => {
    await page.goto('/');
    await page.locator('#servicios [data-service-card]').nth(1).getByRole('button').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('Cambio de balatas');
    await expect(dialog.getByRole('table')).toHaveCount(0);
    await expect(dialog.locator('.iso-svg')).toHaveCount(0);
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

test.describe('featured categories', () => {
  test('shows seven category cards with a lazy, decorative photo each @smoke', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('#refacciones [data-card]');
    await expect(cards).toHaveCount(7);
    const first = cards.first();
    await expect(first.getByRole('heading', { level: 3 })).toHaveText('Iluminación');
    // Decorative: the category name sits on top of it.
    await expect(first.locator('img')).toHaveAttribute('alt', '');
    await expect(first.locator('img')).toHaveAttribute('loading', 'lazy');
  });

  test('only the category in the middle shows its chips', async ({ page }) => {
    await page.goto('/');
    // Picking a category also stops the rotation, so nothing moves under the assertions.
    await page.getByRole('button', { name: 'Ver Iluminación' }).click();
    await expect(page.locator('#refacciones a:visible')).toHaveCount(6);
    await expect(page.getByRole('link', { name: /Foco H4/ })).toBeVisible();

    await page.getByRole('button', { name: 'Ver Protección' }).click();
    await expect(page.getByRole('link', { name: /Cascos/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Foco H4/ })).toBeHidden();
  });

  test('rotates on its own and stays put once paused', async ({ page }) => {
    await page.goto('/');
    const lighting = page.locator('#featured-panel-lighting');
    await expect(lighting).toBeVisible();
    // It starts on the first category and moves along without anyone touching it.
    await expect(lighting).toBeHidden({ timeout: 15_000 });

    const toggle = page.locator('#refacciones [data-carousel-toggle]');
    await toggle.click();
    const showing = await page
      .locator('#refacciones [id^="featured-panel-"]:visible')
      .first()
      .getAttribute('id');
    // Away from the carousel: the focused button holds the rotation by itself, which would
    // hide a broken pause button.
    await page.locator('#featured-title').click();
    await expect(toggle).toHaveAttribute('aria-label', /^Reanudar/);
    // Comfortably longer than one turn of the rotation (3.6s).
    await page.waitForTimeout(5000);
    await expect(page.locator(`#${showing ?? ''}`)).toBeVisible();
  });

  test('a drag moves the strip along, and the ring has no ends', async ({ page }) => {
    await page.goto('/');
    const strip = page.locator('#refacciones [data-coverflow]');
    await strip.scrollIntoViewIfNeeded();
    // Picking a category stops the rotation: from here on the gesture is the only thing moving.
    await page.getByRole('button', { name: 'Ver Iluminación' }).click();
    // Both ends of a gesture have to stay on screen — a narrow phone is only ~390px wide, so a
    // 200px pull from the middle would end off the viewport, where no thumb can reach and no
    // engine promises anything. Gripping the strip off-centre, still on the middle card, keeps
    // the whole of it in reach.
    const travel = 200;
    const grip = 70;

    // Pulling left brings the next category over, further than any card's travel on any screen.
    await drag(page, grip, -travel);
    await expect(page.locator('#featured-panel-accessories')).toBeVisible();

    // Pulling the other way past the first category lands on the last one, not on nothing.
    await drag(page, -grip, travel);
    await expect(page.locator('#featured-panel-lighting')).toBeVisible();
    await page.getByRole('button', { name: 'Categoría anterior' }).click();
    await expect(page.locator('#featured-panel-brakePads')).toBeVisible();
    // ...and the category after the last one is the first again.
    await page.getByRole('button', { name: 'Categoría siguiente' }).click();
    await expect(page.locator('#featured-panel-lighting')).toBeVisible();
  });

  test('a chip asks for its own part by name', async ({ page }) => {
    await page.goto('/');
    const chip = page.locator('#featured-panel-lighting a').first();
    const href = (await chip.getAttribute('href')) ?? '';
    const url = new URL(href, page.url());
    expect(url.searchParams.get('src')).toBe('featured');
    expect(url.searchParams.get('text')).toContain('Foco H4');
  });
});

test.describe('section entrances', () => {
  test('every block that reaches the screen ends up in its place', async ({ page }) => {
    await page.goto('/');
    for (const id of ['#servicios', '#refacciones', '#ubicacion', '#contacto']) {
      await page.locator(id).scrollIntoViewIfNeeded();
      await expect(page.locator(`${id} h2`)).toBeVisible();
    }
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(900);
    // A block the visitor has scrolled past must never still be displaced: the guard against an
    // entrance that moves copy and then fails to put it back. Blocks still poking in from the
    // bottom edge are the exit, and are allowed to be on their way out. The entrance never
    // touches opacity — a block caught mid-fade would render its text under 4.5:1.
    const stuck = await page.locator('[data-enter]').evaluateAll(
      (blocks) =>
        blocks
          .filter((block) => block.getBoundingClientRect().top < window.innerHeight * 0.9)
          .filter((block) => {
            const { translate, scale, opacity } = getComputedStyle(block);
            const moved = translate !== 'none' && translate !== '0px';
            const scaled = scale !== 'none' && scale !== '1';
            return moved || scaled || Number(opacity) < 1;
          }).length,
    );
    expect(stuck).toBe(0);
  });

  test('a block sinks back out when it is scrolled below the fold again', async ({ page }) => {
    await page.goto('/');
    const block = page.locator('#ubicacion [data-enter]').first();
    await page.locator('#ubicacion').scrollIntoViewIfNeeded();
    await expect(block).toHaveAttribute('data-entered', '');

    // Scrolling up is the exit: the same travel, backwards, ready to play again on the way down.
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await expect(block).not.toHaveAttribute('data-entered', /.*/);
    await page.locator('#ubicacion').scrollIntoViewIfNeeded();
    await expect(block).toHaveAttribute('data-entered', '');
  });

  test('nothing is displaced when the island never runs', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    // Without the island nothing marks <html>, so no block is ever hidden or moved.
    await expect(page.locator('html')).not.toHaveAttribute('data-enter-ready', /.*/);
    await expect(page.locator('#refacciones h2')).toBeVisible();
    // The carousel is the island's doing too: without it every category shows every chip, and
    // no control is rendered that nothing could drive.
    await expect(page.getByRole('link', { name: /Preguntar disponibilidad/ })).toHaveCount(18);
    await expect(page.locator('#refacciones button')).toHaveCount(0);
    await context.close();
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
      // Exactly one copy of the pill — floating or docked — is ever visible on screen, except
      // over a region that asked for the lane to itself, where there is deliberately none.
      const pillOnScreen = () =>
        page.evaluate(() => {
          const onScreen = (element: Element) => {
            const rect = element.getBoundingClientRect();
            return rect.bottom > 0 && rect.top < window.innerHeight;
          };
          const showing = [...document.querySelectorAll('[data-directions]')].filter(
            (element) => getComputedStyle(element).visibility !== 'hidden' && onScreen(element),
          ).length;
          // The pill only shares a lane below `md`, and only with what has reached the lower
          // half of the screen.
          const muted =
            window.matchMedia('(width < 48rem)').matches &&
            [...document.querySelectorAll('[data-directions-mute]')].some((element) => {
              const rect = element.getBoundingClientRect();
              return rect.bottom > window.innerHeight / 2 && rect.top < window.innerHeight;
            });
          return showing === (muted ? 0 : 1);
        });
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

  test('no dock slot travels with a section entrance', async ({ page }) => {
    await page.goto('/');
    // A slot inside a block that rises into place moves while the block settles, and the dock
    // measures that moving box: the pill then swaps copies several times over, which is the
    // flicker the test above counts. Keep the slots out of the entrances instead.
    await expect(page.locator('[data-dock-slot]')).not.toHaveCount(0);
    await expect(page.locator('[data-enter] [data-dock-slot]')).toHaveCount(0);
  });

  test('no parallax layer travels with a section entrance', async ({ page }) => {
    await page.goto('/');
    // Same trap as the dock slot above: an entrance translates its whole subtree, so a layer
    // drifting inside one would be drifting against a frame that is itself moving.
    await expect(page.locator('[data-parallax]')).not.toHaveCount(0);
    await expect(page.locator('[data-enter] [data-parallax]')).toHaveCount(0);
  });

  test('the floating pill leaves the bottom lane on a phone, and keeps it on a desktop', async ({
    page,
  }) => {
    await page.goto('/');
    const floating = page.locator("[data-directions='floating']");
    const submit = page.locator('#contacto button[type="submit"]');
    const intoLowerHalf = async () => {
      await submit.evaluate((element) => {
        window.scrollBy(0, element.getBoundingClientRect().top - window.innerHeight * 0.75);
      });
    };

    await page.setViewportSize({ width: 390, height: 844 });
    // Above the halfway line the two are nowhere near each other, so the pill stays.
    await submit.evaluate((element) => {
      window.scrollBy(0, element.getBoundingClientRect().top - window.innerHeight * 0.2);
    });
    await expect(floating).toBeVisible();
    await intoLowerHalf();
    await expect(floating).toBeHidden();

    // From `md` the pill is in the corner and the button is left-aligned: no lane to share.
    await page.setViewportSize({ width: 1440, height: 900 });
    await intoLowerHalf();
    await expect(floating).toBeVisible();
  });

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
