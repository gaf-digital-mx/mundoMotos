import { siteConfig } from '@/shared/config/business';

import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

/** Disallow everything until launch (SITE_INDEXABLE=false on workers.dev hosts, ADR-0016). */
export default function robots(): MetadataRoute.Robots {
  if (!siteConfig.indexable) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`,
  };
}
