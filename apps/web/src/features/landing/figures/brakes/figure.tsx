// Server component: the drawing, precomputed by build.mjs, inside the live wrapper that moves
// it. The figure carries its own words, as the figures in this folder do (see the note in
// src/shared/iso/README.md).
import art from './art.generated.json';
import { BrakeLive } from './live';
import { PARTS } from './model.mjs';

import '../../../../shared/iso/iso.css';
import './brakes.css';

type Item = { piece: string; name: string; svg: string; move: [number, number] };

const items = art.items as Item[];
const VIEW = `0 0 ${art.W} ${art.H}`;
const BODY = items
  .map((item) => {
    const [dx, dy] = item.move;
    const slide = dx || dy ? ` data-dx="${dx}" data-dy="${dy}"` : '';
    return `<g class="it" data-piece="${item.piece}" data-name="${item.name}"${slide}>${item.svg}</g>`;
  })
  .join('');

const LABEL =
  'Freno de disco de moto sobre un banco: el disco de 240 mm atornillado a su maza, la mordaza de dos pistones montada en su brazo, y entre ellos las dos balatas. Puede desensamblarse en sus tres piezas.';

export function BrakesFigure() {
  return (
    <div className="iso" data-theme="dark">
      <figure className="iso-figure bk">
        <BrakeLive data={art.data}>
          <div className="iso-plate">
            <div className="iso-plate-corners" aria-hidden="true">
              <span className="iso-plate-corner" data-corner="title">
                Freno de disco · despiece
              </span>
              <span className="iso-plate-corner" data-corner="readout" data-readout="">
                ensamblado · disco de Ø240
              </span>
            </div>
            <div
              className="bk-stage"
              data-stage=""
              role="group"
              aria-label="Freno de disco. El botón Desensamblar lo separa en sus tres piezas y Ensamblar lo vuelve a armar; cada pieza se resalta con su botón."
            >
              <svg
                className="iso-svg"
                viewBox={VIEW}
                role="img"
                aria-label={LABEL}
                focusable="false"
              >
                <g dangerouslySetInnerHTML={{ __html: art.halo }} />
                <g dangerouslySetInnerHTML={{ __html: BODY }} />
              </svg>
            </div>
            <div className="bk-controls">
              <button type="button" className="bk-button" data-apart="">
                <span data-label="">Desensamblar</span>
              </button>
            </div>
            <span className="bk-live-region" aria-live="polite" data-live-region="" />
          </div>
          <figcaption className="iso-legend">
            <span className="bk-parts">
              {PARTS.map((part, index) => (
                <button type="button" className="bk-part" data-part={part.id} key={part.id}>
                  <span className="bk-num">{String(index + 1).padStart(2, '0')}</span>
                  {part.name}
                </button>
              ))}
            </span>
          </figcaption>
        </BrakeLive>
      </figure>
    </div>
  );
}
