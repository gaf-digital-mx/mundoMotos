import { useTranslations } from 'next-intl';

import { business } from '@/shared/config/business';
import { directionsUrl } from '@/shared/lib/contact-links';
import { PinIcon } from '@/shared/ui/icons';

/** Always-reachable "Cómo llegar" pill (outline style: the filled red pill stays unique per view). */
export function FloatingDirections() {
  const t = useTranslations();

  return (
    <a
      href={directionsUrl({ name: business.name, ...business.address })}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed right-[max(16px,env(safe-area-inset-right))] bottom-[max(16px,env(safe-area-inset-bottom))] z-40 inline-flex min-h-11 items-center gap-6 rounded-3xl border border-ignition-gold bg-void/90 px-18 py-12 text-nav-label font-semibold tracking-label text-ignition-gold uppercase backdrop-blur-sm hover:bg-ignition-gold/10"
    >
      <PinIcon className="size-18" />
      {t('floating.directions')}
      <span className="sr-only"> {t('common.opensInNewTab')}</span>
    </a>
  );
}
