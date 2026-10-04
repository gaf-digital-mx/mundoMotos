'use client';

import { useState, type ReactNode } from 'react';

type Props = {
  /** The item list, rendered once by the server; the island duplicates it for the loop. */
  children: ReactNode;
  pauseLabel: string;
  playLabel: string;
};

/**
 * Infinite marquee with a visible pause control (WCAG 2.2.2). While paused, or while an item has
 * keyboard focus, the animation stops and the strip becomes natively scrollable, so a focused
 * item can always scroll into view. Hover only freezes it in place. With reduced motion it never
 * animates. The duplicate copy exists only for the seamless loop and is inert.
 */
export function Marquee({ children, pauseLabel, playLabel }: Props) {
  const [paused, setPaused] = useState(false);

  return (
    <div className="group/marquee" data-paused={paused || undefined}>
      <div className="mx-auto flex max-w-(--container-page) justify-end px-4 md:px-24">
        <button
          type="button"
          onClick={() => {
            setPaused((value) => !value);
          }}
          className="min-h-11 rounded-3xl border border-ash-gray/50 px-18 py-6 text-caption font-semibold tracking-label text-silver-mist uppercase hover:border-bone-white hover:text-bone-white motion-reduce:hidden"
        >
          {paused ? playLabel : pauseLabel}
        </button>
      </div>
      <div className="mt-18 overflow-x-clip group-focus-within/marquee:overflow-x-auto group-data-[paused]/marquee:overflow-x-auto motion-reduce:overflow-x-auto">
        {/* Each copy carries its own trailing gap so translateX(-50%) loops seamlessly. */}
        <div className="flex w-max animate-marquee py-6 group-focus-within/marquee:animate-none group-hover/marquee:[animation-play-state:paused] group-data-[paused]/marquee:animate-none motion-reduce:animate-none">
          <div className="flex pr-18 pl-4 md:pl-24">{children}</div>
          <div
            aria-hidden="true"
            inert
            className="flex pr-18 pl-4 group-focus-within/marquee:hidden group-data-[paused]/marquee:hidden motion-reduce:hidden md:pl-24"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
