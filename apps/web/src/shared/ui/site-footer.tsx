import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { business, siteConfig } from '@/shared/config/business';
import { formatPhoneMx, telUrl, whatsappUrl } from '@/shared/lib/contact-links';
import { formatTime } from '@/shared/lib/hours';

const linkClass = 'text-bone-white underline-offset-4 hover:text-ignition-gold hover:underline';

export function SiteFooter() {
  const t = useTranslations();
  const { address } = business;
  const newTab = t('common.opensInNewTab');

  return (
    <footer className="mt-120 border-t border-ash-gray/20">
      <div className="mx-auto grid max-w-(--container-page) gap-36 px-4 py-60 md:grid-cols-3 md:px-24">
        <div className="flex flex-col gap-12">
          <p className="text-heading-2xs font-semibold text-ignition-gold">{business.name}</p>
          <p className="max-w-[360px] text-silver-mist">{t('footer.about')}</p>
        </div>

        <div className="flex flex-col gap-18">
          <section aria-labelledby="footer-visit">
            <h2
              id="footer-visit"
              className="mb-6 text-nav-label font-semibold tracking-label text-ignition-gold uppercase"
            >
              {t('footer.visitTitle')}
            </h2>
            <address className="text-silver-mist not-italic">
              {address.street}
              <br />
              {address.postalCode} {address.locality}, {address.region}
            </address>
            <a
              href={business.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {t('footer.viewOnMaps')}
              <span className="sr-only"> {newTab}</span>
            </a>
          </section>
          <section aria-labelledby="footer-hours">
            <h2
              id="footer-hours"
              className="mb-6 text-nav-label font-semibold tracking-label text-ignition-gold uppercase"
            >
              {t('footer.hoursTitle')}
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-12 text-silver-mist">
              {business.openingHours.map(({ id, opens, closes }) => (
                <div key={id} className="contents">
                  <dt>{t(`footer.hours.${id}`)}</dt>
                  <dd>
                    {formatTime(opens)} – {formatTime(closes)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <section aria-labelledby="footer-contact" className="flex flex-col gap-6">
          <h2
            id="footer-contact"
            className="mb-6 text-nav-label font-semibold tracking-label text-ignition-gold uppercase"
          >
            {t('footer.contactTitle')}
          </h2>
          <a
            href={whatsappUrl(siteConfig.whatsappNumber, t('common.whatsappGreeting'))}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {t('common.whatsappShort')}: {formatPhoneMx(siteConfig.whatsappNumber)}
            <span className="sr-only"> {newTab}</span>
          </a>
          <a href={telUrl(siteConfig.phoneNumber)} className={linkClass}>
            {t('footer.callUs')}: {formatPhoneMx(siteConfig.phoneNumber)}
          </a>
          <a
            href={siteConfig.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {t('footer.facebook')}
            <span className="sr-only"> {newTab}</span>
          </a>
        </section>
      </div>

      <div className="mx-auto flex max-w-(--container-page) flex-col gap-12 px-4 pb-36 text-caption text-ash-gray md:flex-row md:justify-between md:px-24">
        <p>{t('footer.copyright')}</p>
        <Link href="/aviso-de-privacidad" className={linkClass}>
          {t('footer.privacy')}
        </Link>
      </div>
    </footer>
  );
}
