import { useTranslations } from 'next-intl';

import { siteConfig } from '@/shared/config/business';
import { SectionHeading } from '@/shared/ui/section-heading';

import { ContactForm } from './contact-form';

export function ContactSection() {
  const t = useTranslations();

  return (
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
  );
}
