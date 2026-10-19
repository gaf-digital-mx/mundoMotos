type Props = {
  /** Already-built responsive sources: the photo is decorative, so it carries no alt text. */
  photo: { src: string; srcSet: string; width: number; height: number };
};

/**
 * A photo behind a whole section, running the full width of the screen while the copy above it
 * stays inside the page container. Drifts against the scroll where the browser can do it without
 * script (globals.css owns the geometry and the veil that keeps the copy readable).
 *
 * It must be rendered outside every `[data-enter]` block: an entrance translates its whole
 * subtree, and a layer drifting inside a frame that is itself moving fights it.
 */
export function SectionBackground({ photo }: Props) {
  return (
    <div data-section-bg aria-hidden="true">
      <img
        data-parallax
        src={photo.src}
        srcSet={photo.srcSet}
        sizes="100vw"
        alt=""
        width={photo.width}
        height={photo.height}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </div>
  );
}
