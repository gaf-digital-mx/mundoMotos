import { useTranslations } from 'next-intl';

import { FEATURED_ITEMS } from '@/content/featured';
import { siteConfig } from '@/shared/config/business';
import { whatsappUrl } from '@/shared/lib/contact-links';
import { CategoryIcon } from '@/shared/ui/icons';
import { SectionHeading } from '@/shared/ui/section-heading';

/**
 * Infinite CSS marquee (no JS): the list is rendered twice and translated by -50%. The copy is
 * hidden from assistive tech and inert. It pauses on hover/focus; with reduced motion it becomes
 * a horizontally scrollable list without the duplicate.
 */
export function FeaturedCarousel() {
  const t = useTranslations();
  const newTab = t('common.opensInNewTab');

  const renderItems = (duplicate: boolean) =>
    FEATURED_ITEMS.map(({ category, item }) => {
      const name = t(`featured.items.${item}`);
      return (
        <li key={`${category}-${item}`} className="w-[220px] shrink-0">
          <a
            href={whatsappUrl(siteConfig.whatsappNumber, t('featured.askMessage', { item: name }))}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={duplicate ? -1 : undefined}
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
        <p className="sr-only">{t('featured.pause')}</p>
      </div>
      <div className="group mt-60 overflow-hidden motion-reduce:overflow-x-auto">
        {/* Each list carries its own trailing gap so translateX(-50%) loops seamlessly. */}
        <div className="flex w-max animate-marquee group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          <ul className="flex gap-18 pr-18">{renderItems(false)}</ul>
          <ul className="flex gap-18 pr-18 motion-reduce:hidden" aria-hidden="true" inert>
            {renderItems(true)}
          </ul>
        </div>
      </div>
    </section>
  );
}
