'use client';

import { useEffect } from 'react';

const STATE = 'data-directions-dock';
/** Set while a region that wants the floating pill out of the way is on screen. */
const MUTED = 'data-directions-muted';

const TRAVEL_MS = 320;
const FADE_MS = 180;
/** Longest trip (fraction of the viewport height) worth animating as travel. */
const MAX_TRAVEL = 0.3;
/** Bottom band occupied by the floating pill (16px gap + 44px pill + breathing room). */
const FLOATING_BAND_PX = 80;

/**
 * Docks the floating "Cómo llegar" pill into whichever dock section (hero, location) is on
 * screen, and floats it everywhere else. State is one root attribute; globals.css shows the
 * matching copy. When the old copy was on screen and close by (docking right above the
 * floating spot), the new one is animated from there (FLIP) so the pill appears to travel;
 * otherwise (the old copy just left the screen) it fades in where it belongs instead of
 * flying across the viewport. Not View Transitions: their overlay swallows taps while animating
 * (Safari ignores pointer-events on it), and this button is tapped right after scrolling.
 * The first state (on load) and reduced motion apply instantly.
 */
export function DirectionsDock() {
  useEffect(() => {
    const docks = [...document.querySelectorAll<HTMLElement>('[data-dock]')];
    const floating = document.querySelector<HTMLElement>('[data-directions="floating"]');
    if (docks.length === 0 || !floating) return; // pages without docks: always floating

    const root = document.documentElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Observe the static slots, never the animated links (transforms change what IO measures).
    const slots = new Map(
      docks.flatMap((dock) => {
        const slot = dock.closest('[data-dock-slot]');
        return slot ? [[slot, dock] as const] : [];
      }),
    );
    const onScreen = new Set<HTMLElement>();
    let travel: Animation | undefined;
    let first = true;

    const visibleCopy = () =>
      docks.find((dock) => dock.dataset.dock === root.getAttribute(STATE)) ?? floating;

    const apply = () => {
      // DOM order wins if two docks are on screen at once.
      const active = docks.find((dock) => onScreen.has(dock))?.dataset.dock ?? 'none';
      if (!first && root.getAttribute(STATE) === active) return;
      const from = visibleCopy();
      // Measured before cancelling: mid-travel, the rect includes the running translate, so a
      // quick reversal starts from where the pill is on screen.
      const start = from.getBoundingClientRect();
      travel?.cancel();
      const hadFocus = document.activeElement === from;
      root.setAttribute(STATE, active);
      const to = visibleCopy();
      // Focus must not vanish with the hidden copy (WCAG 2.4.3).
      if (hadFocus) to.focus({ preventScroll: true });
      if (!first && !reduced.matches && to !== from) {
        const end = to.getBoundingClientRect();
        const dx = start.left - end.left;
        const dy = start.top - end.top;
        const startOnScreen = start.top >= 0 && start.bottom <= window.innerHeight;
        travel =
          startOnScreen && Math.hypot(dx, dy) <= window.innerHeight * MAX_TRAVEL
            ? to.animate([{ translate: `${String(dx)}px ${String(dy)}px` }, { translate: '0 0' }], {
                duration: TRAVEL_MS,
                easing: 'cubic-bezier(0.2, 0, 0, 1)',
              })
            : to.animate(
                [
                  { opacity: 0, translate: '0 8px' },
                  { opacity: 1, translate: '0 0' },
                ],
                { duration: FADE_MS, easing: 'ease-out' },
              );
      }
      first = false;
    };

    // Watch the docked slots themselves, not their sections: a tall section can be on screen
    // while its slot isn't, which would leave no pill visible. A slot counts only when fully
    // visible and clear of the bottom band where the floating pill sits.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const dock = slots.get(entry.target);
          if (!dock) continue;
          if (entry.isIntersecting) onScreen.add(dock);
          else onScreen.delete(dock);
        }
        apply();
      },
      { rootMargin: `0px 0px -${String(FLOATING_BAND_PX)}px 0px`, threshold: 1 },
    );
    for (const slot of slots.keys()) observer.observe(slot);

    // A region can ask for the pill to step aside entirely: the contact form's submit button
    // does, because on a phone the pill rides the same bottom lane and covers it. Tied to the
    // region reaching that lane rather than to a field having focus — focus survives scrolling,
    // so a field left focused would have taken the pill away for the rest of the page.
    // The lane is the lower half of the screen, which is what `rootMargin` cuts the root down
    // to: above it the two are nowhere near each other. Whether that matters at all is the
    // stylesheet's call — from `md` the pill sits in the corner and the button moves left.
    let covered = false;
    const applyMute = () => {
      // The pill must not be hidden out from under the keyboard (WCAG 2.4.3): while it has
      // focus the mute waits, and `focusout` brings it back to finish the job.
      root.toggleAttribute(MUTED, covered && document.activeElement !== floating);
    };
    const muter = new IntersectionObserver(
      (entries) => {
        covered = entries.some((entry) => entry.isIntersecting);
        applyMute();
      },
      { rootMargin: '-50% 0px 0px 0px', threshold: 0 },
    );
    const mute = document.querySelector('[data-directions-mute]');
    if (mute) muter.observe(mute);
    floating.addEventListener('focusout', applyMute);

    return () => {
      observer.disconnect();
      muter.disconnect();
      floating.removeEventListener('focusout', applyMute);
      travel?.cancel();
      root.removeAttribute(STATE);
      root.removeAttribute(MUTED);
    };
  }, []);

  return null;
}
