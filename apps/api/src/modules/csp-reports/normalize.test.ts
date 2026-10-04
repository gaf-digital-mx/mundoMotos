import { describe, expect, it } from 'vitest';

import { makeDeduper, normalizeReports, stripUrl } from './normalize';

describe('normalizeReports', () => {
  it('reads legacy report-uri bodies and drops query strings', () => {
    expect(
      normalizeReports({
        'csp-report': {
          'document-uri': 'https://mundomotos.test/?utm_source=x',
          'violated-directive': 'script-src-elem',
          'blocked-uri': 'https://evil.test/a.js?token=secret',
          'line-number': 3,
          disposition: 'report',
        },
      }),
    ).toEqual([
      {
        directive: 'script-src-elem',
        blocked: 'https://evil.test/a.js',
        document: '/',
        line: 3,
        disposition: 'report',
      },
    ]);
  });

  it('reads Reporting API batches, keeping only CSP violations', () => {
    const violations = normalizeReports([
      { type: 'deprecation', body: {} },
      {
        type: 'csp-violation',
        body: {
          documentURL: 'https://mundomotos.test/aviso-de-privacidad',
          effectiveDirective: 'script-src-elem',
          blockedURL: 'inline',
          sourceFile: 'https://mundomotos.test/_next/static/chunks/a.js',
          disposition: 'report',
        },
      },
    ]);
    expect(violations).toEqual([
      {
        directive: 'script-src-elem',
        blocked: 'inline',
        document: '/aviso-de-privacidad',
        source: 'https://mundomotos.test/_next/static/chunks/a.js',
        disposition: 'report',
      },
    ]);
  });

  it('accepts real Chromium payloads with null fields and extra keys', () => {
    const violations = normalizeReports([
      {
        type: 'csp-violation',
        age: 2,
        url: 'https://mundomotos.test/',
        user_agent: 'Mozilla/5.0',
        body: {
          blockedURL: 'inline',
          columnNumber: null,
          disposition: 'report',
          documentURL: 'https://mundomotos.test/',
          effectiveDirective: 'script-src-elem',
          lineNumber: null,
          originalPolicy: "default-src 'self'",
          referrer: '',
          sample: '',
          sourceFile: null,
          statusCode: 200,
        },
      },
      { type: 'csp-violation', body: 'malformed' },
    ]);
    expect(violations).toEqual([
      { directive: 'script-src-elem', blocked: 'inline', document: '/', disposition: 'report' },
    ]);
  });

  it('drops browser-extension noise', () => {
    expect(
      normalizeReports([
        {
          type: 'csp-violation',
          body: { blockedURL: 'chrome-extension://abc/inject.js', documentURL: 'https://x.test/' },
        },
        {
          type: 'csp-violation',
          body: { blockedURL: 'inline', sourceFile: 'moz-extension://abc/content.js' },
        },
      ]),
    ).toEqual([]);
  });

  it('ignores unknown payloads', () => {
    expect(normalizeReports({ hello: 'world' })).toEqual([]);
    expect(normalizeReports('nope')).toEqual([]);
  });
});

describe('stripUrl', () => {
  it('keeps keywords, reduces other schemes to their name and caps lengths', () => {
    expect(stripUrl('eval')).toBe('eval');
    expect(stripUrl(undefined)).toBe('unknown');
    expect(stripUrl(null)).toBe('unknown');
    expect(stripUrl('data:text/html,<script>alert(1)</script>')).toBe('data');
    expect(stripUrl('x'.repeat(200))).toHaveLength(32);
    expect(stripUrl(`https://a.test/${'p'.repeat(500)}`)).toHaveLength(256);
  });
});

describe('makeDeduper', () => {
  it('lets a key through once per TTL and bounds memory', () => {
    let now = 0;
    const firstSeen = makeDeduper(1000, 2, () => now);
    expect(firstSeen('a')).toBe(true);
    expect(firstSeen('a')).toBe(false);
    now = 1000;
    expect(firstSeen('a')).toBe(true);
    expect(firstSeen('b')).toBe(true);
    expect(firstSeen('c')).toBe(true); // map full: cleared, never grows past maxKeys
    expect(firstSeen('a')).toBe(true);
  });
});
