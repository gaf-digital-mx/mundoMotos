'use client';

import { useEffect } from 'react';

/** A block starts moving once its top is this far into the viewport. */
const ENTER = 0.9;
/** ...and is pushed back out once its top sinks past this line again. The gap between the two
 *  is hysteresis: a block parked on the trigger must not flutter while the page settles. */
const LEAVE = 0.98;

/**
 * Entrances — and exits — for every `[data-enter]` block. A scroll sweep rather than a `view()`
 * timeline or an IntersectionObserver: a scroll-driven animation whose range the page never
 * finishes would leave the copy displaced (see globals.css), and an observer is never told about
 * a block that a jump — End, an anchor, a dragged scrollbar — skipped straight past. The sweep
 * sees it on the next frame either way, and it keeps running for the life of the page, so
 * scrolling back up plays every entrance in reverse and scrolling down plays it again.
 * Mounted once per page; the blocks themselves stay server-rendered.
 */
export function SectionEntrances() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const blocks = [...document.querySelectorAll<HTMLElement>('[data-enter]')];
    // Measured first, marked after: marking a block invalidates style for the next one's
    // measurement, and a dozen of those alternating per frame is a dozen forced reflows.
    const sweep = () => {
      const tops = blocks.map((block) => block.getBoundingClientRect().top);
      const enter = window.innerHeight * ENTER;
      const leave = window.innerHeight * LEAVE;
      blocks.forEach((block, index) => {
        const top = tops[index] ?? 0;
        if (top < enter) block.dataset.entered = '';
        else if (top >= leave) delete block.dataset.entered;
      });
    };

    // Whatever is already on screen is marked before anything can hide it: the visitor is
    // looking at it, and moving it now would be a jolt, not an entrance.
    sweep();
    const root = document.documentElement;
    root.setAttribute('data-enter-ready', '');

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sweep();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // A block that changes height or place without a scroll (the carousel swapping chip lists,
    // an orientation change) still has to be measured again.
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
      root.removeAttribute('data-enter-ready');
    };
  }, []);

  return null;
}
