import { describe, expect, it } from 'vitest';

import {
  isLocaleAgnostic,
  resolveLocale,
  stripLocalePrefix,
  toInternalPath,
} from './locale-routing';

describe('resolveLocale', () => {
  it('defaults to Spanish without a cookie (first visit, crawlers)', () => {
    expect(resolveLocale(undefined)).toBe('es');
    expect(resolveLocale('')).toBe('es');
  });

  it('honors an enabled locale from the lang cookie among others', () => {
    expect(resolveLocale('theme=dark; lang=es; x=1')).toBe('es');
  });

  it('ignores locales that are not enabled yet or unknown', () => {
    expect(resolveLocale('lang=en')).toBe('es');
    expect(resolveLocale('lang=fr')).toBe('es');
  });

  it('does not match cookies whose name merely contains "lang"', () => {
    expect(resolveLocale('slang=en')).toBe('es');
  });
});

describe('toInternalPath', () => {
  it.each([
    ['/', '/es'],
    ['/catalogo', '/es/catalogo'],
    ['/catalogo/cascos.txt', '/es/catalogo/cascos.txt'],
  ])('maps %s to %s', (path, internal) => {
    expect(toInternalPath(path, 'es')).toBe(internal);
  });
});

describe('stripLocalePrefix', () => {
  it.each([
    ['/es', '/'],
    ['/es/', '/'],
    ['/en/catalogo', '/catalogo'],
    ['/es/catalogo/', '/catalogo/'],
  ])('strips %s to %s', (path, clean) => {
    expect(stripLocalePrefix(path)).toBe(clean);
  });

  it.each([
    ['/es//evil.com', '/evil.com'],
    ['/en///evil.com/phish', '/evil.com/phish'],
  ])('never returns a protocol-relative path: %s → %s', (path, clean) => {
    expect(stripLocalePrefix(path)).toBe(clean);
  });

  it.each(['/', '/catalogo', '/estilos', '/english', '/eses/x'])(
    'leaves unprefixed path %s alone',
    (path) => {
      expect(stripLocalePrefix(path)).toBeNull();
    },
  );
});

describe('isLocaleAgnostic', () => {
  it.each(['/_next/static/chunks/app.js', '/brand/logo.png', '/robots.txt', '/api/health'])(
    'serves %s without rewriting',
    (path) => {
      expect(isLocaleAgnostic(path)).toBe(true);
    },
  );

  it.each(['/', '/catalogo', '/index.txt'])('rewrites %s', (path) => {
    expect(isLocaleAgnostic(path)).toBe(false);
  });
});
