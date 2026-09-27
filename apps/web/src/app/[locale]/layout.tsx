import { notFound } from 'next/navigation';
import { locale as rootLocale } from 'next/root-params';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { inter } from '@/app/fonts';
import { routing } from '@/i18n/routing';
import { siteConfig } from '@/shared/config/business';

import type { Metadata } from 'next';

import '../globals.css';

export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata');

  return {
    metadataBase: new URL(siteConfig.siteUrl),
    title: t('title'),
    description: t('description'),
    // Canonical is the unprefixed URL: locales never appear in public URLs (ADR-0008).
    alternates: { canonical: '/' },
    robots: siteConfig.indexable ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function LocaleLayout({ children }: LayoutProps<'/[locale]'>) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html lang={locale} className={inter.variable}>
      <body className="min-h-dvh bg-void text-bone-white antialiased">
        {/*
          No NextIntlClientProvider on purpose: translations render on the server, and client
          islands receive the strings they need as props, which keeps ICU formatting out of the bundle.
        */}
        {children}
      </body>
    </html>
  );
}
