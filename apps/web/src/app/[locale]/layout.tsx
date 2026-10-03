import { notFound } from 'next/navigation';
import { locale as rootLocale } from 'next/root-params';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { inter } from '@/app/fonts';
import fachada from '@/assets/brand/generated/fachada-1280.webp';
import { routing } from '@/i18n/routing';
import { siteConfig } from '@/shared/config/business';
import { BusinessJsonLd } from '@/shared/ui/business-json-ld';
import { SiteFooter } from '@/shared/ui/site-footer';
import { SiteHeader } from '@/shared/ui/site-header';

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
    openGraph: {
      type: 'website',
      siteName: 'Mundo Motos',
      locale: 'es_MX',
      title: t('title'),
      description: t('description'),
      images: [{ url: fachada.src, width: fachada.width, height: fachada.height }],
    },
    robots: siteConfig.indexable ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function LocaleLayout({ children }: LayoutProps<'/[locale]'>) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations('common');

  return (
    <html lang={locale} className={inter.variable}>
      <body className="min-h-dvh bg-void text-bone-white antialiased">
        {/*
          No NextIntlClientProvider on purpose: translations render on the server, and client
          islands receive the strings they need as props, which keeps ICU formatting out of the bundle.
        */}
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-12 focus:left-12 focus:z-50 focus:rounded-3xl focus:bg-void focus:px-18 focus:py-12"
        >
          {t('skipToContent')}
        </a>
        <SiteHeader />
        <div id="contenido">{children}</div>
        <SiteFooter />
        <BusinessJsonLd />
      </body>
    </html>
  );
}
