/** Decorative line icons (stroke = currentColor). The surrounding text always carries the meaning. */
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

export function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

/** Filled, to sit beside the WhatsApp and phone glyphs in the footer. */
export function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable={false}
      className={className}
    >
      <path d="M24 12.07C24 5.44 18.63.07 12 .07S0 5.44 0 12.07c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08v-3.47h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.47h-2.8v8.38C19.61 23.02 24 18.06 24 12.07Z" />
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
