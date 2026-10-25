// @ts-nocheck -- Integration note, not the figure's own code: this drawing was built outside
// this app against the kit and is copied in as its author wrote it. It predates this project's
// `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and patching the index reads
// would turn every refresh into a merge. Its exported types still reach callers.
import * as React from "react";
import { Dots, FaceText, Line, Solid } from "../../../../shared/iso/react/draw";
import { BASE_ART, FALLBACK_ART, INSIDE_ART, TUB_ART, RIM_ART, STACK_ART, STAND_ART, TREAD_ART, UNDER_ART } from "./geometry";
import { HOSE } from "./frame";
import { circlePath } from "./shapes";

const WHEEL_HALO = circlePath(104, 0, 96);
import { LlantaLive } from "./live";

const BASE = (
  <g key="base">
    <path className="iso-halo" d={BASE_ART.halo} />
    {BASE_ART.feet.map((parts, index) => (
      <g key={index}>
        {parts.map((paths, part) => (
          <Solid key={part} paths={paths} tone={part ? "mid" : "lo"} crease="faint" />
        ))}
      </g>
    ))}
    <Solid paths={BASE_ART.slab} tone="mid" crease="faint" inner={<Line d={BASE_ART.edgeSeam} tone="faint" />} />
    <Line d={BASE_ART.groove} tone="lo" />
    <Line d={BASE_ART.screwRings} tone="lo" />
    <Dots points={BASE_ART.screws} size={0.55} tone="mid" />
    <Solid paths={BASE_ART.strip} tone="lo" crease="none" />
    <Line d={BASE_ART.stripMinor} tone="lo" />
    <Line d={BASE_ART.stripMajor} tone="mid" />
    <Dots points={BASE_ART.stripScrews} size={0.42} tone="mid" />
    <Solid paths={BASE_ART.label} tone="lo" crease="none" />
    <Line d={BASE_ART.labelLine} tone="faint" />
    <Line d={BASE_ART.labelRules} tone="lo" free />
    <Dots points={BASE_ART.labelScrews} size={0.45} tone="mid" />
    <FaceText transform={BASE_ART.labelText} size={4.4} tone="mid">
      17
    </FaceText>
  </g>
);

const TUB = (
  <g key="tub">
    <path className="iso-halo" d={TUB_ART.halo} />
    <Solid paths={TUB_ART.body} tone="mid" crease="faint" inner={<Line d={TUB_ART.bands} tone="faint" />} />
    <Solid paths={TUB_ART.lip} tone="mid" crease="faint" />
    <path className="ll-paste" d={TUB_ART.pasteFill} />
    <Line d={TUB_ART.paste} tone="lo" />
    <Solid paths={TUB_ART.ferrule} tone="mid" crease="faint" />
    <Solid paths={TUB_ART.handle} tone="hi" crease="lo" inner={<Line d={TUB_ART.hang} tone="lo" />} />
  </g>
);

const WET = <path key="wet" className="ll-wet" d={FALLBACK_ART.wet} fillRule="evenodd" />;
const BUBBLES = <path key="bubbles" className="iso-line ll-bubbles" data-tone="lo" d={FALLBACK_ART.bubbles} />;

const HALO = <path key="halo" className="iso-halo ll-wheel-halo" d={WHEEL_HALO} />;

const STAND = (
  <g key="stand">
    <Solid paths={STAND_ART.foot} tone="lo" crease="faint" />
    <Dots points={STAND_ART.footBolts} size={0.5} tone="mid" />
    <Solid paths={STAND_ART.column} tone="mid" crease="faint" inner={<Line d={STAND_ART.columnSeams} tone="faint" />} />
    <Solid paths={STAND_ART.gusset} tone="mid" crease="faint" />
    <Solid paths={STAND_ART.stop} tone="lo" crease="faint" />
    <Solid paths={STAND_ART.pinHead} tone="mid" crease="faint" />
    <Solid paths={STAND_ART.cheekBack} tone="mid" crease="faint" />
  </g>
);

const STAND_FRONT = (
  <g key="stand-front">
    <Solid paths={STAND_ART.cheekFront} tone="mid" crease="faint" />
    <Solid paths={STAND_ART.pin} tone="mid" crease="none" />
    <Solid paths={STAND_ART.pinNut} tone="mid" crease="faint" />
  </g>
);

const underArt = (key: string) => (
  <g key={key}>
    <Solid paths={UNDER_ART.flange} tone="lo" crease="faint" />
    <Dots points={UNDER_ART.flangeBolts} size={0.45} tone="mid" />
    <Solid paths={UNDER_ART.column} tone="mid" crease="none" />
    <Solid paths={UNDER_ART.collar} tone="mid" crease="faint" />
    {UNDER_ART.arms.map((arm, index) => (
      <g key={index}>
        <Solid paths={arm.arm} tone="mid" crease="faint" />
        <Solid paths={arm.tip} tone="mid" crease="faint" />
        <Solid paths={arm.pad} tone="lo" crease="faint" />
        <Dots points={[arm.bolt]} size={0.45} tone="mid" />
      </g>
    ))}
  </g>
);

const UNDER = underArt("under");

const RIM = (
  <g key="rim">
    <Solid paths={RIM_ART.outside} tone="hi" crease="lo" inner={<Line d={RIM_ART.seams} tone="faint" />} />
  </g>
);

const spoke = (spoke: (typeof INSIDE_ART.farSpokes)[number], index: number) => (
  <Solid key={index} paths={spoke.paths} tone="hi" crease="lo" inner={<Line d={spoke.rib} tone="faint" />} />
);

