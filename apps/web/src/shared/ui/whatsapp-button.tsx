import { whatsappUrl } from '@/shared/lib/contact-links';

import { WhatsappIcon } from './whatsapp-icon';

type Props = {
  number: string;
  message: string;
  label: string;
  newTabHint: string;
  /** Below `sm`, show only the icon (label stays available to assistive tech). */
  compactOnMobile?: boolean;
  className?: string;
};

/** Primary call to action (the single filled red pill per view, per the design system). */
export function WhatsappButton({
  number,
  message,
  label,
  newTabHint,
  compactOnMobile = false,
  className = '',
}: Props) {
  return (
    <a
      href={whatsappUrl(number, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center gap-12 rounded-3xl bg-racing-red px-18 py-12 text-nav-label font-semibold tracking-label text-bone-white uppercase transition-colors hover:bg-racing-red-hover ${className}`}
    >
      <WhatsappIcon className="size-18" />
      <span className={compactOnMobile ? 'sr-only sm:not-sr-only' : undefined}>{label}</span>
      <span className="sr-only">{newTabHint}</span>
    </a>
  );
}
