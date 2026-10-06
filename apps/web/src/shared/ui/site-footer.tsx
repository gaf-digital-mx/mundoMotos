import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { business, siteConfig } from '@/shared/config/business';
import { formatPhoneMx, telUrl } from '@/shared/lib/contact-links';
import { formatTime } from '@/shared/lib/hours';
import { facebookHref, TRACKED_REL, trackPath, whatsappHref } from '@/shared/lib/tracked-links';
import { FacebookIcon, PhoneIcon } from '@/shared/ui/icons';
import { WhatsappIcon } from '@/shared/ui/whatsapp-icon';

const linkClass = 'text-bone-white underline-offset-4 hover:text-ignition-gold hover:underline';
/** Icon-only links: 44px target, and the label lives in an sr-only span. */
const iconLinkClass =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-silver-mist transition-colors hover:text-ignition-gold';

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

        <section aria-labelledby="footer-visit" className="flex flex-col gap-6">
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

        {/* Icon-only row under the three columns, on every width. Each label is read out, so the
            glyphs don't have to carry the meaning on their own. */}
        <section aria-labelledby="footer-contact" className="flex gap-18 md:col-span-3">
          <h2 id="footer-contact" className="sr-only">
            {t('footer.contactTitle')}
          </h2>
          <a
            href={whatsappHref('footer', t('common.whatsappGreeting'))}
            target="_blank"
            rel={TRACKED_REL}
            className={iconLinkClass}
          >
            <WhatsappIcon className="size-24" />
            <span className="sr-only">
              {t('common.whatsappShort')}: {formatPhoneMx(siteConfig.whatsappNumber)} {newTab}
            </span>
          </a>
          {/* Direct tel: link (a redirect to tel: isn't reliable everywhere); ping reports the click. */}
          <a
            href={telUrl(siteConfig.phoneNumber)}
            ping={trackPath('phone', 'footer')}
            className={iconLinkClass}
          >
            <PhoneIcon className="size-24" />
            <span className="sr-only">
              {t('footer.callUs')}: {formatPhoneMx(siteConfig.phoneNumber)}
            </span>
          </a>
          <a
            href={facebookHref('footer')}
            target="_blank"
            rel={TRACKED_REL}
            className={iconLinkClass}
          >
            <FacebookIcon className="size-24" />
            <span className="sr-only">
              {t('footer.facebook')} {newTab}
            </span>
          </a>
        </section>
      </div>

      <div className="mx-auto flex max-w-(--container-page) flex-col gap-12 px-4 pb-96 text-caption text-ash-gray md:flex-row md:justify-between md:px-24">
        <p>{t('footer.copyright')}</p>
        <Link href="/aviso-de-privacidad" className={linkClass}>
          {t('footer.privacy')}
        </Link>
      </div>
    </footer>
  );
}
