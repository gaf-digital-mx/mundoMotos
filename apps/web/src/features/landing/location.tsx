import { useTranslations } from 'next-intl';

import fachada1280 from '@/assets/brand/generated/fachada-1280.webp';
import fachada640 from '@/assets/brand/generated/fachada-640.webp';
import { business } from '@/shared/config/business';
import { formatTime } from '@/shared/lib/hours';
import { SectionHeading } from '@/shared/ui/section-heading';

import { DockedDirections } from './floating-directions';

export function Location() {
  const t = useTranslations();
  const { address } = business;
  // By place id, so the map and its links open the business listing. www.google.com (not
  // maps.google.com): the embed redirects within frame-src, no extra CSP host.
  const embedSrc = `https://www.google.com/maps?cid=${business.mapsCid}&hl=es&output=embed`;

  return (
    <section
      id="ubicacion"
      aria-labelledby="location-title"
      className="mx-auto grid max-w-(--container-page) scroll-mt-24 gap-36 px-4 py-60 md:grid-cols-2 md:px-24 md:py-96"
    >
      <div className="flex flex-col gap-30">
        <SectionHeading
          id="location-title"
          eyebrow={t('location.eyebrow')}
          title={t('location.title')}
        />
        <address className="text-heading-2xs font-normal not-italic">
          {address.street}
          <br />
          {address.postalCode} {address.locality}, {address.region}
        </address>
        <dl className="grid grid-cols-[auto_1fr] gap-x-18 gap-y-6 text-silver-mist">
          {business.openingHours.map(({ id, opens, closes }) => (
            <div key={id} className="contents">
              <dt>{t(`footer.hours.${id}`)}</dt>
              <dd>
                {formatTime(opens)} – {formatTime(closes)}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-12">
          <h3 className="text-nav-label font-semibold tracking-label text-ignition-gold uppercase">
            {t('location.areaTitle')}
          </h3>
          <ul className="flex flex-wrap gap-6">
            {business.serviceArea.map((town) => (
              <li
                key={town}
                className="rounded-full border px-12 py-6 text-caption text-silver-mist"
              >
                {town}
              </li>
            ))}
          </ul>
        </div>
        {/* The floating "Cómo llegar" pill docks here while this section is on screen. */}
        <DockedDirections dock="location" className="self-start" />
      </div>
      <div className="flex flex-col gap-18">
        <img
          src={fachada1280.src}
          srcSet={`${fachada640.src} 640w, ${fachada1280.src} 1280w`}
          sizes="(min-width: 768px) 50vw, 100vw"
          width={fachada1280.width}
          height={fachada1280.height}
          alt={t('location.photoAlt')}
          loading="lazy"
          decoding="async"
          className="w-full rounded-3xl"
        />
        {/* Server-rendered and lazy: the browser fetches Google Maps only when the section nears the
            viewport, so it never weighs on the initial load (the privacy notice discloses it). */}
        <iframe
          src={embedSrc}
          title={t('location.mapTitle')}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          className="aspect-video w-full rounded-3xl border-0 bg-bone-white/5"
        />
      </div>
    </section>
  );
}
