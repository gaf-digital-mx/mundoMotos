import { TRACKED_REL, whatsappHref } from '@/shared/lib/tracked-links';

import { WhatsappIcon } from './whatsapp-icon';

import type { ClickSource } from '@mundomotos/contracts';

type Props = {
  /** Section reported with the click (ADR-0013). */
  source: ClickSource;
  message: string;
  label: string;
  newTabHint: string;
  /** Below `sm`, show only the icon (label stays available to assistive tech). */
  compactOnMobile?: boolean;
  className?: string;
};

/** Primary call to action (the single filled red pill per view, per the design system). */
export function WhatsappButton({
  source,
  message,
  label,
  newTabHint,
  compactOnMobile = false,
  className = '',
}: Props) {
  return (
    <a
      href={whatsappHref(source, message)}
      target="_blank"
      rel={TRACKED_REL}
      className={`inline-flex min-h-11 items-center gap-12 rounded-3xl bg-whatsapp-fill px-18 py-12 text-nav-label font-semibold tracking-label text-bone-white uppercase transition-colors hover:bg-whatsapp-fill-hover ${className}`}
    >
      <WhatsappIcon className="size-18" />
      <span className={compactOnMobile ? 'sr-only sm:not-sr-only' : undefined}>{label}</span>
      <span className="sr-only">{newTabHint}</span>
    </a>
  );
}
