import {
  isLocaleAgnostic,
  resolveLocale,
  stripLocalePrefix,
  toInternalPath,
} from './locale-routing';

import type { AppEnv } from '../shared/http/types';
import type { Context } from 'hono';

/**
 * Serves the static site from the ASSETS binding, choosing the locale tree from the `lang`
 * cookie. The browser URL never contains a locale (ADR-0008).
 */
export const serveSite = async (c: Context<AppEnv>): Promise<Response> => {
  const url = new URL(c.req.url);

  const clean = stripLocalePrefix(url.pathname);
  if (clean !== null) {
    return c.redirect(`${clean}${url.search}`, 301);
  }

  if (isLocaleAgnostic(url.pathname)) {
    // Re-wrap: asset responses have immutable headers, and middleware still needs to add some.
    const asset = await c.env.ASSETS.fetch(c.req.raw);
    return new Response(asset.body, asset);
  }

  const locale = resolveLocale(c.req.header('cookie'));
  const internalUrl = new URL(url);
  internalUrl.pathname = toInternalPath(url.pathname, locale);

  const asset = await c.env.ASSETS.fetch(new Request(internalUrl, c.req.raw));
  const response = new Response(asset.body, asset);

  // Asset trailing-slash redirects point at the internal tree; never leak the prefix.
  const location = response.headers.get('Location');
  if (location) {
    const target = new URL(location, url);
    const cleanTarget = stripLocalePrefix(target.pathname);
    if (cleanTarget !== null) {
      response.headers.set('Location', `${cleanTarget}${target.search}`);
    }
  }

  response.headers.set('Content-Language', locale);
  response.headers.append('Vary', 'Cookie');
  // Same URL, different language: browsers must revalidate (ETag) instead of reusing the cache.
  response.headers.set('Cache-Control', 'no-cache');
  return response;
};
