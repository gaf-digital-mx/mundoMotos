/**
 * Locale configuration shared by the web build (which trees to generate) and the Worker
 * (which tree to serve). Locales never appear in public URLs; see the locale rewrite in `apps/api`.
 */
export const SUPPORTED_LOCALES = ['es', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Locales currently published. English is added in Phase 4, if the no-prefix spike passes. */
export const ENABLED_LOCALES: readonly Locale[] = ['es'];

export const DEFAULT_LOCALE: Locale = 'es';

/** Cookie holding the visitor's explicit language choice. */
export const LOCALE_COOKIE = 'lang';

export const isEnabledLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (ENABLED_LOCALES as readonly string[]).includes(value);
