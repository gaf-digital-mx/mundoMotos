import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { clickRoutes } from './routes';
import { context } from '../../shared/http/middleware';

import type { AppEnv } from '../../shared/http/types';

/** HTTP behavior with an in-memory Analytics Engine dataset (workerd can't expose its writes). */
const setup = ({ binding = true }: { binding?: boolean } = {}) => {
  const points: AnalyticsEngineDataPoint[] = [];
  const env = {
    SITE_URL: 'https://mundomotos.test',
    SITE_INDEXABLE: 'false',
    BUSINESS_WHATSAPP_NUMBER: '525500000000',
    BUSINESS_FACEBOOK_URL: 'https://www.facebook.com/example',
    ...(binding && {
      CLICKS: { writeDataPoint: (point?: AnalyticsEngineDataPoint) => points.push(point ?? {}) },
    }),
  } as unknown as Env;
  const app = new Hono<AppEnv>().use(context).route('/api', clickRoutes);
  type Init = { method?: string; headers?: Record<string, string>; body?: string };
  const request = (path: string, init: Init = {}) =>
    app.request(
      path,
      {
        ...init,
        headers: { 'User-Agent': 'Mozilla/5.0 Chrome/140.0', Cookie: 'lang=es', ...init.headers },
      },
      env,
    );
  return { points, request };
};

describe('GET /api/go/:target', () => {
  it('records the click and redirects to the configured destination', async () => {
    const { points, request } = setup();
    const res = await request('/api/go/whatsapp?src=featured&text=Hola');
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('https://wa.me/525500000000?text=Hola');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(points).toEqual([
      { indexes: ['whatsapp'], blobs: ['whatsapp', 'featured', 'es', 'XX'], doubles: [1] },
    ]);
  });

  it('still redirects, uncounted, for crawlers and HEAD requests', async () => {
    const { points, request } = setup();
    const bot = await request('/api/go/facebook?src=footer', {
      headers: { 'User-Agent': 'Googlebot/2.1' },
    });
    const head = await request('/api/go/facebook?src=footer', { method: 'HEAD' });
    expect(bot.status).toBe(302);
    expect(head.status).toBe(302);
    expect(points).toHaveLength(0);
  });

  it('records an unknown or missing source instead of breaking the CTA', async () => {
    const { points, request } = setup();
    const res = await request('/api/go/facebook?src=removed-section');
    expect(res.headers.get('Location')).toBe('https://www.facebook.com/example');
    await request('/api/go/facebook');
    expect(points.map((point) => point.blobs?.[1])).toEqual(['unknown', 'unknown']);
  });

  it('records the Cloudflare country when present', async () => {
    const { points } = setup();
    const env = {
      SITE_URL: 'https://mundomotos.test',
      SITE_INDEXABLE: 'false',
      BUSINESS_WHATSAPP_NUMBER: '525500000000',
      BUSINESS_FACEBOOK_URL: 'https://www.facebook.com/example',
      CLICKS: { writeDataPoint: (point?: AnalyticsEngineDataPoint) => points.push(point ?? {}) },
    } as unknown as Env;
    const app = new Hono<AppEnv>().use(context).route('/api', clickRoutes);
    const req = new Request('https://mundomotos.test/api/go/facebook?src=footer', {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/140.0' },
    });
    Object.defineProperty(req, 'cf', { value: { country: 'MX' } });
    await app.fetch(req, env);
    expect(points[0]?.blobs?.[3]).toBe('MX');
  });

  it('does not count embeds or prefetches, only navigations', async () => {
    const { points, request } = setup();
    const embed = await request('/api/go/facebook?src=footer', {
      headers: { 'Sec-Fetch-Mode': 'no-cors', 'Sec-Fetch-Dest': 'image' },
    });
    await request('/api/go/facebook?src=footer', { headers: { 'Sec-Purpose': 'prefetch' } });
    await request('/api/go/facebook?src=footer', {
      headers: { 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document' },
    });
    expect(embed.status).toBe(302);
    expect(points).toHaveLength(1);
  });

  it('keeps CR/LF in the text out of the Location header', async () => {
    const { request } = setup();
    const res = await request('/api/go/whatsapp?src=hero&text=Hola%0D%0ASet-Cookie:%20x=1');
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe(
      'https://wa.me/525500000000?text=Hola%0D%0ASet-Cookie%3A%20x%3D1',
    );
    expect(res.headers.get('Set-Cookie')).toBeNull();
  });

  it('still redirects without an Analytics Engine binding', async () => {
    const { request } = setup({ binding: false });
    expect((await request('/api/go/facebook?src=footer')).status).toBe(302);
  });

  it('rejects unknown targets, phone redirects and directions without a place', async () => {
    const { points, request } = setup();
    expect((await request('/api/go/evil?src=hero')).status).toBe(404);
    expect((await request('/api/go/phone?src=footer')).status).toBe(404);
    const res = await request('/api/go/directions?src=hero');
    expect(res.status).toBe(400);
    expect(res.headers.get('Content-Type')).toContain('application/problem+json');
    expect(points).toHaveLength(0);
  });
});

describe('POST /api/track', () => {
  it('records same-origin reports without redirecting', async () => {
    const { points, request } = setup();
    const res = await request('/api/track?target=whatsapp&src=contact-form', {
      method: 'POST',
      headers: { 'Sec-Fetch-Site': 'same-origin' },
      body: 'PING',
    });
    expect(res.status).toBe(204);
    expect(points[0]?.blobs).toEqual(['whatsapp', 'contact-form', 'es', 'XX']);
  });

  it('ignores cross-site reports', async () => {
    const { points, request } = setup();
    const res = await request('/api/track?target=phone&src=footer', {
      method: 'POST',
      headers: { 'Sec-Fetch-Site': 'cross-site' },
    });
    expect(res.status).toBe(204);
    expect(points).toHaveLength(0);
  });

  it('rejects invalid reports with problem details', async () => {
    const { request } = setup();
    const res = await request('/api/track?target=email&src=hero', { method: 'POST' });
    expect(res.status).toBe(400);
    expect(res.headers.get('Content-Type')).toContain('application/problem+json');
  });
});
