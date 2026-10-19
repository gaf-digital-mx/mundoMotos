import type { ReactNode } from 'react';

type Props = {
  id: string;
  eyebrow: string;
  title: string;
  /** A node, so a section can put links inside its own copy (next-intl rich text). */
  body?: ReactNode;
};

/**
 * Section headline block from the design system: amber label, large weight-400 title, light body.
 * Every one of them rises in as it scrolls into view (`[data-enter]`, see globals.css).
 */
export function SectionHeading({ id, eyebrow, title, body }: Props) {
  return (
    <header data-enter className="flex max-w-[760px] flex-col gap-18">
      <p className="text-nav-label font-semibold tracking-label text-ignition-gold uppercase">
        {eyebrow}
      </p>
      <h2 id={id} className="text-heading-sm font-normal tracking-display md:text-heading">
        {title}
      </h2>
      {/* Silver on the sections that sit on black, where it reads 4.57:1. A section standing on
          a photograph raises `--section-body` to white instead: silver has nothing left to give
          once there is a picture underneath it. */}
      {body === undefined ? null : (
        <p className="text-[color:var(--section-body,var(--color-silver-mist))]">{body}</p>
      )}
    </header>
  );
}
