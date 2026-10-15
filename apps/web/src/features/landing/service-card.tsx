import { ArrowRightIcon } from '@/shared/ui/icons';

import type { StaticImageData } from 'next/image';

type Props = {
  name: string;
  body: string;
  small: StaticImageData;
  large: StaticImageData;
  /** Opens the dialog (ServiceDialog wires it up); falls back to the quote link without scripting. */
  moreLabel: string;
  quoteHref: string;
  quoteLabel: string;
  newTabHint: string;
};

const PANEL = 'bg-void/1 backdrop-blur-md';

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
        sizes="(min-width: 768px) 33vw, 50vw"
        alt=""
        width={large.width}
        height={large.height}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 -z-10 size-full object-cover object-bottom"
      />
      {/* The rows carry the 40/60 split: the panel's content sets the card's height and the
          photo keeps two thirds of that above it, at any width or text length. */}
      <div aria-hidden="true" />
      <div
        className={`col-start-1 row-start-2 flex flex-col justify-center gap-6 folder-edge folder-cut p-18 pt-30 ${PANEL}`}
      >
        <h3 className="text-nav-label font-semibold md:text-heading-2xs md:font-normal">{name}</h3>
        {/* Clamped: two columns on a phone leave no room for the whole thing. The dialog has it. */}
        <p className="line-clamp-2 text-caption text-silver-mist md:line-clamp-3 md:text-body">
          {body}
        </p>
        <button
          type="button"
          data-service-more
          className="mt-12 inline-flex min-h-8 items-center gap-6 self-start rounded-3xl border border-ignition-gold px-12 py-6 text-caption font-semibold tracking-label text-ignition-gold uppercase hover:bg-ignition-gold/10"
        >
          {moreLabel}
          <ArrowRightIcon className="size-12" />
        </button>
        {/* Without scripting the dialog can't open: offer the quote the button would have led to. */}
        <a
          data-service-fallback
          href={quoteHref}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="mt-12 hidden min-h-8 items-center gap-6 self-start rounded-3xl border border-ignition-gold px-12 py-6 text-caption font-semibold tracking-label text-ignition-gold uppercase"
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
