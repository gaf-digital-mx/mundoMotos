import { ArrowRightIcon } from '@/shared/ui/icons';

import type { StaticImageData } from 'next/image';

type Props = {
  name: string;
  body: string;
  small: StaticImageData;
  large: StaticImageData;
  /** Opens the dialog (ServiceDialog wires it up); the quote link shows until it does. */
  moreLabel: string;
  quoteHref: string;
  quoteLabel: string;
  newTabHint: string;
};

/**
 * The scrim is what makes the copy legible, not the blur: blurring averages the photo but keeps
 * bright areas bright, and the darkest service photo still leaves white-hot pixels under the text.
 * Measured over all six photos, 70% black is the point where every pixel behind the copy clears
 * 4.5:1 against silver-mist (worst 4.57:1); at 55% a twentieth of the text area still fails.
 */
const PANEL = 'bg-void/70 backdrop-blur-md';

/**
 * One workshop service: the photo fills the card and a frosted panel carries the copy. The photo
 * is decorative — the name sits right on top of it — so it has no alternative text.
 */
export function ServiceCard({
  name,
  body,
  small,
  large,
  moreLabel,
  quoteHref,
  quoteLabel,
  newTabHint,
}: Props) {
  return (
    <article
      data-service-card
      data-service-name={name}
      data-service-body={body}
      data-service-quote={quoteHref}
      className="relative isolate grid grid-rows-[2fr_3fr] overflow-hidden rounded-3xl border border-bone-white/10"
    >
      {/* Anchored to its bottom edge: when the card is narrower than the photo's own ratio, the
          crop comes off the top rather than the subject at the bottom. */}
      <img
        src={large.src}
        srcSet={`${small.src} 320w, ${large.src} 512w`}
        sizes="(min-width: 768px) 33vw, calc(100vw - 2rem)"
        alt=""
        width={large.width}
        height={large.height}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 -z-10 size-full object-cover object-bottom"
      />
      {/* The rows carry the 40/60 split: the panel's content sets the card's height and the
          photo keeps two thirds of that above it, at any width or text length. The top padding
          clears the folder cut (--tab-height, from `folder-cut`): the heading's line box must not
          reach into it, where there is no scrim and the photo shows through raw. */}
      <div aria-hidden="true" />
      <div
        className={`col-start-1 row-start-2 flex flex-col justify-center gap-6 folder-edge folder-cut p-18 pt-[calc(var(--tab-height)+var(--spacing-6))] ${PANEL}`}
      >
        <h3 className="text-nav-label font-semibold md:text-heading-2xs md:font-normal">{name}</h3>
        {/* Clamped so six cards stay scannable instead of six walls of text. The dialog has it all. */}
        <p className="line-clamp-2 text-caption text-silver-mist md:line-clamp-3 md:text-body">
          {body}
        </p>
        {/* Six identical "Ver más" buttons read as one repeated control, so each one names its
            service for a screen reader. CSS owns `display` for both controls. */}
        <button
          type="button"
          data-service-more
          aria-haspopup="dialog"
          className="mt-12 min-h-8 items-center gap-6 self-start rounded-3xl border border-ignition-gold px-12 py-6 text-caption font-semibold tracking-label text-ignition-gold uppercase hover:bg-ignition-gold/10"
        >
          {moreLabel}
          <span className="sr-only"> {name}</span>
          <ArrowRightIcon className="size-12" />
        </button>
        {/* Shown until the dialog island confirms it can open one: before hydration, if the chunk
            never arrives, or on a browser without showModal. It is the quote the button leads to. */}
        <a
          data-service-fallback
          href={quoteHref}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="mt-12 min-h-8 items-center gap-6 self-start rounded-3xl border border-ignition-gold px-12 py-6 text-caption font-semibold tracking-label text-ignition-gold uppercase"
        >
          {quoteLabel}
          <ArrowRightIcon className="size-12" />
          <span className="sr-only">
            {' '}
            {name} {newTabHint}
          </span>
        </a>
      </div>
    </article>
  );
}
