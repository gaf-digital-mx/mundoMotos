type Source = {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  /**
   * How wide the photo is *painted*, not how wide its box is. `object-fit: cover` on a frame
   * shaped differently from the photo scales it past the box and crops the rest, so a slot
   * described as `100vw` picks a file that then has to be enlarged. Measured for the wide cut:
   * 189vw at a 1280px window, 126vw at 1920.
   */
  sizes: string;
};

type Props = {
  /** Already-built responsive sources: the photo is decorative, so it carries no alt text. */
  photo: Source;
  /** A portrait cut of the same scene for phones, where a wide frame shows only a sliver. */
  mobile?: Source;
};

/** Below the `md` breakpoint, where the layout is one column. */
const PHONE = '(width < 48rem)';

/**
 * A photo behind a whole section, running the full width of the screen while the copy above it
 * stays inside the page container. Drifts against the scroll where the browser can do it without
 * script (globals.css owns the geometry and the veil that keeps the copy readable).
 *
 * Two things the caller owns, both of which fail quietly:
 *
 * - **The parent must establish a stacking context** (`relative isolate`). This layer paints at
 *   `z-index: -1`, which without one puts it behind the opaque page background rather than behind
 *   the section's own copy, and the photo simply never appears.
 * - **It must sit outside every `[data-enter]` block.** An entrance translates its whole subtree,
 *   and a layer drifting inside a frame that is itself moving fights it. An E2E guard asserts it.
 *
 * A section in the middle of the page also wants `[--drift-end:100%]` on that parent: the default
 * is tuned for the closing section, which the document ends before it can finish scrolling past.
 */
export function SectionBackground({ photo, mobile }: Props) {
  return (
    <div data-section-bg aria-hidden="true">
      <picture>
        {mobile ? <source media={PHONE} srcSet={mobile.srcSet} sizes={mobile.sizes} /> : null}
        <img
          data-parallax
          src={photo.src}
          srcSet={photo.srcSet}
          sizes={photo.sizes}
          alt=""
          width={photo.width}
          height={photo.height}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </picture>
    </div>
  );
}
