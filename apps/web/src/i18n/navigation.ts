import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/** Locale-aware navigation primitives. Links render without a locale prefix. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
