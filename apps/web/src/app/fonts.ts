import { Inter } from 'next/font/google';

/**
 * Inter substitutes the commercial reference typeface (docs/design-system.md). Self-hosted at
 * build. `optional`, not `swap`: swapping reflows the text, and the hero's centred wordmark
 * visibly jumped sideways when the real metrics arrived (283 → 291px). With `optional` the
 * browser keeps the metric-adjusted fallback for that visit instead of swapping, so nothing
 * moves — the file is preloaded from our own origin, so it usually wins the race anyway.
 */
export const inter = Inter({
  subsets: ['latin'],
  display: 'optional',
  variable: '--font-inter',
});
