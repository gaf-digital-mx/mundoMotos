import { useTranslations } from 'next-intl';

import { DISPLACEMENTS_CC, MOTORCYCLE_BRANDS } from '@/content/motorcycle-brands';
import { SERVICES, TUNE_UP_WORKS } from '@/content/services';
import { siteConfig } from '@/shared/config/business';
import { trackPath, whatsappHref } from '@/shared/lib/tracked-links';
import { SectionHeading } from '@/shared/ui/section-heading';

import { type ServiceQuote } from './quote-form';
import { ServiceCard } from './service-card';
import { type ServiceDetail } from './service-detail';
import { ServiceDialog } from './service-dialog';

export function Services() {
  const t = useTranslations();
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
    },
  };

  // Only the tune-up asks about the bike before quoting: it is the service whose price depends on
  // the answers (see its note), and the one whose dialog is built to carry a form. The other five
  // keep their plain quote link; adding one is an entry here.
  const quotes: Record<string, ServiceQuote> = {
    tuneUp: {
      whatsappNumber: siteConfig.whatsappNumber,
      trackUrl: trackPath('whatsapp', 'services'),
      baseMessage: t('services.quoteMessage', { service: t('services.items.tuneUp.name') }),
      brands: MOTORCYCLE_BRANDS,
      displacements: [
        ...DISPLACEMENTS_CC.map((cc) => t('services.quoteForm.displacementOption', { cc })),
        t('services.quoteForm.displacementOver'),
        t('services.quoteForm.displacementUnknown'),
      ],
      labels: {
        title: t('services.quoteForm.title'),
        brand: t('services.quoteForm.brand'),
        brandPlaceholder: t('services.quoteForm.brandPlaceholder'),
        brandOther: t('services.quoteForm.brandOther'),
        brandOtherLabel: t('services.quoteForm.brandOtherLabel'),
        model: t('services.quoteForm.model'),
        displacement: t('services.quoteForm.displacement'),
        displacementPlaceholder: t('services.quoteForm.displacementPlaceholder'),
        submit: t('services.quote'),
        newTabHint,
        errors: {
          brandRequired: t('services.quoteForm.errors.brandRequired'),
          tooLong: t('services.quoteForm.errors.tooLong'),
        },
      },
      // Resolved with literal placeholders: the island fills them with what was answered, since
      // there is no i18n runtime in the browser.
      templates: {
        brand: t('services.quoteForm.message.brand', { brand: '{brand}' }),
        model: t('services.quoteForm.message.model', { model: '{model}' }),
        displacement: t('services.quoteForm.message.displacement', {
          displacement: '{displacement}',
        }),
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
        quotes={quotes}
      />
    </section>
  );
}
