import type { ClickSource, ClickTarget, Locale } from '@mundomotos/contracts';

/** One anonymous click: no IP, no user agent, no identifiers (ADR-0013). */
export type ClickEvent = {
  target: ClickTarget;
  source: ClickSource | 'unknown';
  locale: Locale;
  /** Two-letter country code from Cloudflare, or `XX` when unknown. */
  country: string;
};

export type ClickRecorder = { record: (event: ClickEvent) => void };

/**
 * Workers Analytics Engine adapter. Blob order is the dataset schema used by report queries:
 * blob1 target, blob2 source, blob3 locale, blob4 country; double1 is the click count.
 * A missing binding (plain `wrangler dev`) records nothing instead of failing the redirect.
 */
export const analyticsEngineRecorder = (
  dataset: AnalyticsEngineDataset | undefined,
): ClickRecorder => ({
  record: ({ target, source, locale, country }) => {
    dataset?.writeDataPoint({
      indexes: [target],
      blobs: [target, source, locale, country],
      doubles: [1],
    });
  },
});

// `bot` only as a word or a product token (Googlebot/, Slackbot-): phone models like "CUBOT P50"
// contain it too.
const AUTOMATED_AGENT =
  /\bbot\b|[a-z]bot[/-]|crawler|spider|slurp|preview|facebookexternalhit|whatsapp\/|telegrambot|headless|curl\/|wget\/|python-|aiohttp|okhttp|go-http/i;

/**
 * Crawlers, link-preview fetchers and prefetches aren't visitors: they still get the redirect,
 * but aren't counted. A cheap heuristic, not a bot defense.
 */
export const isAutomated = (headers: {
  userAgent: string | undefined;
  purpose: string | undefined;
}): boolean =>
  !headers.userAgent ||
  AUTOMATED_AGENT.test(headers.userAgent) ||
  /prefetch|prerender/i.test(headers.purpose ?? '');
