import { Dots, Line, Solid, Wire } from '@/shared/iso/react/draw';

import {
  AIRBOX_ART,
  BASE_ART,
  BOOT_ART,
  CARB_ART,
  CHAMBER_ART,
  COIL_ART,
  DIAL_ART,
  HEAD_ART,
  KNOB_ART,
  LEAD_AT,
  MANIFOLD_ART,
  PLUG_ART,
} from './geometry';

/**
 * The parts that never move, as element constants in painter's order within each assembly.
 * Every root carries a key: these travel as element props and React cannot key a lazy child.
 */

export const BASE = (
  <g key="base">
    <path className="iso-halo" d={BASE_ART.halo} />
    {BASE_ART.feet.map((parts, foot) => (
      <g key={foot}>
        {parts.map((paths, part) => (
          <Solid key={part} paths={paths} tone={part ? 'mid' : 'lo'} />
        ))}
      </g>
    ))}
    <Solid paths={BASE_ART.slab} tone="mid" />
    <Line d={BASE_ART.groove} tone="lo" />
    <Line d={BASE_ART.screwRings} tone="lo" />
    <Dots points={BASE_ART.screws} size={0.55} tone="mid" />
    <Line d={BASE_ART.ruleBase} tone="faint" />
    <Line d={BASE_ART.ruleMinor} tone="lo" />
    <Line d={BASE_ART.ruleMajor} tone="mid" />
    <Solid paths={BASE_ART.plate} tone="lo" crease="none" />
    <Line d={BASE_ART.plateLine} tone="faint" />
    <Line d={BASE_ART.plateRule} tone="lo" />
    <Dots points={BASE_ART.plateScrews} size={0.45} tone="mid" />
  </g>
);

export const AIRBOX = (
  <g key="airbox">
    <Solid paths={AIRBOX_ART.snorkel} tone="mid" />
    <Line d={AIRBOX_ART.mouth} tone="lo" />
    <Solid paths={AIRBOX_ART.box} tone="mid" inner={<Line d={AIRBOX_ART.lid} tone="faint" />} />
    <Line d={AIRBOX_ART.foot} tone="faint" />
    <Line d={AIRBOX_ART.lidRings} tone="lo" />
    <Dots points={AIRBOX_ART.lidScrews} size={0.5} tone="mid" />
    <Line d={AIRBOX_ART.window} tone="lo" />
    <Line d={AIRBOX_ART.recess} tone="faint" />
    <Line d={AIRBOX_ART.pleats} tone="lo" />
  </g>
);

export const BOOT = (
  <g key="boot">
    <Solid paths={BOOT_ART.duct} tone="mid" />
    {BOOT_ART.bands.map((paths, band) => (
      <Solid key={band} paths={paths} tone="lo" crease="faint" />
    ))}
    {BOOT_ART.clamps.map((paths, clamp) => (
      <Solid key={clamp} paths={paths} tone="hi" crease="faint" />
    ))}
    {BOOT_ART.bosses.map((paths, boss) => (
      <Solid key={boss} paths={paths} tone="mid" crease="faint" />
    ))}
    <Dots points={BOOT_ART.clampScrews} size={0.6} tone="hi" />
  </g>
);

export const CARB = (
  <g key="carb">
    <Solid paths={CARB_ART.plinth} tone="lo" crease="none" />
    <Solid paths={CARB_ART.bowl} tone="mid" inner={<Line d={CARB_ART.bowlBand} tone="faint" />} />
    <Line d={CARB_ART.drain} tone="lo" />
    <Solid paths={CARB_ART.body} tone="hi" inner={<Line d={CARB_ART.bodySeam} tone="faint" />} />
    <Line d={CARB_ART.outlet} tone="lo" />
    <Solid paths={CARB_ART.mixtureBoss} tone="mid" crease="faint" />
    <Dots points={CARB_ART.mixtureScrew} size={0.6} tone="hi" />
    <Solid paths={CARB_ART.guide} tone="mid" crease="faint" />
    <Solid paths={CARB_ART.cap} tone="mid" />
    <Line d={CARB_ART.capRing} tone="faint" />
    <Dots points={CARB_ART.capScrews} size={0.5} tone="mid" />
  </g>
);

/** The slide's stem, the one part the throttle moves. Built at rest and translated. */
export const STEM = (
  <g key="stem">
    <Solid paths={CARB_ART.stem} tone="hi" crease="none" />
    <Line d={CARB_ART.stemRing} tone="lo" />
  </g>
);

