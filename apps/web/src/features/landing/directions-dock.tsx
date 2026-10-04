'use client';

import { useEffect } from 'react';

const STATE = 'data-directions-dock';

const TRAVEL_MS = 320;
/** Bottom band occupied by the floating pill (16px gap + 44px pill + breathing room). */
const FLOATING_BAND_PX = 80;

/**
 * Docks the floating "Cómo llegar" pill into whichever dock section (hero, location) is on
 * screen, and floats it everywhere else. State is one root attribute; globals.css shows the
 * matching copy. The newly visible copy is animated from where the old one was (FLIP), so the
 * pill appears to travel. Not View Transitions: their overlay swallows taps while animating
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
    const onScreen = new Set<Element>();
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
        travel = to.animate(
          [
            { translate: `${String(start.left - end.left)}px ${String(start.top - end.top)}px` },
            { translate: '0 0' },
          ],
          { duration: TRAVEL_MS, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
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
          if (entry.isIntersecting) onScreen.add(entry.target);
          else onScreen.delete(entry.target);
        }
        apply();
      },
      { rootMargin: `0px 0px -${String(FLOATING_BAND_PX)}px 0px`, threshold: 1 },
    );
    for (const dock of docks) observer.observe(dock);
    return () => {
      observer.disconnect();
      travel?.cancel();
      root.removeAttribute(STATE);
    };
  }, []);

  return null;
}
