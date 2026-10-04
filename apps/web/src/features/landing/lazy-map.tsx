'use client';

import { useEffect, useRef, useState } from 'react';

type Props = { src: string; title: string; className: string };

/** How close the map must get before Google Maps is requested. */
const PRELOAD_MARGIN = '300px';

/**
 * Google Maps embed that is only requested when the section approaches the viewport. Native
 * `loading="lazy"` isn't enough: Chrome's distance threshold (1250–2500px) loads it on page
 * load on desktop, sending every visitor's request to Google and costing third-party JS.
 * The box is sized up front (no layout shift); without JS a <noscript> copy shows the map.
 */
export function LazyMap({ src, title, className }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = frame.current;
    if (!element || near) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.at(-1)?.isIntersecting) setNear(true);
      },
      { rootMargin: `${PRELOAD_MARGIN} 0px` },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [near]);

  return (
    <iframe
      ref={frame}
      {...(near ? { src } : {})}
      title={title}
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className={className}
    />
  );
}
