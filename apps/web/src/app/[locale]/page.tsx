import { useTranslations } from 'next-intl';

import { BusinessJsonLd } from '@/shared/ui/business-json-ld';

/** Phase 0 placeholder. The real landing arrives in Phase 1. */
export default function HomePage() {
  const t = useTranslations('home');

  return (
    <div className="mx-auto flex min-h-dvh max-w-(--container-page) flex-col justify-center gap-24 px-4 md:px-24">
      <p className="text-nav-label font-semibold tracking-label text-ignition-gold uppercase">
        {t('eyebrow')}
      </p>
      <h1 className="text-display font-normal tracking-display">{t('title')}</h1>
      <p className="max-w-[520px] text-silver-mist">{t('comingSoon')}</p>
      <BusinessJsonLd />
    </div>
  );
}
