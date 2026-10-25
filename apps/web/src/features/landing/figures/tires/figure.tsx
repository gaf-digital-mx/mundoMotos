// @ts-nocheck -- Integration note, not the figure's own code: this drawing was built outside
// this app against the kit and is copied in as its author wrote it. It predates this project's
// `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and patching the index reads
// would turn every refresh into a merge. Its exported types still reach callers.
// Server component: the card, and the art the live wrapper moves inside it. Adapted to the
// pattern the other figures in this folder follow (see src/shared/iso/README.md): dark, no
// figure number, no caption, action controls in the plate and numbered part chips under it.
import { LlantaArt } from "./art";
import "../../../../shared/iso/iso.css";
import "./tires.css";

export function TiresFigure() {
  return (
    <div className="iso" data-theme="dark">
      <figure className="iso-figure ll">
        <LlantaArt />
      </figure>
    </div>
  );
}
