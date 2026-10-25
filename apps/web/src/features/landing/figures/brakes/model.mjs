// The real numbers of a 150-class motorcycle front brake, shared by the build and the figure.
// Everything the drawing says is measured from here: a 240 mm disc, 4.2 mm thick, a two-piston
// caliper of 32 mm pistons, and pads with 8 mm of friction on a 4 mm backing plate.

export const DISC = {
  r: 120, // Ø240 outer
  track: 78, // where the friction track starts
  carrier: 52, // the carrier that bolts to the hub
  half: 2.1, // half of the 4.2 mm thickness
  holes: 10,
  holeAt: 100,
  holeR: 3.4,
};

export const HUB = { r: 52, half: 7, bolts: 5, boltAt: 38, boltR: 2.4 };

/** The pad: a sector of the track, 8 mm of friction on a 4 mm plate. */
export const PAD = { rIn: 82, rOut: 116, span: 19, friction: 8, backing: 4, gap: 0.3 };

/** The caliper straddles the disc this far round from the top, on the rising side. */
export const CALIPER = { angle: 46, piston: 16, pistons: 2, half: 30 };

export const AXLE = { z: 168, r: 9 };

/**
 * How far each assembly travels when the figure comes apart, in millimetres. The pads leave the
 * way they are changed — up out of the throat and sideways off the disc — and the caliper is
 * clear of their path before they start, which is what the stagger below buys.
 */
export const LIFT = { caliper: 158, padInner: 92, padOuter: 136, padDrop: 92, disc: 60 };

/** The order they leave in: the caliper first, then the pads it held, then the disc. */
export const STAGGER = ['caliper', 'pads', 'disc'];

/**
 * The springs that carry them. The stagger is long on purpose: each assembly is clear of the
 * next before it starts, which is both how the job is done and what keeps the paths apart.
 */
export const SPRING = { stagger: 0.68, stiffness: 46, damping: 12.6, substeps: 4 };

/** The three pieces the drawing names, with what each one is worth knowing. */
export const PARTS = [
  { id: 'disc', name: 'Disco', note: 'disco · Ø240 × 4.2 mm' },
  { id: 'caliper', name: 'Mordaza', note: 'mordaza · 2 pistones de Ø32' },
  { id: 'pads', name: 'Balatas', note: 'balatas · 8 mm de material nuevo' },
];

export const READOUT = {
  rest: 'ensamblado · disco de Ø240',
  apart: 'desensamblado · 3 piezas',
};
