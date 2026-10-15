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

/**
 * One workshop service: a photo with the copy panel overlapping its lower edge. The photo is
 * decorative — the name is right below it — so it carries no alternative text.
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
      className="flex flex-col overflow-hidden rounded-3xl bg-bone-white/5"
    >
      <img
        src={large.src}
        srcSet={`${small.src} 320w, ${large.src} 512w`}
        sizes="(min-width: 768px) 33vw, 50vw"
        alt=""
        width={large.width}
        height={large.height}
        loading="lazy"
        decoding="async"
        className="aspect-[16/10] w-full object-cover"
      />
      <div className="-mt-24 flex flex-1 flex-col gap-6 rounded-t-3xl bg-void/95 p-18 pb-24 backdrop-blur-sm">
        <h3 className="text-nav-label font-semibold md:text-heading-2xs md:font-normal">{name}</h3>
        {/* Clamped: two columns on a phone leave no room for five lines. The dialog has it all. */}
        <p className="line-clamp-3 text-caption text-silver-mist md:text-body">{body}</p>
        <button
          type="button"
          data-service-more
          className="mt-auto min-h-11 self-start rounded-3xl border border-ignition-gold px-18 py-6 text-caption font-semibold tracking-label text-ignition-gold uppercase hover:bg-ignition-gold/10"
        >
          {moreLabel}
        </button>
        {/* Without scripting the dialog can't open: offer the quote the button would have led to. */}
        <a
          data-service-fallback
          href={quoteHref}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="mt-auto hidden min-h-11 items-center self-start rounded-3xl border border-ignition-gold px-18 py-6 text-caption font-semibold tracking-label text-ignition-gold uppercase"
        >
          {quoteLabel}
          <span className="sr-only">
            {' '}
            {name} {newTabHint}
          </span>
        </a>
      </div>
    </article>
  );
}
