'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  embedSrc: string;
  title: string;
  buttonLabel: string;
  notice: string;
};

/**
 * Click-to-load Google Maps embed: no third-party request or weight until the visitor asks for
 * the map (performance + privacy).
 */
export function MapFacade({ embedSrc, title, buttonLabel, notice }: Props) {
  const [loaded, setLoaded] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  // The button that had focus is replaced by the map: hand focus to the map (WCAG 2.4.3).
  useEffect(() => {
    if (loaded) frame.current?.focus();
  }, [loaded]);

  if (loaded) {
    return (
      <iframe
        ref={frame}
        tabIndex={-1}
        src={embedSrc}
        title={title}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        className="aspect-video w-full rounded-3xl border-0"
      />
    );
  }

  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-12 rounded-3xl bg-bone-white/5 p-24 text-center">
      <button
        type="button"
        onClick={() => {
          setLoaded(true);
        }}
        className="min-h-11 rounded-3xl border border-ignition-gold px-24 py-12 text-nav-label font-semibold tracking-label text-ignition-gold uppercase hover:bg-ignition-gold/10"
      >
        {buttonLabel}
      </button>
      <p className="text-caption text-ash-gray">{notice}</p>
    </div>
  );
}
