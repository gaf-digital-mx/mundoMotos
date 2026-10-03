import { getTranslations } from 'next-intl/server';

import fachada from '@/assets/brand/generated/fachada-1280.webp';
import logo from '@/assets/brand/generated/logo-512.webp';
import { business, siteConfig } from '@/shared/config/business';
import { localBusinessJsonLd, serializeJsonLd } from '@/shared/lib/structured-data';

/** schema.org LocalBusiness data for search engines (local SEO). */
export async function BusinessJsonLd() {
  const t = await getTranslations('metadata');
  const data = localBusinessJsonLd({
    ...business,
    siteUrl: siteConfig.siteUrl,
    description: t('businessDescription'),
    phoneNumber: siteConfig.phoneNumber,
    facebookUrl: siteConfig.facebookUrl,
    logoUrl: `${siteConfig.siteUrl}${logo.src}`,
    imageUrl: `${siteConfig.siteUrl}${fachada.src}`,
  });

  return (
    <script
      type="application/ld+json"
      // JSON-LD must be inline; serializeJsonLd escapes `<` so the content can't break out.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
