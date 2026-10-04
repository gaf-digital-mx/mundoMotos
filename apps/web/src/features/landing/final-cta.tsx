import { useTranslations } from 'next-intl';

import { WhatsappButton } from '@/shared/ui/whatsapp-button';

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
          className="max-w-[900px] text-heading-sm font-normal tracking-display md:text-heading-lg"
        >
          {t('finalCta.title')}
        </h2>
        <p className="max-w-[520px] text-silver-mist">{t('finalCta.body')}</p>
        <WhatsappButton
          source="final-cta"
          message={t('common.whatsappGreeting')}
          label={t('finalCta.cta')}
          newTabHint={t('common.opensInNewTab')}
        />
      </div>
    </section>
  );
}
