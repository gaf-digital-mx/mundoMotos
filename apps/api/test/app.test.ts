import { healthResponseSchema, problemDetailsSchema } from '@mundomotos/contracts';
import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

const get = (path: string, init?: RequestInit) =>
  exports.default.fetch(`https://mundomotos.test${path}`, { redirect: 'manual', ...init });

describe('GET /api/health', () => {
  it('returns a valid health payload', async () => {
    const res = await get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(healthResponseSchema.parse(await res.json()).version).toBe('test');
  });
});

describe('unknown API routes', () => {
  it('answer with RFC 9457 problem details', async () => {
    const res = await get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toContain('application/problem+json');
    const body = problemDetailsSchema.parse(await res.json());
    expect(body.type).toBe('https://mundomotos.test/problems/not-found');
  });
});

describe('tracked CTA redirects (ADR-0013)', () => {
  it('records through the Analytics Engine binding and redirects', async () => {
    const res = await get('/api/go/whatsapp?src=hero&text=Hola', {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/140.0' },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('https://wa.me/525500000000?text=Hola');
    expect(res.headers.get('X-Robots-Tag')).toContain('noindex');
  });

  it('accepts beacon reports', async () => {
    const res = await get('/api/track?target=whatsapp&src=contact-form', { method: 'POST' });
    expect(res.status).toBe(204);
  });
});

describe('Content-Security-Policy (Report-Only)', () => {
  it('sends a hash-based policy for each page from the build manifest', async () => {
    const res = await get('/');
    const policy = res.headers.get('Content-Security-Policy-Report-Only') ?? '';
    expect(policy).toContain("script-src 'self' 'sha256-HomeFixtureHash='");
    expect(res.headers.get('Reporting-Endpoints')).toBe('csp="/api/csp-report"');
    expect(res.headers.get('Content-Security-Policy')).toBeNull();
  });

  it('uses the 404 page hashes for missing pages', async () => {
    const res = await get('/no-existe');
    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Security-Policy-Report-Only')).toContain(
      "'sha256-NotFoundFixtureHash='",
    );
  });

  it('never serves the manifest itself', async () => {
    expect((await get('/_csp-hashes.json')).status).toBe(404);
    // Locale-prefixed: 301 to the clean path, which 404s.
    const prefixed = await get('/es/_csp-hashes.json');
    expect(prefixed.status).toBe(301);
    expect(prefixed.headers.get('Location')).toBe('/_csp-hashes.json');
  });

  it('keeps the policy on 304 revalidations so returning visitors get policy changes', async () => {
    const first = await get('/');
    const etag = first.headers.get('ETag');
    expect(etag).toBeTruthy();
    await first.text();
    const revalidated = await get('/', { headers: { 'If-None-Match': etag ?? '' } });
    expect(revalidated.status).toBe(304);
    expect(revalidated.headers.get('Content-Security-Policy-Report-Only')).toContain(
      "'sha256-HomeFixtureHash='",
    );
  });

  it('accepts violation reports in both formats', async () => {
    const legacy = await get('/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/csp-report' },
      body: JSON.stringify({ 'csp-report': { 'blocked-uri': 'inline' } }),
    });
    const batch = await get('/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/reports+json' },
      body: JSON.stringify([{ type: 'csp-violation', body: { blockedURL: 'eval' } }]),
    });
    const junk = await get('/api/csp-report', { method: 'POST', body: 'not json' });
    expect([legacy.status, batch.status, junk.status]).toEqual([204, 204, 204]);
  });
});

describe('locale-aware static site (ADR-0008)', () => {
  it('serves Spanish at / with no locale in the URL', async () => {
    const res = await get('/');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Inicio ES');
    expect(res.headers.get('Content-Language')).toBe('es');
    expect(res.headers.get('Vary')).toContain('Cookie');
    expect(res.headers.get('Cache-Control')).toBe('no-cache');
  });

  it('serves nested pages and RSC payloads from the locale tree', async () => {
    expect(await (await get('/catalogo')).text()).toContain('Catálogo ES');
    expect(await (await get('/catalogo.txt')).text()).toContain('RSC payload ES');
  });

  it('keeps serving Spanish while English is not enabled, even with lang=en', async () => {
    const res = await get('/', { headers: { Cookie: 'lang=en' } });
    expect(await res.text()).toContain('Inicio ES');
  });

  it.each([
    ['/es', '/'],
    ['/es/catalogo', '/catalogo'],
    ['/en/catalogo?x=1', '/catalogo?x=1'],
  ])('redirects prefixed %s permanently to %s', async (path, target) => {
    const res = await get(path);
    expect(res.status).toBe(301);
    expect(
      new URL(res.headers.get('Location') ?? '', 'https://mundomotos.test').pathname +
        new URL(res.headers.get('Location') ?? '', 'https://mundomotos.test').search,
    ).toBe(target);
  });

  it.each(['/es//evil.com', '/en//evil.com/login', '/es/%2F%2Fevil.com', '/es/\\evil.com'])(
    'is not an open redirect for %s',
    async (path) => {
      const res = await get(path);
      const location = res.headers.get('Location') ?? '';
      expect(location.startsWith('/')).toBe(true);
      expect(location.startsWith('//')).toBe(false);
      expect(new URL(location, 'https://mundomotos.test').origin).toBe('https://mundomotos.test');
    },
  );

  it('never leaks the internal prefix through trailing-slash redirects', async () => {
    const res = await get('/catalogo/');
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get('Location')).toBe('/catalogo');
  });

  it('serves the 404 page for unknown paths', async () => {
    const res = await get('/no-existe');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('Página no encontrada');
  });

  it('serves locale-agnostic files untouched', async () => {
    const res = await get('/robots.txt');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Language')).toBeNull();
  });
});

describe('robots guard (ADR-0016)', () => {
  it('marks every response noindex while SITE_INDEXABLE=false', async () => {
    for (const path of ['/', '/api/health', '/robots.txt']) {
      expect((await get(path)).headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    }
  });
});
