import { useTranslations } from 'next-intl';

import contactMedium from '@/assets/backgrounds/generated/contact-1280.webp';
import contactLarge from '@/assets/backgrounds/generated/contact-1920.webp';
import contactSmall from '@/assets/backgrounds/generated/contact-768.webp';
import contactPhoneSmall from '@/assets/backgrounds/generated/contact-mobile-480.webp';
import contactPhoneLarge from '@/assets/backgrounds/generated/contact-mobile-758.webp';
import { siteConfig } from '@/shared/config/business';
import { trackPath } from '@/shared/lib/tracked-links';
import { SectionBackground } from '@/shared/ui/section-background';
import { SectionHeading } from '@/shared/ui/section-heading';

import { ContactForm } from './contact-form';

const photo = {
  src: contactLarge.src,
  srcSet: `${contactSmall.src} 768w, ${contactMedium.src} 1280w, ${contactLarge.src} 1920w`,
  width: contactLarge.width,
  height: contactLarge.height,
  // Shaped close to the frame it fills, so `cover` barely overflows it sideways — unlike the
  // closing section's 3.8:1 banner, this one is cropped top and bottom instead.
  sizes: '120vw',
};

const phonePhoto = {
  src: contactPhoneLarge.src,
  srcSet: `${contactPhoneSmall.src} 480w, ${contactPhoneLarge.src} 758w`,
  width: contactPhoneLarge.width,
  height: contactPhoneLarge.height,
  sizes: '140vw',
};

export function ContactSection() {
  const t = useTranslations();

  return (
    // Full width for the photograph, the page container for the copy. `--drift-end` goes back to
    // the whole range: this section scrolls clear of the viewport, so unlike the closing one it
    // would otherwise finish its travel early and sit frozen for the rest of its exit.
    // The veil is heavier than the closing section's: the workshop is lit from the left, right
    // under the heading, where the default set left the title at 2.78:1 against its 3:1 bar.
    <div className="relative isolate [--drift-end:100%] [--drift-reach:18%] [--drift-travel:12%] [--section-body:var(--color-bone-white)] [--veil-far-md:34%] [--veil-far:16%] [--veil-mid-md:64%] [--veil-mid:40%] [--veil-near-md:80%] [--veil-near:52%]">
      <SectionBackground photo={photo} mobile={phonePhoto} />
      <section
        id="contacto"
        aria-labelledby="contact-title"
        className="mx-auto grid max-w-(--container-page) scroll-mt-24 gap-36 px-4 py-60 md:grid-cols-2 md:px-24 md:py-96"
      >
        <SectionHeading
          id="contact-title"
          eyebrow={t('contact.eyebrow')}
          title={t('contact.title')}
          body={t('contact.body')}
        />
        <ContactForm
          whatsappNumber={siteConfig.whatsappNumber}
          trackUrl={trackPath('whatsapp', 'contact-form')}
          // Keeps the placeholders so the client island fills them with what the visitor types.
          messageTemplate={t('contact.messageTemplate', { name: '{name}', query: '{query}' })}
          labels={{
            name: t('contact.nameLabel'),
            query: t('contact.queryLabel'),
            queryPlaceholder: t('contact.queryPlaceholder'),
            submit: t('contact.submit'),
            sent: t('contact.sent'),
            newTabHint: t('common.opensInNewTab'),
            errors: {
              nameRequired: t('contact.errors.nameRequired'),
              queryRequired: t('contact.errors.queryRequired'),
              tooLong: t('contact.errors.tooLong'),
            },
          }}
        />
      </section>
    </div>
  );
}
