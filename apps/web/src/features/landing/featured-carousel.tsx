'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';

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
/** A gesture shorter than a quarter of a card's travel is a tap that wandered, not a drag. */
const DRAG_PLACES = 0.25;
/** ...and one that has not travelled this far sideways, in pixels, may still become a scroll. */
const DRAG_SLACK = 10;

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
 * The strip is a ring: it always travels the same way and the last category is followed by the
 * first, which is also why each card's place is measured the short way around. The card that
 * runs off one end crosses back to the other through the outermost place, where globals.css
 * keeps it transparent, so the jump is never seen.
 *
 * Cards can also be dragged — pointer or thumb — and follow the gesture as it happens. Any
 * manual pick, drag included, stops the rotation for good: fighting it is worse than losing it.
 * The pause button is there regardless (WCAG 2.2.2).
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
  const strip = useRef<HTMLUListElement>(null);
  const total = categories.length;

  // Tabbing in holds the rotation: a category that changes under the keyboard takes the focused
  // chip with it. The pointer does not hold it — resting the mouse somewhere is not a request.
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const hold = () => {
      setHeld(true);
    };
    const release = () => {
      setHeld(false);
    };
    node.addEventListener('focusin', hold);
    node.addEventListener('focusout', release);
    return () => {
      node.removeEventListener('focusin', hold);
      node.removeEventListener('focusout', release);
    };
  }, []);

  useEffect(() => {
    if (!ready || !playing || held) return;
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % total);
    }, STEP_MS);
    return () => {
      clearInterval(timer);
    };
  }, [ready, playing, held, total]);

  const pick = (index: number) => {
    setActive(index);
    setPlaying(false);
  };
  const nudge = useCallback(
    (places: number) => {
      setActive((current) => (current + (places % total) + total) % total);
      setPlaying(false);
    },
    [total],
  );

  // Dragging the strip. Native listeners rather than JSX handlers: the gesture belongs to the
  // whole strip, which is a list, and the cards themselves are not controls.
  useEffect(() => {
    const node = strip.current;
    if (!ready || !node) return;
    let pointer = 0;
    let startX = 0;
    let startY = 0;
    let stepPx = 0;
    let places = 0;
    let dragging = false;

    const down = (event: PointerEvent) => {
      if (pointer || !event.isPrimary) return;
      pointer = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      places = 0;
      dragging = false;
      // One card's travel, in pixels: `--step` is a registered length, so it comes back resolved
      // whatever the viewport does to it.
      const step = Number.parseFloat(getComputedStyle(node).getPropertyValue('--step'));
      stepPx = step > 0 ? step : node.getBoundingClientRect().width / 2;
    };

    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      const dx = event.clientX - startX;
      if (!dragging) {
        // Claimed only once the gesture is clearly sideways, so a thumb travelling down the
        // screen still scrolls the page instead of nudging the strip.
        if (Math.abs(dx) < DRAG_SLACK || Math.abs(dx) <= Math.abs(event.clientY - startY)) return;
        dragging = true;
        node.setPointerCapture(pointer);
        node.dataset.dragging = '';
      }
      places = dx / stepPx;
      node.style.setProperty('--drag', String(places));
    };

    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      pointer = 0;
      if (!dragging) return;
      dragging = false;
      delete node.dataset.dragging;
      node.style.removeProperty('--drag');
      // Pulling the strip to the right brings the cards on the left to the middle.
      const settled = Math.round(places);
      if (settled) nudge(-settled);
      else if (Math.abs(places) > DRAG_PLACES) nudge(places > 0 ? -1 : 1);
    };

    node.addEventListener('pointerdown', down);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    return () => {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', up);
    };
  }, [ready, nudge]);

  /** How far a card sits from the middle, the short way around: the ring has no ends. */
  const placeOf = (index: number) => {
    const ahead = (index - active + total) % total;
    return ahead > total / 2 ? ahead - total : ahead;
  };

  return (
    <div ref={frame} data-enter className="mt-60">
      <ul
        ref={strip}
        {...(ready ? { 'data-coverflow': '' } : {})}
        className={ready ? '-mx-4 md:-mx-24' : 'grid gap-18 md:grid-cols-2 md:gap-36'}
      >
        {/* The card is the list item itself: the 3D perspective that makes the strip deep only
            reaches the children of the element that holds it. */}
        {categories.map((category, index) => (
          <li
            key={category.id}
            data-card
            {...(ready ? { style: { '--offset': String(placeOf(index)) } as CSSProperties } : {})}
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
              draggable={false}
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
              nudge(-1);
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
              nudge(1);
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
