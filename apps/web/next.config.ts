import createNextIntlPlugin from 'next-intl/plugin';

import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  // Fully static site served as Worker static assets (ADR-0002).
  output: 'export',
  reactStrictMode: true,
  poweredByHeader: false,
  // No runtime image optimizer on a static export; images ship pre-sized (ADR-0002).
  images: { unoptimized: true },
  transpilePackages: ['@mundomotos/contracts'],
  // The root layout lives under [locale], so the site-wide 404 is a standalone page.
  experimental: { globalNotFound: true },
};

export default withNextIntl(config);
