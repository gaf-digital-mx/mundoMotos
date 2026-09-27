import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE, ENABLED_LOCALES, isEnabledLocale } from './i18n';

describe('i18n contract', () => {
  it('always enables the default locale', () => {
    expect(ENABLED_LOCALES).toContain(DEFAULT_LOCALE);
  });

  it('accepts only enabled locales', () => {
    expect(isEnabledLocale('es')).toBe(true);
    expect(isEnabledLocale('fr')).toBe(false);
    expect(isEnabledLocale(undefined)).toBe(false);
  });
});
