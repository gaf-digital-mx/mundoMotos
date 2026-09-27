import {
  DEFAULT_LOCALE,
  isEnabledLocale,
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  type Locale,
} from '@mundomotos/contracts';

/**
 * Pure rules for serving locale-specific static trees without a locale in the URL (ADR-0008).
 * The build emits `out/<locale>/**`; visitors only ever see unprefixed paths.
 */

// `/api/` never reaches the site handler (the API router is mounted first); listed as defense in depth.
const LOCALE_AGNOSTIC_PREFIXES = ['/_next/static/', '/brand/', '/api/'];
const LOCALE_AGNOSTIC_FILES = new Set([
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.ico',
  '/icon.png',
  '/apple-icon.png',
  '/manifest.webmanifest',
  '/404.html',
]);

const LOCALE_PREFIX = new RegExp(`^/(${SUPPORTED_LOCALES.join('|')})(?=/|$)`);

/** Files identical for every locale: served as-is, never rewritten. */
export const isLocaleAgnostic = (pathname: string): boolean =>
  LOCALE_AGNOSTIC_FILES.has(pathname) ||
  LOCALE_AGNOSTIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

/** Explicit choice from the `lang` cookie; anything else (first visit, crawlers) gets Spanish. */
export const resolveLocale = (cookieHeader: string | undefined): Locale => {
  const value = cookieHeader
    ?.split(';')
    .map((pair) => pair.trim().split('='))
    .find(([name]) => name === LOCALE_COOKIE)?.[1];
  return isEnabledLocale(value) ? value : DEFAULT_LOCALE;
};

/** Maps a public path to its file in the locale tree: `/` → `/es`, `/catalogo` → `/es/catalogo`. */
export const toInternalPath = (pathname: string, locale: Locale): string =>
  pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;

/**
 * If the path carries a locale prefix, returns the clean public path (`/es/x` → `/x`,
 * `/en` → `/`); otherwise `null`. Used to 301 prefixed URLs and to sanitize asset redirects.
 *
 * Security: leading slashes are collapsed so the result is always a same-origin path.
 * Without this, `/es//evil.com` would become `//evil.com`, a protocol-relative open redirect.
 */
export const stripLocalePrefix = (pathname: string): string | null => {
  if (!LOCALE_PREFIX.test(pathname)) return null;
  const rest = pathname.replace(LOCALE_PREFIX, '').replace(/^\/+/, '/');
  return rest === '' ? '/' : rest;
};
