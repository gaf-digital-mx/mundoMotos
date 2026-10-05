import { networkInterfaces } from 'node:os';

import createNextIntlPlugin from 'next-intl/plugin';

import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** This machine's LAN addresses, so `pnpm dev:lan` can be opened from a phone (dev only). */
const lanOrigins = Object.values(networkInterfaces())
  .flat()
  .filter((net) => net?.family === 'IPv4' && !net.internal)
  .map((net) => net?.address ?? '');

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
  allowedDevOrigins: lanOrigins,
};

export default withNextIntl(config);
