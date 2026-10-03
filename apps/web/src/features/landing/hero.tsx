import { useTranslations } from 'next-intl';

import { HeroStage } from '@/features/hero/hero-stage';
import { business, siteConfig } from '@/shared/config/business';
import { directionsUrl } from '@/shared/lib/contact-links';
import { WhatsappButton } from '@/shared/ui/whatsapp-button';

export function Hero() {
  const t = useTranslations();

  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto max-w-(--container-page) px-4 pt-36 pb-60 md:px-24 md:pt-60 md:pb-96"
    >
      <HeroStage>
        <div className="flex flex-col gap-24">
          {/* The wordmark is the LCP element: real text, painted before any script runs. */}
          <h1 id="hero-title" className="flex flex-col gap-12">
            <span
              data-wordmark
              data-state="shown"
              className="self-start bg-linear-to-r from-flame-red via-flame-orange to-ignition-gold bg-clip-text pb-[0.08em] text-[clamp(40px,12vw,113px)] leading-none font-semibold tracking-display whitespace-nowrap text-transparent transition-opacity duration-300 data-[state=hidden]:opacity-0 data-[state=typing]:animate-type"
            >
              {business.name}
            </span>
            <span className="text-heading-2xs font-normal md:text-subheading">
              {t('hero.tagline')}
            </span>
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
      </HeroStage>
    </section>
  );
}
