import 'server-only';

import { parseSiteConfig } from '@mundomotos/contracts';

/**
 * The only place the web app reads environment variables (ADR-0016). Evaluated at build time
 * (static export), so an invalid value fails the build, never a visitor. Server-only: client
 * islands receive the values they need as props.
 */
export const siteConfig = parseSiteConfig(process.env);

/** Stable business facts. Placeholders are marked TODO(content) until the client provides them. */
export const business = {
  name: 'Mundo Motos',
  legalTagline: 'Refaccionaria & Taller',
} as const;
