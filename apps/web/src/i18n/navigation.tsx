import NextLink from 'next/link';

import type { ComponentProps } from 'react';

/**
 * App-wide link. Public URLs never carry a locale (ADR-0008), so plain `next/link` hrefs are
 * already correct; next-intl's Link would only add a client-side intl provider requirement.
 *
 * Prefetch is opt-in: every page/RSC request runs through the Worker's locale rewrite and counts
 * against the Workers Free request quota, and viewport prefetching multiplies those requests.
 */
export function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
