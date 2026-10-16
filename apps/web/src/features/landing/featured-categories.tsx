import { useTranslations } from 'next-intl';

import { FEATURED } from '@/content/featured';
import { TRACKED_REL, whatsappHref } from '@/shared/lib/tracked-links';
import { SectionHeading } from '@/shared/ui/section-heading';

import { FeaturedCarousel } from './featured-carousel';

/**
 * What the shop stocks, as one photo card per category with its items as chips. Each chip opens
 * WhatsApp asking for that part, so the 18 tracked messages survive the move from the old strip.
 * Every string the carousel shows is translated here: the island receives finished copy.
 */
export function FeaturedCategories() {
  const t = useTranslations();
  const newTab = t('common.opensInNewTab');
  const ask = t('featured.ask');

  const categories = FEATURED.map(({ category, photo, items }) => {
    const name = t(`featured.categories.${category}`);
    return {
      id: category,
      name,
      showLabel: t('featured.show', { category: name }),
      photo: {
        src: photo.large.src,
        srcSet: `${photo.small.src} 480w, ${photo.large.src} 960w`,
        width: photo.large.width,
        height: photo.large.height,
      },
      items: items.map((item) => {
        const itemName = t(`featured.items.${item}`);
        // A lone item named after its own category would print the heading twice; that card's
        // chip carries the call to action instead.
        const alone = items.length === 1 && itemName === name;
        return {
          id: item,
          text: alone ? ask : itemName,
          hint: `${alone ? itemName : ask} ${newTab}`,
          href: whatsappHref('featured', t('featured.askMessage', { item: itemName })),
        };
      }),
    };
  });

  return (
    <section
      id="refacciones"
      aria-labelledby="featured-title"
      className="mx-auto max-w-(--container-page) scroll-mt-24 px-4 py-60 md:px-24 md:py-96"
    >
      <SectionHeading
        id="featured-title"
        eyebrow={t('featured.eyebrow')}
        title={t('featured.title')}
        body={t('featured.body')}
      />
      <FeaturedCarousel
        categories={categories}
        rel={TRACKED_REL}
        labels={{
          previous: t('featured.previous'),
          next: t('featured.next'),
          pause: t('featured.pause'),
          play: t('featured.play'),
        }}
      />
    </section>
  );
}
