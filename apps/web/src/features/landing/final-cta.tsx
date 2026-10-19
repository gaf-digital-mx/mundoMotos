import { useTranslations } from 'next-intl';

import ctaMedium from '@/assets/backgrounds/generated/final-cta-1280.webp';
import ctaLarge from '@/assets/backgrounds/generated/final-cta-1887.webp';
import ctaSmall from '@/assets/backgrounds/generated/final-cta-768.webp';
import { siteConfig } from '@/shared/config/business';
import { PhoneButton } from '@/shared/ui/phone-button';
import { SectionBackground } from '@/shared/ui/section-background';
import { WhatsappButton } from '@/shared/ui/whatsapp-button';

import { DockedDirections } from './floating-directions';

const photo = {
  src: ctaLarge.src,
  srcSet: `${ctaSmall.src} 768w, ${ctaMedium.src} 1280w, ${ctaLarge.src} 1887w`,
  width: ctaLarge.width,
  height: ctaLarge.height,
};

export function FinalCta() {
  const t = useTranslations();

  return (
    // The photo runs edge to edge while the copy keeps the page container, so this section is
    // wrapped rather than widened: a section that gave up its container would start its heading
    // at a different place from every other one on the page.
    <div className="relative isolate">
      <SectionBackground photo={photo} />
      <section
        aria-labelledby="cta-title"
        className="mx-auto max-w-(--container-page) px-4 py-60 md:px-24 md:py-96"
      >
        <div className="flex flex-col items-start gap-24">
          {/* Entered piece by piece rather than as one block: the pill's dock slot is in here,
              and a slot that travels with an entrance makes the pill flicker — the dock measures
              the moving box and swaps copies while it settles. */}
          <h2
            data-enter
            id="cta-title"
            className="max-w-[900px] text-heading-sm font-normal tracking-display uppercase md:text-heading-lg"
          >
            {t('finalCta.title')}
          </h2>
          {/* Full white rather than the silver the other sections use: over a photograph, even
              veiled, silver has nothing left of its 4.57:1 to give away. */}
          <p data-enter className="max-w-[620px] text-bone-white">
            {t('finalCta.body')}
          </p>
          <div className="flex flex-wrap items-center gap-18">
            {/* The header is not sticky, so this section needs a CTA that works on a desktop too:
                touch widths dial, everyone else — including a zoomed, narrow desktop window —
                opens WhatsApp. Exactly one of the two is ever visible. */}
            <div data-enter className="flex flex-wrap items-center gap-18">
              <PhoneButton
                number={siteConfig.phoneNumber}
                source="final-cta"
                label={t('finalCta.cta')}
                callHint={t('common.callHint')}
                className="md:hidden pointer-fine:hidden"
              />
              <WhatsappButton
                source="final-cta"
                message={t('common.whatsappGreeting')}
                label={t('finalCta.whatsapp')}
                newTabHint={t('common.opensInNewTab')}
                className="max-md:hidden pointer-fine:inline-flex"
              />
            </div>
            {/* The floating "Cómo llegar" pill docks here while this section is on screen. */}
            <DockedDirections dock="final-cta" />
          </div>
        </div>
      </section>
    </div>
  );
}