const INSIDE_BACK = (
  <g key="inside-back">
    <path className="ll-cavity" d={INSIDE_ART.lip} />
    <path className="ll-wall" data-band="lip" d={INSIDE_ART.wall} />
    <path className="ll-wall" data-band="slope" d={INSIDE_ART.slopeHi} />
    <path className="ll-wall" data-band="well" d={INSIDE_ART.well} />
    <path className="ll-wall" data-band="slope" d={INSIDE_ART.slopeLo} />
    <path className="ll-wall" data-band="lip" d={INSIDE_ART.wallLo} />
    <Line d={INSIDE_ART.edges} tone="lo" />
  </g>
);

const THROUGH = (
  <g key="through">
    <path className="ll-floor" d={INSIDE_ART.through} />
    <Line d={INSIDE_ART.floorGroove} tone="lo" />
    {underArt("under-through")}
  </g>
);

const INSIDE_FRONT = (
  <g key="inside-front">
    <Line d={INSIDE_ART.through} tone="lo" />
    {INSIDE_ART.farSpokes.map(spoke)}
    <Solid paths={INSIDE_ART.hub} tone="hi" crease="lo" inner={<Line d={INSIDE_ART.hubSeams} tone="faint" />} />
    <Line d={INSIDE_ART.seal} tone="lo" />
    <Dots points={INSIDE_ART.hubBolts} size={0.6} tone="mid" />
    {INSIDE_ART.nearSpokes.map(spoke)}
    <Solid paths={INSIDE_ART.valveBody} tone="lo" crease="faint" />
    <Solid paths={INSIDE_ART.chuck} tone="mid" crease="faint" inner={<Line d={INSIDE_ART.chuckBand} tone="faint" />} />
  </g>
);

const HOSE_ART = <g key="hose" className="ll-hose" dangerouslySetInnerHTML={{ __html: HOSE }} />;

const STACK = (
  <g key="stack">
    <Solid paths={STACK_ART.cone} tone="mid" crease="faint" />
    <Solid paths={STACK_ART.nut} tone="mid" crease="faint" inner={<Line d={STACK_ART.nutBand} tone="faint" />} />
    <Line d={STACK_ART.nutKnurl} tone="lo" />
    {STACK_ART.wings.map((paths, index) => (
      <Solid key={index} paths={paths} tone="mid" crease="faint" />
    ))}
    <Solid paths={STACK_ART.post} tone="mid" crease="none" inner={<Line d={STACK_ART.postRing} tone="faint" />} />
    <Solid paths={STACK_ART.fitting} tone="mid" crease="faint" />
    <Solid paths={STACK_ART.fittingNut} tone="mid" crease="faint" />
    <Solid paths={STACK_ART.collar} tone="mid" crease="faint" />
    <Solid paths={STACK_ART.puck} tone="mid" crease="faint" inner={<Line d={STACK_ART.band} tone="faint" />} />
    <Line d={STACK_ART.knurl} tone="lo" />
    <Line d={STACK_ART.bezel} tone="lo" />
    <Line d={STACK_ART.face} tone="faint" />
    <Line d={STACK_ART.minor} tone="lo" />
    <Line d={STACK_ART.major} tone="mid" />
    <Line d={STACK_ART.spec} tone="hi" />
    <Dots points={[STACK_ART.limit]} size={0.6} tone="hi" />
    <Solid paths={STACK_ART.bleed} tone="mid" crease="faint" />
    <Solid paths={STACK_ART.bleedCap} tone="hi" crease="faint" />
  </g>
);

const GAUGE_HUB = <Line key="gauge-hub" d={STACK_ART.hub} tone="mid" />;

const fadedGrooves = (list: Array<{ d: string; alpha: number }>) => {
  const groups = new Map<number, string>();
  for (const { d, alpha } of list) groups.set(alpha, (groups.get(alpha) ?? "") + d);
  return [...groups.entries()].map(([alpha, d]) => (
    <g key={alpha} opacity={alpha}>
      <path className="iso-line ll-groove" data-tone="lo" d={d} />
    </g>
  ));
};

const TREAD_NEW = <g key="tread-new">{fadedGrooves(TREAD_ART.fresh)}</g>;
const TREAD_WORN = <g key="tread-worn">{fadedGrooves(TREAD_ART.worn)}</g>;
const BALANCE_DOT = <circle key="dot" className="ll-dot" cx={TREAD_ART.dot[0]} cy={TREAD_ART.dot[1]} r={1.6} />;

const LABEL =
  "Una desmontadora manual de llantas con una rueda trasera de moto, rin 5,50 × 17 y llanta 180/55 ZR17, acostada sobre su poste central. Arriba del poste, un manómetro conectado a la válvula; a la derecha, el rompedor de talón con su zapata; a la izquierda, el desmontador. El ciclo: desinflar, despegar el talón al canal central, lubricar, sacar el talón sobre la pestaña, cambiar la llanta e inflar hasta que el talón salta a su asiento y la espuma deja de burbujear.";

export function LlantaArt() {
  return (
    <LlantaLive
      label={LABEL}
      base={BASE}
      halo={HALO}
      tub={TUB}
      wet={WET}
      bubbles={BUBBLES}
      stand={STAND}
      standFront={STAND_FRONT}
      under={UNDER}
      rim={RIM}
      insideBack={INSIDE_BACK}
      through={THROUGH}
      insideFront={INSIDE_FRONT}
      hose={HOSE_ART}
      stack={STACK}
      gaugeHub={GAUGE_HUB}
      treadNew={TREAD_NEW}
      treadWorn={TREAD_WORN}
      dot={BALANCE_DOT}
    />
  );
}
