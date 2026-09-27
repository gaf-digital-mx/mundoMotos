import { DEFAULT_LOCALE } from '@mundomotos/contracts';
import { getTranslations } from 'next-intl/server';

import { inter } from '@/app/fonts';

import type { Metadata } from 'next';

import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: DEFAULT_LOCALE, namespace: 'notFound' });
  return { title: `${t('title')} | Mundo Motos`, robots: { index: false } };
}

/**
 * Exported as the site-wide `404.html`, served by the asset layer for unknown paths. It lives
 * outside the `[locale]` tree, so it pins the default locale.
 */
export default async function GlobalNotFound() {
  const t = await getTranslations({ locale: DEFAULT_LOCALE, namespace: 'notFound' });

  return (
    <html lang={DEFAULT_LOCALE} className={inter.variable}>
      <body className="min-h-dvh bg-void text-bone-white antialiased">
        <main className="mx-auto flex min-h-dvh max-w-(--container-page) flex-col justify-center gap-24 px-4 md:px-24">
          <h1 className="text-heading-lg font-normal tracking-display">{t('title')}</h1>
          <p className="max-w-[520px] text-silver-mist">{t('description')}</p>
          {/* Full reload on purpose: this page lives outside the app router tree. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="text-ignition-gold underline-offset-4 hover:underline">
            {t('backHome')}
          </a>
        </main>
      </body>
    </html>
  );
}
