import { Inter } from 'next/font/google';

/**
 * Inter substitutes the commercial reference typeface (docs/design-system.md). Self-hosted at
 * build. `swap`, so text is never invisible: the hero wordmark is left-aligned and typed out
 * left to right, so the width Inter adds over the fallback only extends its right edge — it
 * can't shift the text the way a centred wordmark did.
 */
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
