import { useTranslations } from 'next-intl';

import { SERVICE_IDS } from '@/content/services';
import { TRACKED_REL, whatsappHref } from '@/shared/lib/tracked-links';
import { SectionHeading } from '@/shared/ui/section-heading';

export function Services() {
  const t = useTranslations();

  return (
    <section
      id="servicios"
      aria-labelledby="services-title"
      className="mx-auto max-w-(--container-page) scroll-mt-24 px-4 py-60 md:px-24 md:py-96"
    >
      <SectionHeading
        id="services-title"
        eyebrow={t('services.eyebrow')}
        title={t('services.title')}
        body={t('services.body')}
      />
      <ol className="mt-60 grid gap-x-36 md:grid-cols-2">
        {SERVICE_IDS.map((id, index) => {
          const name = t(`services.items.${id}.name`);
          return (
            <li key={id} className="flex gap-24 border-t border-ash-gray/30 py-30">
              <span
                aria-hidden="true"
                className="text-nav-label font-semibold text-flame-orange tabular-nums"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="flex flex-1 flex-col gap-12">
                <h3 className="text-heading-2xs font-normal">{name}</h3>
                <p className="text-silver-mist">{t(`services.items.${id}.body`)}</p>
                <a
                  href={whatsappHref('services', t('services.quoteMessage', { service: name }))}
                  target="_blank"
                  rel={TRACKED_REL}
                  className="self-start text-nav-label font-semibold tracking-label text-ignition-gold uppercase underline-offset-4 hover:underline"
                >
                  {t('services.quote')}
                  <span className="sr-only">
                    {' '}
                    {name} {t('common.opensInNewTab')}
                  </span>
                </a>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
