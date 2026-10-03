import { useTranslations } from 'next-intl';

import { SectionHeading } from '@/shared/ui/section-heading';

const ITEMS = ['parts', 'workshop', 'direct'] as const;

export function ValueProp() {
  const t = useTranslations('valueProp');

  return (
    <section
      aria-labelledby="value-title"
      className="mx-auto max-w-(--container-page) px-4 py-60 md:px-24 md:py-96"
    >
      <SectionHeading id="value-title" eyebrow={t('eyebrow')} title={t('title')} />
      <ul className="mt-60 grid gap-36 md:grid-cols-3">
        {ITEMS.map((item) => (
          <li key={item} className="flex flex-col gap-12 border-t border-ash-gray/30 pt-24">
            <h3 className="text-heading-2xs font-normal">{t(`items.${item}.title`)}</h3>
            <p className="text-silver-mist">{t(`items.${item}.body`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
