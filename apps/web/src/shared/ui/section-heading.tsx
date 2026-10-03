type Props = {
  id: string;
  eyebrow: string;
  title: string;
  body?: string;
};

/** Section headline block from the design system: amber label, large weight-400 title, light body. */
export function SectionHeading({ id, eyebrow, title, body }: Props) {
  return (
    <header className="flex max-w-[720px] flex-col gap-18">
      <p className="text-nav-label font-semibold tracking-label text-ignition-gold uppercase">
        {eyebrow}
      </p>
      <h2 id={id} className="text-heading-sm font-normal tracking-display md:text-heading">
        {title}
      </h2>
      {body ? <p className="text-silver-mist">{body}</p> : null}
    </header>
  );
}
