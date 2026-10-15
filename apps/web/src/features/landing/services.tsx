import { useTranslations } from 'next-intl';

import { SERVICES } from '@/content/services';
import { whatsappHref } from '@/shared/lib/tracked-links';
import { SectionHeading } from '@/shared/ui/section-heading';

import { ServiceCard } from './service-card';
import { ServiceDialog } from './service-dialog';

export function Services() {
  const t = useTranslations();
  const newTabHint = t('common.opensInNewTab');

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
        body={t.rich('services.body', {
          contact: (chunks) => (
            <a
              href="#contacto"
              className="text-bone-white underline underline-offset-4 hover:text-ignition-gold"
            >
              {chunks}
            </a>
          ),
          visit: (chunks) => (
            <a
              href="#ubicacion"
              className="text-bone-white underline underline-offset-4 hover:text-ignition-gold"
            >
              {chunks}
            </a>
          ),
        })}
      />
      <ul className="mt-60 grid gap-18 md:grid-cols-3 md:gap-36">
        {SERVICES.map(({ id, small, large }) => {
          const name = t(`services.items.${id}.name`);
          return (
            // A grid item rather than `display: contents`, so the list keeps its semantics in
            // every screen reader and the cards still stretch to an equal row height.
            <li key={id} className="grid">
              <ServiceCard
                name={name}
                body={t(`services.items.${id}.body`)}
                small={small}
                large={large}
                moreLabel={t('services.more')}
                quoteLabel={t('services.quote')}
                quoteHref={whatsappHref('services', t('services.quoteMessage', { service: name }))}
                newTabHint={newTabHint}
              />
            </li>
          );
        })}
      </ul>
      <ServiceDialog
        closeLabel={t('services.close')}
        quoteLabel={t('services.quote')}
        newTabHint={newTabHint}
      />
    </section>
  );
}
