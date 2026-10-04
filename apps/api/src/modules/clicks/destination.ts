import type { AppConfig } from '../../config';
import type { GoQuery, GoTarget } from '@mundomotos/contracts';

/**
 * Where a tracked click lands. The host always comes from the Worker's config: the query can
 * change the prefilled text or the place name, never the host, so this is not an open redirect.
 * Returns null when a destination can't be built (directions without a place).
 */
export const destinationFor = (
  target: GoTarget,
  query: GoQuery,
  config: Pick<AppConfig, 'whatsappNumber' | 'facebookUrl'>,
): string | null => {
  switch (target) {
    case 'whatsapp': {
      // encodeURIComponent (spaces as %20), as WhatsApp documents; URLSearchParams would emit `+`.
      // toWellFormed is defensive: encodeURIComponent throws on a lone surrogate.
      const base = `https://wa.me/${config.whatsappNumber}`;
      return query.text ? `${base}?text=${encodeURIComponent(query.text.toWellFormed())}` : base;
    }
    case 'directions': {
      if (!query.to) return null;
      const url = new URL('https://www.google.com/maps/dir/');
      url.searchParams.set('api', '1');
      url.searchParams.set('destination', query.to);
      return url.toString();
    }
    case 'facebook':
      return config.facebookUrl;
  }
};
