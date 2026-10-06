import { useTranslations } from 'next-intl';

import { directionsHref, TRACKED_REL } from '@/shared/lib/tracked-links';
import { PinIcon } from '@/shared/ui/icons';

import type { ClickSource } from '@mundomotos/contracts';

const PILL =
  'inline-flex min-h-11 items-center gap-6 rounded-3xl border-flame px-18 py-12 text-nav-label font-semibold tracking-label uppercase hover:[--flame-fill:color-mix(in_oklab,var(--color-ignition-gold)_10%,var(--color-void))]';

/** Sections the floating pill can dock into (DirectionsDock); also the click source when docked. */
export type DirectionsDock = Extract<ClickSource, 'hero' | 'location' | 'final-cta'>;

/** The "Cómo llegar" pill. Floating and docked copies must look identical (DirectionsDock morphs one into the other). */
function DirectionsLink({
  source,
  dock,
  className,
}: {
  source: ClickSource;
  dock?: DirectionsDock;
  className: string;
}) {
  const t = useTranslations();
  return (
    <a
      href={directionsHref(source)}
      target="_blank"
      rel={TRACKED_REL}
      data-directions={dock ? 'docked' : 'floating'}
      data-dock={dock}
      className={`${PILL} ${className}`}
    >
      {/* SVG can't clip a gradient like text: the pin takes the gradient's starting color. */}
      <PinIcon className="size-18 text-flame-red" />
      <span className="text-flame">{t('floating.directions')}</span>
      <span className="sr-only"> {t('common.opensInNewTab')}</span>
    </a>
  );
}

/**
 * Always-reachable pill, fixed bottom-center on phones (reachable by either thumb) and
 * bottom-right from `md` (outline style: the filled red pill stays unique per view). While a
 * dock section is on screen it docks there instead (DirectionsDock; visibility rules in
 * globals.css).
 */
export function FloatingDirections() {
  return (
    <DirectionsLink
      source="floating"
      className="fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-40 mx-auto w-fit md:right-[max(16px,env(safe-area-inset-right))] md:left-auto md:mx-0"
    />
  );
}

/**
 * The pill's docked place in a section. Its space is always reserved (hidden with visibility,
 * which also removes it from the tab order and accessibility tree), so docking never shifts
 * the layout. Clicks while docked count for that section. The wrapper is the slot DirectionsDock
 * observes: the link inside it is the one that animates, and an animated transform would
 * otherwise feed back into the observer (dock → travel out of view → undock → …).
 */
export function DockedDirections({
  dock,
  className = '',
}: {
  dock: DirectionsDock;
  className?: string;
}) {
  return (
    <span data-dock-slot={dock} className={`inline-flex ${className}`}>
      <DirectionsLink source={dock} dock={dock} className="" />
    </span>
  );
}
