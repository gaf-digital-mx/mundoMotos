'use client';

import { useEffect } from 'react';

const STATE = 'data-directions-dock';

const TRAVEL_MS = 320;

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
    if (docks.length === 0 || !floating) return; // pages without dock sections: always floating

    const root = document.documentElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sections = new Map(docks.map((dock) => [dock.closest('section') ?? dock, dock]));
    const onScreen = new Set<HTMLElement>();
    let travel: Animation | undefined;
    let first = true;

    const visibleCopy = () =>
      docks.find((dock) => dock.dataset.dock === root.getAttribute(STATE)) ?? floating;

    const apply = () => {
      // DOM order wins if two dock sections are on screen at once.
      const active = docks.find((dock) => onScreen.has(dock))?.dataset.dock ?? 'none';
      if (!first && root.getAttribute(STATE) === active) return;
      travel?.finish();
      const from = visibleCopy();
      const start = from.getBoundingClientRect();
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

    // The margins dock only once a section is well into view, avoiding flicker at its edges.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const dock = sections.get(entry.target as HTMLElement);
          if (!dock) continue;
          if (entry.isIntersecting) onScreen.add(dock);
          else onScreen.delete(dock);
        }
        apply();
      },
      { rootMargin: '-20% 0px -20% 0px' },
    );
    for (const section of sections.keys()) observer.observe(section);
    return () => {
      observer.disconnect();
      travel?.cancel();
      root.removeAttribute(STATE);
    };
  }, []);

  return null;
}
