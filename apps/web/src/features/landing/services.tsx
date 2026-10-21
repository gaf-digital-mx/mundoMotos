import { useLocale, useTranslations } from 'next-intl';

import { SERVICES, TUNE_UP_WORKS } from '@/content/services';
import { whatsappHref } from '@/shared/lib/tracked-links';
import { SectionHeading } from '@/shared/ui/section-heading';

import { ServiceCard } from './service-card';
import { RPM_SLOT, numberLocale, type ServiceDetail } from './service-detail';
import { ServiceDialog } from './service-dialog';

export function Services() {
  const t = useTranslations();
  const locale = useLocale();
  const newTabHint = t('common.opensInNewTab');

  const table = {
    work: t('services.table.work'),
    bike: t('services.table.bike'),
    scooter: t('services.table.scooter'),
    yes: t('services.table.yes'),
    no: t('services.table.no'),
  };

  // One entry per service that has a detail view, written out rather than built from a template
  // literal: the message keys are typed, and only the services that own detail copy have these
  // keys. A new service joins by adding its own entry (and its `works` in `content/services.ts`).
  const details: Record<string, ServiceDetail> = {
    tuneUp: {
      title: t('services.items.tuneUp.detail.title'),
      note: t('services.items.tuneUp.detail.note'),
      table,
      works: TUNE_UP_WORKS.map((work) => ({
        ...work,
        label: t(`services.items.tuneUp.detail.items.${work.id}`),
      })),
      figure: {
        title: t('services.items.tuneUp.detail.figure.title'),
        hint: t('services.items.tuneUp.detail.figure.hint'),
        caption: t('services.items.tuneUp.detail.figure.caption'),
        // The number changes every frame, so the message is resolved into a template and the
        // figure fills the slot. Passing the slot as the ICU value keeps the key typed and the
        // unit on whichever side of the number the language wants it.
        readout: t('services.items.tuneUp.detail.figure.readout', { rpm: RPM_SLOT }),
        control: t('services.items.tuneUp.detail.figure.control'),
        alt: t('services.items.tuneUp.detail.figure.alt'),
        keys: {
          air: t('services.items.tuneUp.detail.figure.keys.air'),
          spark: t('services.items.tuneUp.detail.figure.keys.spark'),
        },
        locale: numberLocale(locale),
        tag: t('services.eyebrow'),
      },
    },
  };

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
            <li key={id} data-enter className="grid">
              <ServiceCard
                id={id}
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
        details={details}
      />
    </section>
  );
}
