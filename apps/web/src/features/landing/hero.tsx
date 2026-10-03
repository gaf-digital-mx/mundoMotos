import { useTranslations } from 'next-intl';

import logo from '@/assets/brand/generated/logo-512.webp';
import { business, siteConfig } from '@/shared/config/business';
import { directionsUrl } from '@/shared/lib/contact-links';
import { WhatsappButton } from '@/shared/ui/whatsapp-button';

export function Hero() {
  const t = useTranslations();

  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto grid max-w-(--container-page) items-center gap-36 px-4 pt-36 pb-60 md:grid-cols-[1.2fr_1fr] md:px-24 md:pt-60 md:pb-96"
    >
      <div className="flex flex-col gap-24">
        <p className="text-nav-label font-semibold tracking-label text-ignition-gold uppercase">
          {t('hero.eyebrow')}
        </p>
        {/* The headline is the LCP element: plain text, no animation. */}
        <h1 id="hero-title" className="text-heading-lg font-normal tracking-display">
          {t('hero.title')}
        </h1>
        <p className="max-w-[520px] text-silver-mist">{t('hero.body')}</p>
        <div className="flex flex-wrap items-center gap-24">
          <WhatsappButton
            number={siteConfig.whatsappNumber}
            message={t('hero.whatsappMessage')}
            label={t('hero.cta')}
            newTabHint={t('common.opensInNewTab')}
          />
          <a
            href={directionsUrl({ name: business.name, ...business.address })}
            target="_blank"
            rel="noopener noreferrer"
            className="text-nav-label font-semibold tracking-label text-bone-white uppercase underline-offset-4 hover:text-ignition-gold hover:underline"
          >
            {t('hero.directions')}
            <span className="sr-only"> {t('common.opensInNewTab')}</span>
          </a>
        </div>
      </div>
      {/* Placeholder visual until the interactive particle hero lands (Phase 1, PR 3). */}
      <img
        src={logo.src}
        alt=""
        width={logo.width}
        height={logo.height}
        className="mx-auto hidden w-full max-w-[440px] md:block"
      />
    </section>
  );
}
