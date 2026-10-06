import { useTranslations } from 'next-intl';

import { siteConfig } from '@/shared/config/business';
import { PhoneButton } from '@/shared/ui/phone-button';

export function FinalCta() {
  const t = useTranslations();

  return (
    <section
      aria-labelledby="cta-title"
      className="mx-auto max-w-(--container-page) px-4 py-60 md:px-24 md:py-96"
    >
      <div className="flex flex-col items-start gap-24">
        <h2
          id="cta-title"
          className="max-w-[900px] text-heading-sm font-normal tracking-display uppercase md:text-heading-lg"
        >
          {t('finalCta.title')}
        </h2>
        <p className="max-w-[520px] text-silver-mist">{t('finalCta.body')}</p>
        <PhoneButton
          number={siteConfig.phoneNumber}
          source="final-cta"
          label={t('finalCta.cta')}
          callHint={t('common.callHint')}
        />
      </div>
    </section>
  );
}