export const MANIFOLD = (
  <g key="manifold">
    <Solid paths={MANIFOLD_ART.duct} tone="mid" />
    {MANIFOLD_ART.flanges.map((paths, flange) => (
      <Solid key={flange} paths={paths} tone="mid" crease="faint" />
    ))}
    <Dots points={MANIFOLD_ART.studs} size={0.5} tone="mid" />
  </g>
);

export const HEAD = (
  <g key="head">
    {HEAD_ART.fins.map((paths, fin) => (
      <g key={fin}>
        <Solid paths={paths} tone="lo" crease="faint" />
        <Solid paths={HEAD_ART.spacers[fin] ?? paths} tone="mid" crease="none" />
      </g>
    ))}
    <Solid paths={HEAD_ART.cover} tone="mid" inner={<Line d={HEAD_ART.coverSeam} tone="faint" />} />
    <Line d={HEAD_ART.boltRings} tone="lo" />
    <Dots points={HEAD_ART.coverBolts} size={0.55} tone="mid" />
  </g>
);

/** The window and what it looks in on, drawn over the head's near face. */
export const CHAMBER = (
  <g key="chamber">
    <path className="iso-fill" d={HEAD_ART.hole} />
    <Line d={HEAD_ART.wall} tone="faint" />
    <Line d={HEAD_ART.window} tone="lo" />
    <Line d={CHAMBER_ART.centre} tone="hi" />
    <Line d={CHAMBER_ART.strap} tone="hi" />
  </g>
);

export const PLUG = (
  <g key="plug">
    <Solid paths={PLUG_ART.washer} tone="lo" crease="none" />
    <Solid paths={PLUG_ART.hex} tone="mid" inner={<Line d={PLUG_ART.hexSeam} tone="faint" />} />
    <Solid paths={PLUG_ART.body} tone="mid" />
    <Solid paths={PLUG_ART.insulator} tone="hi" inner={<Line d={PLUG_ART.ribs} tone="faint" />} />
    <Solid paths={PLUG_ART.terminal} tone="mid" />
    <Solid paths={PLUG_ART.cap} tone="lo" inner={<Line d={PLUG_ART.capRibs} tone="faint" />} />
  </g>
);

export const COIL = (
  <g key="coil">
    <Solid
      paths={COIL_ART.body}
      tone="mid"
      inner={<Line d={COIL_ART.laminations} tone="faint" />}
    />
    <Dots points={COIL_ART.screws} size={0.5} tone="mid" />
    <Solid paths={COIL_ART.post} tone="lo" crease="faint" />
  </g>
);

/** The high-tension lead: it ends on the coil's post at one end and the plug's cap at the other. */
export const LEAD = (
  <Wire key="lead" from={LEAD_AT.from} to={LEAD_AT.to} via={LEAD_AT.via} tone="mid" size={1.4} />
);

export const DIAL = (
  <g key="dial">
    <Solid paths={DIAL_ART.stand} tone="lo" />
    <Line d={DIAL_ART.standRing} tone="faint" />
    <Solid paths={DIAL_ART.puck} tone="mid" inner={<Line d={DIAL_ART.knurl} tone="faint" />} />
    <Line d={DIAL_ART.bezel} tone="lo" />
    <Line d={DIAL_ART.face} tone="faint" />
    <Line d={DIAL_ART.minor} tone="lo" />
    <Line d={DIAL_ART.major} tone="mid" />
  </g>
);

export const DIAL_HUB = (
  <g key="hub">
    <Solid paths={DIAL_ART.hub} tone="hi" crease="none" />
  </g>
);

export const KNOB = (
  <g key="knob">
    <Solid paths={KNOB_ART.bracket} tone="lo" crease="faint" />
    <Dots points={KNOB_ART.bracketScrews} size={0.45} tone="mid" />
    <Solid paths={KNOB_ART.post} tone="mid" crease="none" />
    <Solid paths={KNOB_ART.collar} tone="lo" crease="faint" />
    <Line d={KNOB_ART.stops} tone="mid" />
    <Solid paths={KNOB_ART.knob} tone="hi" inner={<Line d={KNOB_ART.knurl} tone="faint" />} />
    <Line d={KNOB_ART.crown} tone="lo" />
  </g>
);
