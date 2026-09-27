import { locale as rootLocale } from 'next/root-params';
import { hasLocale, type Messages } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { routing } from './routing';

export default getRequestConfig(async () => {
  // Undefined outside the [locale] tree (e.g. the global 404), which falls back to Spanish.
  const requested = await rootLocale();
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const catalog = (await import(`./messages/${locale}.json`)) as { default: Messages };

  return { locale, timeZone: 'America/Mexico_City', messages: catalog.default };
});
