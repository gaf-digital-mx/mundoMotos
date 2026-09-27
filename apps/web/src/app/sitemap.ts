import { siteConfig } from '@/shared/config/business';

import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

/** Public, unprefixed URLs only. Crawlers always get Spanish (ADR-0008). */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${siteConfig.siteUrl}/`, changeFrequency: 'weekly', priority: 1 }];
}
