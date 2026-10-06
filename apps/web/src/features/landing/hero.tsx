import { useTranslations } from 'next-intl';

import { HeroStage } from '@/features/hero/hero-stage';
import { DockedDirections } from '@/features/landing/floating-directions';
import { business, siteConfig } from '@/shared/config/business';
import { PhoneButton } from '@/shared/ui/phone-button';

import type { CSSProperties } from 'react';

export function Hero() {
  const t = useTranslations();

  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto max-w-(--container-page) px-4 pt-36 pb-60 md:px-24 md:pt-60 md:pb-96"
    >
      <HeroStage pauseLabel={t('hero.pauseAnimation')} playLabel={t('hero.playAnimation')}>
        {/* Above the canvas: floating particles pass behind the copy and CTAs, never over them. */}
        <div className="relative z-10 flex flex-col gap-24">
          {/* The wordmark is the LCP element: real text, painted before any script runs. */}
          <h1 id="hero-title" className="flex flex-col gap-12">
            {/* Never hidden and never moved: it types itself out in place while the particles
                fall, so a webfont arriving mid-animation can't shift it. */}
            <span
              data-wordmark
              style={{ '--type-steps': business.name.length } as CSSProperties}
              className="self-start pb-[0.08em] text-[clamp(40px,12vw,113px)] leading-none font-semibold tracking-display whitespace-nowrap md:text-[clamp(56px,7vw,113px)]"
            >
              <span className="text-flame">{business.name}</span>
            </span>{' '}
            <span
              data-reveal
              style={{ '--reveal-i': 1 } as CSSProperties}
              className="text-heading-2xs font-normal md:text-subheading"
            >
              {t('hero.tagline')}
            </span>
          </h1>
          <p
            data-reveal
            style={{ '--reveal-i': 2 } as CSSProperties}
            className="max-w-[520px] text-silver-mist"
          >
            {t('hero.body')}
          </p>
          <div
            data-reveal
            style={{ '--reveal-i': 3 } as CSSProperties}
            className="flex flex-wrap items-center gap-24"
          >
            {/* Touch widths only: a `tel:` link does nothing on a desktop — including a narrow
                or zoomed desktop window, hence `pointer-fine` — where the header's WhatsApp
                button is on screen anyway. */}
            <PhoneButton
              number={siteConfig.phoneNumber}
              source="hero"
              label={t('hero.cta')}
              callHint={t('common.callHint')}
              className="md:hidden pointer-fine:hidden"
            />
            {/* The floating "Cómo llegar" pill docks here while the hero is on screen. */}
            <DockedDirections dock="hero" />
          </div>
        </div>
      </HeroStage>
    </section>
  );
}
