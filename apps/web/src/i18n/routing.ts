import { DEFAULT_LOCALE, ENABLED_LOCALES } from '@mundomotos/contracts';
import { defineRouting } from 'next-intl/routing';

/**
 * Locales are an internal build segment only. Public URLs never carry a locale: the Worker picks
 * the tree from the `lang` cookie (ADR-0008).
 */
export const routing = defineRouting({
  locales: ENABLED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'never',
});
