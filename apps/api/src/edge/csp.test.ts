import { describe, expect, it } from 'vitest';

import { buildCsp, manifestKey } from './csp';

describe('buildCsp', () => {
  it('allows same-origin scripts plus the page hashes, and nothing inline otherwise', () => {
    const policy = buildCsp(['sha256-abc=', 'sha256-def=']);
    expect(policy).toContain("script-src 'self' 'sha256-abc=' 'sha256-def='");
    expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain('frame-src https://www.google.com');
    expect(policy).toContain('report-uri /api/csp-report');
    expect(policy).toContain('report-to csp');
  });

  it('still yields a valid policy without hashes', () => {
    expect(buildCsp([])).toContain("script-src 'self';");
  });
});

describe('manifestKey', () => {
  it.each([
    ['/es', 200, '/es'],
    ['/es/', 200, '/es'],
    ['/es/aviso-de-privacidad/', 200, '/es/aviso-de-privacidad'],
    ['/es/nope', 404, '/404'],
  ])('maps %s (%i) to %s', (path, status, key) => {
    expect(manifestKey(path, status)).toBe(key);
  });
});
