/** Decorative line icons (stroke = currentColor). The surrounding text always carries the meaning. */
import type { FeaturedCategory } from '@/content/featured';

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

/** Filled, like the WhatsApp glyph it sits beside on the sibling CTA (the shared outline `base` would read lighter). */
export function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable={false}
      className={className}
    >
      <path d="M6.6 2.5a1.8 1.8 0 0 1 1.7 1.2l1 2.6a1.8 1.8 0 0 1-.5 2L7.6 9.4a12.5 12.5 0 0 0 5.4 5.4l1.1-1.2a1.8 1.8 0 0 1 2-.5l2.6 1a1.8 1.8 0 0 1 1.2 1.7v2.3a2.2 2.2 0 0 1-2.4 2.2A17.8 17.8 0 0 1 2.3 4.9 2.2 2.2 0 0 1 4.5 2.5h2.1Z" />
    </svg>
  );
}

const PATHS: Record<FeaturedCategory, string> = {
  lighting:
    'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z',
  accessories: 'M3 12h4l2-3h6l2 3h4M7 12v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3',
  protection: 'M4 14a8 8 0 0 1 16 0v3H4v-3ZM4 14h9a3 3 0 0 0 3-3V7.5M8 17v2h8v-2',
  tires: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  tubes: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 4v-1',
  rims: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0-7v7m0 4v7M3 12h7m4 0h7',
  brakePads: 'M5 7a9 9 0 0 1 14 0l-2 2a6 6 0 0 0-10 0L5 7Zm-1 6h16v4H4v-4Z',
};

export function CategoryIcon({
  category,
  className,
}: {
  category: FeaturedCategory;
  className?: string;
}) {
  return (
    <svg {...base} className={className}>
      <path d={PATHS[category]} />
    </svg>
  );
}

export function PinIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
