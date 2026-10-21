import { getTranslations } from 'next-intl/server';

import fachada from '@/assets/brand/generated/fachada-1280.webp';
import logo from '@/assets/brand/generated/logo-512.webp';
import { SERVICES, TUNE_UP_WORKS } from '@/content/services';
import { business, siteConfig } from '@/shared/config/business';
import { localBusinessJsonLd, serializeJsonLd } from '@/shared/lib/structured-data';

/** schema.org LocalBusiness data for search engines (local SEO). */
export async function BusinessJsonLd() {
  const t = await getTranslations('metadata');
  const copy = await getTranslations();
  // Only the services that list their jobs; the keys are typed, so each one is written out.
  const works: Record<string, string[]> = {
    tuneUp: TUNE_UP_WORKS.map((work) => copy(`services.items.tuneUp.detail.items.${work.id}`)),
  };
  const data = localBusinessJsonLd({
    ...business,
    siteUrl: siteConfig.siteUrl,
    description: t('businessDescription'),
    phoneNumber: siteConfig.phoneNumber,
    facebookUrl: siteConfig.facebookUrl,
    logoUrl: `${siteConfig.siteUrl}${logo.src}`,
    imageUrl: `${siteConfig.siteUrl}${fachada.src}`,
    services: SERVICES.map(({ id }) => ({
      name: copy(`services.items.${id}.name`),
      description: copy(`services.items.${id}.body`),
      works: works[id] ?? [],
    })),
  });

  return (
    <script
      type="application/ld+json"
      // JSON-LD must be inline; serializeJsonLd escapes `<` so the content can't break out.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
