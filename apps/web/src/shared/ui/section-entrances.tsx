'use client';

import { useEffect } from 'react';

/** A block starts moving once its top is this far into the viewport. */
const TRIGGER = 0.9;

/**
 * Entrances for every `[data-enter]` block. A scroll sweep rather than a `view()` timeline or an
 * IntersectionObserver: a scroll-driven animation whose range the page never finishes would
 * leave the copy displaced (see globals.css), and an observer is never told about a block that a
 * jump — End, an anchor, a dragged scrollbar — skipped straight past. The sweep sees it on the
 * next frame either way. The decorative depth on the category photos is the scroll-driven part.
 * Mounted once per page; the blocks themselves stay server-rendered.
 */
export function SectionEntrances() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let pending = [...document.querySelectorAll<HTMLElement>('[data-enter]')];
    const arrived = () => {
      pending = pending.filter((block) => {
        if (block.getBoundingClientRect().top >= window.innerHeight * TRIGGER) return true;
        block.dataset.entered = '';
        return false;
      });
      return pending.length === 0;
    };

    // Whatever is already on screen is marked before anything can hide it: the visitor is
    // looking at it, and moving it now would be a jolt, not an entrance.
    const done = arrived();
    const root = document.documentElement;
    root.setAttribute('data-enter-ready', '');
    if (done) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (arrived()) window.removeEventListener('scroll', onScroll);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
      root.removeAttribute('data-enter-ready');
    };
  }, []);

  return null;
}
