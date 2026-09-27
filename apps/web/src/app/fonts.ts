import { Inter } from 'next/font/google';

/** Inter substitutes the commercial reference typeface (docs/design-system.md). Self-hosted at build. */
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
