import { z } from 'zod';

import { log } from '../shared/http/logger';

/** Where browsers send violation reports (`report-uri` for Firefox/Safari, `report-to` elsewhere). */
export const CSP_REPORT_PATH = '/api/csp-report';
const REPORT_GROUP = 'csp';

/** Written by apps/web/scripts/csp-hashes.mjs at build time; never requested by visitors. */
export const CSP_MANIFEST_PATH = '/_csp-hashes.json';

const manifestSchema = z.record(z.string(), z.array(z.string().regex(/^sha256-[A-Za-z0-9+/]+=*$/)));
export type CspManifest = z.infer<typeof manifestSchema>;

/**
 * Policy for the static pages. Scripts: same-origin chunks plus the hashes of the page's inline
 * scripts (Next.js RSC payload). Styles allow inline: React `style` attributes (CSS custom
 * properties) and the type animation need it, and style injection is a low-risk vector here.
 * Report-Only in Phase 1; enforced by Phase 3 (architecture §11.4).
 */
export const buildCsp = (scriptHashes: readonly string[]): string =>
  [
    "default-src 'self'",
    `script-src 'self'${scriptHashes.map((hash) => ` '${hash}'`).join('')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    // Google Maps embed, loaded only after the visitor asks (map facade).
    'frame-src https://www.google.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `report-uri ${CSP_REPORT_PATH}`,
    `report-to ${REPORT_GROUP}`,
  ].join('; ');

export const REPORTING_ENDPOINTS = `${REPORT_GROUP}="${CSP_REPORT_PATH}"`;

/** Manifest key for a served page: `/es/` → `/es`; a not-found page uses the 404 page's hashes. */
export const manifestKey = (internalPath: string, status: number): string =>
  status === 404 ? '/404' : internalPath.replace(/\/+$/, '') || '/';

const RETRY_AFTER_MS = 60_000;
let cached: Promise<CspManifest> | undefined;
let failedAt = Number.NEGATIVE_INFINITY;

const fetchManifest = async (assets: Fetcher, origin: string): Promise<CspManifest> => {
  const res = await assets.fetch(new Request(`${origin}${CSP_MANIFEST_PATH}`));
  if (!res.ok) throw new Error(`status ${String(res.status)}`);
  return manifestSchema.parse(await res.json());
};

/**
 * Loads the hash manifest once per isolate (a deploy starts new isolates); concurrent cold
 * requests share one fetch. A missing or invalid manifest is a broken build: it's logged, retried
 * at most once a minute, and pages get a hash-less policy meanwhile (reports while Report-Only;
 * the build step fails before that can reach production).
 */
export const loadCspManifest = async (
  assets: Fetcher,
  origin: string,
  now: number = Date.now(),
): Promise<CspManifest> => {
  if (now - failedAt < RETRY_AFTER_MS) return {};
  cached ??= fetchManifest(assets, origin);
  try {
    return await cached;
  } catch (error) {
    cached = undefined;
    failedAt = now;
    log('error', 'csp manifest unavailable', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {};
  }
};
