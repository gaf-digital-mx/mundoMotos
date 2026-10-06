import { formatPhoneMx, telUrl } from '@/shared/lib/contact-links';
import { trackPath } from '@/shared/lib/tracked-links';
import { PhoneIcon } from '@/shared/ui/icons';

import type { ClickSource } from '@mundomotos/contracts';

type Props = {
  number: string;
  label: string;
  /** Section reported with the click (ADR-0013). */
  source: ClickSource;
  className?: string;
};

/**
 * Primary call to action that dials the shop (the filled brand-red pill). A plain `tel:` link,
 * never the tracked redirect: handing `tel:` off through a 302 is unreliable across browsers.
 * The click is reported with `<a ping>` instead, so phone numbers stay a lower bound (Firefox
 * disables pings).
 */
export function PhoneButton({ number, label, source, className = '' }: Props) {
  return (
    <a
      href={telUrl(number)}
      ping={trackPath('phone', source)}
      className={`inline-flex min-h-11 items-center gap-12 rounded-3xl bg-racing-red px-18 py-12 text-nav-label font-semibold tracking-label text-bone-white uppercase transition-colors hover:bg-racing-red-hover ${className}`}
    >
      <PhoneIcon className="size-18" />
      {label}
      {/* The number is part of the accessible name: the visible label alone doesn't say who you call. */}
      <span className="sr-only"> {formatPhoneMx(number)}</span>
    </a>
  );
}
