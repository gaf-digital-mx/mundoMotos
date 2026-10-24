// Server component: the static drawing (precomputed by build.mjs), split into the layers the
// gas shader sits between, plus the live wrapper and the controls.
import art from "./art.generated.json";
import { PARTS } from "./model.mjs";
import { EngineLive, type EngineData } from "./live";
// Integration glue, not the figure's own: its home page loaded the kit's stylesheet from the
// app layout. Here the figure is fetched on demand, so it brings the stylesheet with it.
import "../../../../shared/iso/iso.css";
import "./engine.css";

interface Item {
  svg: string;
  piece: string;
  key: number;
  name: string;
  front: boolean;
}

const items = art.items as Item[];
const node = (item: Item) => `<g class="it" data-piece="${item.piece}" data-name="${item.name}" data-k="${item.key}">${item.svg}</g>`;
const BACK = items.filter((item) => !item.front).map(node).join("");
const FRONT = items.filter((item) => item.front).map(node).join("");
const VIEW = `0 0 ${art.W} ${art.H}`;
const LABEL =
  "Motor monocilíndrico de cuatro tiempos en corte, sobre un banco: cárter con el cigüeñal, biela, pistón, cilindro con aletas, culata con la cámara de combustión, válvula de admisión y de escape con sus resortes, bujía, carburador con filtro y tubo de escape. Puede funcionar, mostrando la mezcla, la chispa, la llama y los gases, o desensamblarse en sus siete piezas.";

export function Engine4TFigure() {
  return (
    <div className="iso" data-theme="dark">
    <figure className="iso-figure e4">
      <EngineLive data={art.data as unknown as EngineData}>
        <div className="iso-plate">
          <div className="iso-plate-corners" aria-hidden="true">
            <span className="iso-plate-corner" data-corner="title">Motor de 4 tiempos · en corte</span>
            <span className="iso-plate-corner" data-corner="readout" data-readout="">ensamblado · parado en PMS</span>
          </div>
          <div
            className="e4-stage"
            tabIndex={0}
            role="group"
            aria-label="Motor de cuatro tiempos en corte. Espacio o el botón Arrancar lo hace funcionar; D o el botón Desensamblar lo separa en piezas, E lo vuelve a ensamblar; 1 a 7 resaltan cada pieza."
          >
            <svg className="iso-svg e4-back" viewBox={VIEW} role="img" aria-label={LABEL} focusable="false">
              <g className="e4-cam">
                <g dangerouslySetInnerHTML={{ __html: art.back }} />
                <g className="e4-sorted" dangerouslySetInnerHTML={{ __html: BACK }} />
              </g>
            </svg>
            <canvas className="e4-layer e4-gas" aria-hidden="true" />
            <svg className="iso-svg e4-layer e4-front" viewBox={VIEW} aria-hidden="true" focusable="false">
              <g className="e4-cam" dangerouslySetInnerHTML={{ __html: FRONT }} />
            </svg>
          </div>
          <div className="e4-controls">
            <button type="button" className="e4-button" data-run="" data-state="off">
              <span className="e4-lamp" aria-hidden="true" />
              <span data-label="">Arrancar</span>
            </button>
            <button type="button" className="e4-button" data-apart="">
              <span data-label="">Desensamblar</span>
            </button>
          </div>
          <span className="e4-live-region" aria-live="polite" data-live-region="" />
        </div>
        <figcaption className="iso-legend">
          <span className="e4-parts">
            {PARTS.map((part, index) => (
              <button type="button" className="e4-part" data-part={part.id} key={part.id}>
                <span className="e4-num">{String(index + 1).padStart(2, "0")}</span>
                {part.name}
              </button>
            ))}
          </span>
        </figcaption>
      </EngineLive>
    </figure>
    </div>
  );
}
