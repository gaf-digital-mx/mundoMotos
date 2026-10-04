import { useTranslations } from 'next-intl';

import { FEATURED_ITEMS } from '@/content/featured';
import { TRACKED_REL, whatsappHref } from '@/shared/lib/tracked-links';
import { CategoryIcon } from '@/shared/ui/icons';
import { SectionHeading } from '@/shared/ui/section-heading';

import { Marquee } from './marquee';

/** Featured products in an auto-scrolling strip with a visible pause control (see Marquee). */
export function FeaturedCarousel() {
  const t = useTranslations();
  const newTab = t('common.opensInNewTab');

  const items = FEATURED_ITEMS.map(({ category, item }) => {
    const name = t(`featured.items.${item}`);
    return (
      <li key={`${category}-${item}`} className="w-[220px] shrink-0">
        <a
          href={whatsappHref('featured', t('featured.askMessage', { item: name }))}
          target="_blank"
          rel={TRACKED_REL}
          className="group/item flex h-full flex-col gap-18 rounded-3xl p-18 transition-colors hover:bg-bone-white/5"
        >
          <span className="flex aspect-square items-center justify-center rounded-3xl bg-bone-white/5 text-flame-orange transition-colors group-hover/item:text-ignition-gold">
            <CategoryIcon category={category} className="size-[72px]" />
          </span>
          <span className="text-caption tracking-label text-ash-gray uppercase">
            {t(`featured.categories.${category}`)}
          </span>
          <span className="text-body font-normal">{name}</span>
          <span className="text-caption font-semibold tracking-label text-ignition-gold uppercase">
            {t('featured.ask')}
            <span className="sr-only"> {newTab}</span>
          </span>
        </a>
      </li>
    );
  });

  return (
    <section
      id="refacciones"
      aria-labelledby="featured-title"
      className="scroll-mt-24 py-60 md:py-96"
    >
      <div className="mx-auto max-w-(--container-page) px-4 md:px-24">
        <SectionHeading
          id="featured-title"
          eyebrow={t('featured.eyebrow')}
          title={t('featured.title')}
          body={t('featured.body')}
        />
      </div>
      <div className="mt-36">
        <Marquee pauseLabel={t('featured.pauseLabel')} playLabel={t('featured.playLabel')}>
          <ul className="flex gap-18">{items}</ul>
        </Marquee>
      </div>
    </section>
  );
}
