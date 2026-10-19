import { useTranslations } from 'next-intl';

import ctaMedium from '@/assets/backgrounds/generated/final-cta-1280.webp';
import ctaLarge from '@/assets/backgrounds/generated/final-cta-1887.webp';
import ctaSmall from '@/assets/backgrounds/generated/final-cta-768.webp';
import ctaPhoneSmall from '@/assets/backgrounds/generated/final-cta-mobile-480.webp';
import ctaPhoneMedium from '@/assets/backgrounds/generated/final-cta-mobile-768.webp';
import ctaPhoneLarge from '@/assets/backgrounds/generated/final-cta-mobile-940.webp';
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
  // The 3.8:1 photo covering a frame about half as wide-shaped is painted far past the window:
  // 189vw of it at 1280px, where `100vw` would have picked the 1280 file and enlarged it 1.9x.
  sizes: '190vw',
};

const phonePhoto = {
  src: ctaPhoneLarge.src,
  srcSet: `${ctaPhoneSmall.src} 480w, ${ctaPhoneMedium.src} 768w, ${ctaPhoneLarge.src} 940w`,
  width: ctaPhoneLarge.width,
  height: ctaPhoneLarge.height,
  // The portrait cut is shaped close to the frame it fills, so it barely overflows it.
  sizes: '110vw',
};

export function FinalCta() {
  const t = useTranslations();

  return (
    // The photo runs edge to edge while the copy keeps the page container, so this section is
    // wrapped rather than widened: a section that gave up its container would start its heading
    // at a different place from every other one on the page.
    <div className="relative isolate">
      <SectionBackground photo={photo} mobile={phonePhoto} />
      {/* Taller than its copy on a phone, with the copy held in the middle of it: the portrait
          photograph is a standing scene, and a section cut to the text would show the rider's
          wheels and nothing else. A wide screen takes its height from the copy as before. */}
      <section
        aria-labelledby="cta-title"
        className="mx-auto flex min-h-[620px] max-w-(--container-page) flex-col justify-center px-4 py-60 md:min-h-0 md:px-24 md:py-96"
      >
        <div className="flex flex-col items-start gap-24">
          {/* Entered piece by piece rather than as one block: the pill's dock slot is in here,
              and a slot that travels with an entrance makes the pill flicker — the dock measures
              the moving box and swaps copies while it settles. */}
          <h2
            data-enter
            id="cta-title"
            className="max-w-[800px] text-heading-sm font-normal tracking-display uppercase md:text-heading-lg"
          >
            {t('finalCta.title')}
          </h2>
          {/* White rather than the silver the other sections use, and 24px rather than 18px: a
              veil dark enough to carry 18px copy buries the picture it is protecting. 24px is
              large text, so the bar is 3:1 rather than 4.5:1.
              The drift slides the sunset under the copy, so the contrast behind a line is not one
              number but a range. Sampled at both ends of the travel, the worst pixel behind this
              line reads 4.12:1 on a desktop and 3.87:1 on a phone — clear, but by less than a
              point, and 18px here would fail outright.
              None of which the suite can tell you: axe returns "incomplete" for text over an
              image, and the assertion only fails on violations. These came from sampling the
              rendered pixels with the text hidden. */}
          <p data-enter className="max-w-[620px] text-heading-2xs text-bone-white">
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
