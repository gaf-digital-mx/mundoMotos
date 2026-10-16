import { useTranslations } from 'next-intl';

import { FEATURED } from '@/content/featured';
import { TRACKED_REL, whatsappHref } from '@/shared/lib/tracked-links';
import { SectionHeading } from '@/shared/ui/section-heading';

/**
 * What the shop stocks, as one photo card per category with its items as chips. Each chip opens
 * WhatsApp asking for that part, so the 18 tracked messages survive the move from the old strip.
 * The scrim under the copy is what keeps it legible over the photo — see the service cards.
 */
export function FeaturedCategories() {
  const t = useTranslations();
  const newTab = t('common.opensInNewTab');
  const ask = t('featured.ask');

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
      <ul className="mt-60 grid gap-18 md:grid-cols-2 md:gap-36">
        {FEATURED.map(({ category, photo, items }, index) => (
          // The first card spans both columns: lighting carries six items, and a wide card gives
          // its chips a single row to sit in.
          <li key={category} data-enter className={`grid ${index === 0 ? 'md:col-span-2' : ''}`}>
            <article className="relative isolate flex min-h-[260px] flex-col justify-end overflow-hidden rounded-3xl border border-bone-white/10">
              <img
                data-depth
                src={photo.large.src}
                srcSet={`${photo.small.src} 480w, ${photo.large.src} 960w`}
                sizes={
                  index === 0
                    ? '(min-width: 768px) 1232px, calc(100vw - 2rem)'
                    : '(min-width: 768px) 600px, calc(100vw - 2rem)'
                }
                alt=""
                width={photo.large.width}
                height={photo.large.height}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 -z-20 size-full object-cover"
              />
              {/* The scrim fades across the whole card, not just behind the copy: a gradient that
                  starts at the text block draws a visible seam across the photo. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-linear-to-t from-void/90 from-20% via-void/65 via-55% to-void/15"
              />
              <div className="flex flex-col gap-18 p-18 pt-60">
                <h3 className="text-nav-label font-semibold tracking-label text-ignition-gold uppercase">
                  {t(`featured.categories.${category}`)}
                </h3>
                <ul className="flex flex-wrap gap-12">
                  {items.map((item) => {
                    const name = t(`featured.items.${item}`);
                    // A lone item named after its own category would print the heading twice;
                    // that card's chip carries the call to action instead.
                    const alone =
                      items.length === 1 && name === t(`featured.categories.${category}`);
                    return (
                      <li key={item}>
                        <a
                          href={whatsappHref('featured', t('featured.askMessage', { item: name }))}
                          target="_blank"
                          rel={TRACKED_REL}
                          className="inline-flex min-h-8 items-center rounded-3xl border border-bone-white/30 px-12 py-6 text-caption hover:border-ignition-gold hover:text-ignition-gold"
                        >
                          {alone ? ask : name}
                          <span className="sr-only">
                            {' '}
                            {alone ? name : ask} {newTab}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
