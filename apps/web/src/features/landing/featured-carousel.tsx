'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';

import { ArrowRightIcon, PauseIcon, PlayIcon } from '@/shared/ui/icons';

type Chip = { id: string; text: string; hint: string; href: string };

type Category = {
  id: string;
  name: string;
  /** Already interpolated ("Ver Protección"): the island never translates. */
  showLabel: string;
  photo: { src: string; srcSet: string; width: number; height: number };
  items: readonly Chip[];
};

type Props = {
  categories: readonly Category[];
  rel: string;
  labels: { previous: string; next: string; pause: string; play: string };
};

/** How long each category stays in the middle. */
const STEP_MS = 3600;

/** Nothing to subscribe to: the only change is server render → client render. */
const noStore = () => () => {
  // no teardown
};

/** Read once, as the initial state: a rotation nobody asked for never starts. */
const movementWelcome = () =>
  typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const labelId = (id: string) => `featured-label-${id}`;
const panelId = (id: string) => `featured-panel-${id}`;

/**
 * The seven categories as a coverflow: the middle card faces the visitor and the rest fall away
 * to either side, with the middle one's parts listed underneath as WhatsApp chips.
 *
 * Until the island is mounted it renders the plain grid the server shipped — every card with
 * every chip visible. That is also what a visitor without scripting, or with a dropped chunk,
 * keeps: all 18 tracked links reachable, nothing hidden behind a control that never runs. The
 * carousel markup (and the controls that drive it) only exists once React is in charge.
 *
 * The rotation reverses at the ends instead of looping, so no card ever flies across the whole
 * strip. It stops for good the moment the visitor picks a category — fighting the rotation is
 * worse than losing it — and the pause button is there regardless (WCAG 2.2.2).
 */
