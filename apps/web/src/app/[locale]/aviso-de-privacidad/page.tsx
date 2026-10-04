import { getTranslations } from 'next-intl/server';

import { business, siteConfig } from '@/shared/config/business';
import { formatPhoneMx } from '@/shared/lib/contact-links';

import type { Metadata } from 'next';

/** Bump when the notice text changes (shown to visitors). */
const LAST_UPDATED = '2026-10-03';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('privacy');
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/aviso-de-privacidad' },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      url: '/aviso-de-privacidad',
    },
  };
}

const SECTIONS = ['collect', 'analytics', 'whatsapp', 'rights', 'changes'] as const;

export default async function PrivacyPage() {
  const t = await getTranslations('privacy');
  const { street, postalCode, locality, region } = business.address;
  const updated = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(LAST_UPDATED),
  );

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-36 px-4 py-60 md:px-24">
      <header className="flex flex-col gap-12">
        <h1 className="text-heading-sm font-normal tracking-display">{t('title')}</h1>
        <p className="text-caption text-ash-gray">{t('updated', { date: updated })}</p>
      </header>
      <p className="text-silver-mist">
        {t('intro', { address: `${street}, ${postalCode} ${locality}, ${region}` })}
      </p>
      {SECTIONS.map((section) => (
        <section key={section} className="flex flex-col gap-12">
          <h2 className="text-heading-2xs font-normal">{t(`${section}Title`)}</h2>
          <p className="text-silver-mist">
            {t(`${section}Body`, { phone: formatPhoneMx(siteConfig.whatsappNumber) })}
          </p>
        </section>
      ))}
    </div>
  );
}