export function FeaturedCarousel({ categories, rel, labels }: Props) {
  const [active, setActive] = useState(0);
  // Server and first client render agree on `false`: the carousel replaces the grid only once
  // React is driving it, which is also why reading the media query below cannot mismatch —
  // nothing that depends on it is rendered yet.
  const ready = useSyncExternalStore(
    noStore,
    () => true,
    () => false,
  );
  const [playing, setPlaying] = useState(movementWelcome);
  const [held, setHeld] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const direction = useRef(1);

  // Hovering or tabbing in only holds the rotation: a category that changes under the pointer
  // is annoying, and one that changes under the keyboard takes the focused chip with it.
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const hold = () => {
      setHeld(true);
    };
    const release = () => {
      setHeld(false);
    };
    node.addEventListener('pointerenter', hold);
    node.addEventListener('pointerleave', release);
    node.addEventListener('focusin', hold);
    node.addEventListener('focusout', release);
    return () => {
      node.removeEventListener('pointerenter', hold);
      node.removeEventListener('pointerleave', release);
      node.removeEventListener('focusin', hold);
      node.removeEventListener('focusout', release);
    };
  }, []);

  useEffect(() => {
    if (!ready || !playing || held) return;
    const timer = setInterval(() => {
      setActive((current) => {
        const next = current + direction.current;
        if (next >= 0 && next < categories.length) return next;
        direction.current *= -1;
        return current + direction.current;
      });
    }, STEP_MS);
    return () => {
      clearInterval(timer);
    };
  }, [ready, playing, held, categories.length]);

  const pick = (index: number) => {
    setActive(index);
    setPlaying(false);
  };
  const step = (delta: number) => {
    pick((active + delta + categories.length) % categories.length);
  };

  return (
    <div ref={frame} data-enter className="mt-60">
      <ul
        {...(ready ? { 'data-coverflow': '' } : {})}
        className={ready ? '-mx-4 md:-mx-24' : 'grid gap-18 md:grid-cols-2 md:gap-36'}
      >
        {/* The card is the list item itself: the 3D perspective that makes the strip deep only
            reaches the children of the element that holds it. */}
        {categories.map((category, index) => (
          <li
            key={category.id}
            data-card
            {...(ready ? { style: { '--offset': String(index - active) } as CSSProperties } : {})}
            {...(index === active ? { 'data-current': '' } : {})}
            className={`relative isolate flex flex-col justify-end overflow-hidden rounded-3xl border border-bone-white/10 ${
              ready ? '' : 'min-h-[220px]'
            }`}
          >
            <img
              src={category.photo.src}
              srcSet={category.photo.srcSet}
              sizes="(min-width: 768px) 460px, 72vw"
              alt=""
              width={category.photo.width}
              height={category.photo.height}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 -z-20 size-full object-cover"
            />
            {/* The scrim fades across the whole card, not just behind the copy: a gradient that
                starts at the text block draws a visible seam across the photo. The second layer
                sends the cards that are not in the middle back into the dark; both sit under the
                heading, so they only ever add contrast to it. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-linear-to-t from-void/90 from-20% via-void/65 via-55% to-void/15"
            />
            <div data-dim aria-hidden="true" className="absolute inset-0 -z-10 bg-void/35" />
            <h3 className="p-18 text-nav-label font-semibold tracking-label text-ignition-gold uppercase">
              {category.name}
            </h3>
          </li>
        ))}
      </ul>
      {/* The chips sit outside the strip: on a tilted card half the width away they would be
          unreadable, and they are the one thing in this section a visitor has to be able to
          read and tap. Every category keeps its own list — the carousel only hides the six it
          is not showing, so without it (or without scripting) all 18 are there. */}
      {/* The rows are reserved whichever category is in the middle: a list that is a chip taller
          than the last one would push everything below it down, on its own, every few seconds. */}
      <div className={ready ? 'min-h-[120px] pt-36 md:min-h-[76px]' : ''}>
        {categories.map((category, index) => (
          <div key={category.id} id={panelId(category.id)} hidden={ready && index !== active}>
            <p
              id={labelId(category.id)}
              className={
                ready
                  ? 'sr-only'
                  : 'pt-18 text-nav-label font-semibold tracking-label text-ignition-gold uppercase'
              }
            >
              {category.name}
            </p>
            <ul
              aria-labelledby={labelId(category.id)}
              className={`flex flex-wrap gap-12 ${ready ? 'justify-center' : 'pt-12'}`}
            >
              {category.items.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel={rel}
                    className="inline-flex min-h-8 items-center rounded-3xl border border-bone-white/30 px-12 py-6 text-caption hover:border-ignition-gold hover:text-ignition-gold"
                  >
                    {item.text}
                    <span className="sr-only"> {item.hint}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {ready ? (
        <div className="mt-36 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => {
              step(-1);
            }}
            aria-label={labels.previous}
            className="grid size-36 place-items-center rounded-full text-silver-mist hover:text-ignition-gold"
          >
            <ArrowRightIcon className="size-18 rotate-180" />
          </button>
          {categories.map((category, index) => (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                pick(index);
              }}
              aria-label={category.showLabel}
              aria-pressed={index === active}
              aria-controls={panelId(category.id)}
              className="group grid size-30 place-items-center rounded-full"
            >
              <span
                className={`size-6 rounded-full ${
                  index === active
                    ? 'bg-ignition-gold'
                    : 'bg-silver-mist/50 group-hover:bg-bone-white'
                }`}
              />
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              step(1);
            }}
            aria-label={labels.next}
            className="grid size-36 place-items-center rounded-full text-silver-mist hover:text-ignition-gold"
          >
            <ArrowRightIcon className="size-18" />
          </button>
          <button
            type="button"
            data-carousel-toggle
            onClick={() => {
              setPlaying(!playing);
            }}
            aria-label={playing ? labels.pause : labels.play}
            className="ml-12 grid size-36 place-items-center rounded-full border border-bone-white/30 text-silver-mist hover:border-ignition-gold hover:text-ignition-gold"
          >
            {playing ? <PauseIcon className="size-18" /> : <PlayIcon className="size-18" />}
          </button>
        </div>
      ) : null}
    </div>
  );
}
