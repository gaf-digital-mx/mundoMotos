import {
  corners,
  cylinder,
  extrude,
  haloOf,
  insetPlan,
  joinPaths,
  knurl,
  lineOnTop,
  onTop,
  pathOf,
  planOutline,
  pointsAt,
  radialTicks,
  ring,
  segment,
  sideArc,
  sideRing,
  sideSeam,
  slabOf,
  topMatrix,
  topTicks,
  type Flat,
  type Plan,
  type Plane,
  type Point3,
} from '@/shared/iso/iso-kit';

import { DIAL_FROM, DIAL_SPAN, P, at } from './view';
import * as V from './view';

const box = (plan: Plan, z: number, height: number, steps = 6, bevel = 0) =>
  slabOf(plan, z, height, P, steps, bevel);
const puck = (centre: Plane, radius: number, z: number, height: number, steps = 32, bevel = 0) =>
  cylinder(centre[0], centre[1], radius, z, height, P, steps, bevel);
const line = (from: Point3, to: Point3) => segment(from, to, P);
const circleOn = (centre: Plane, radius: number, z: number, steps = 40) =>
  ring(centre[0], centre[1], radius, z, P, steps);

/** A closed rectangle drawn on a face of constant y, for recesses and windows. */
const faceRect = (y: number, x0: number, x1: number, z0: number, z1: number) =>
  pathOf(
    pointsAt(
      [
        [x0, y, z0],
        [x1, y, z0],
        [x1, y, z1],
        [x0, y, z1],
      ],
      P,
    ),
    true,
  );

const hexRing = (centre: Plane, radius: number): Plane[] =>
  Array.from({ length: 6 }, (_, corner) => {
    const angle = (corner / 6) * Math.PI * 2 + Math.PI / 6;
    return [centre[0] + radius * Math.cos(angle), centre[1] + radius * Math.sin(angle)] as Plane;
  });

const BOWL: Plane = [V.BOWL[0], V.BOWL[1]];
const DIAL: Plane = [V.DIAL[0], V.DIAL[1]];
const KNOB: Plane = [V.KNOB[0], V.KNOB[1]];
const PLUG: Plane = [V.PLUG[0], V.PLUG[1]];

// ── Base ────────────────────────────────────────────────────────────────────────────────────
const FEET = corners(V.BASE, 20);
const BASE_SCREWS = corners(V.BASE, 9);
const RULE_EDGE = V.BASE.y + V.BASE.d - 8;
const RULE = topTicks(-150, 150, 10, 5, RULE_EDGE, 0, [3, 5.5], P, 'x');

export const BASE_ART = {
  halo: haloOf(V.BASE, -V.BASE_H - V.FOOT_H, V.BASE_H, P),
  feet: FEET.map(([x, y]) => [
    puck([x, y], 7, -V.BASE_H - V.FOOT_H, 1.6, 20),
    puck([x, y], 5.5, -V.BASE_H - V.FOOT_H + 1.6, V.FOOT_H - 1.6, 20),
  ]),
  slab: box(V.BASE, -V.BASE_H, V.BASE_H, 8, 1.4),
  groove: planOutline(insetPlan(V.BASE, 5), 0, P),
  screws: pointsAt(
    BASE_SCREWS.map(([x, y]) => [x, y, 0] as Point3),
    P,
  ),
  screwRings: joinPaths(BASE_SCREWS.map(([x, y]) => circleOn([x, y], 2.4, 0, 16))),
  ruleBase: lineOnTop([-150, RULE_EDGE], [150, RULE_EDGE], 0, P),
  ruleMinor: RULE.minor,
  ruleMajor: RULE.major,
  plate: box(V.PLATE, 0, 0.8, 3),
  plateLine: planOutline(insetPlan(V.PLATE, 1.8), 0.8, P, 3),
  plateRule: joinPaths(
    [0, 1, 2].map((row) =>
      onTop(
        [
          [V.PLATE.x + 9, V.PLATE.y + 4.2 + row * 2.6],
          [V.PLATE.x + (row === 1 ? 34 : 46), V.PLATE.y + 4.2 + row * 2.6],
        ],
        0.8,
        P,
      ),
    ),
  ),
  plateScrews: pointsAt(
    [
      [V.PLATE.x + 4, V.PLATE.y + V.PLATE.d / 2, 0.8],
      [V.PLATE.x + V.PLATE.w - 4, V.PLATE.y + V.PLATE.d / 2, 0.8],
    ],
    P,
  ),
};

// ── Airbox ──────────────────────────────────────────────────────────────────────────────────
const AIRBOX_FACE = V.AIRBOX.y + V.AIRBOX.d;
const AIRBOX_SCREWS = corners(V.AIRBOX, 7);
const PLEAT_FROM = -140;
const PLEAT_TO = -104;

export const AIRBOX_ART = {
  box: box(V.AIRBOX, 0, V.AIRBOX_H, 6, 0.8),
  foot: sideSeam(V.AIRBOX, 4, P, 6),
  lid: sideSeam(V.AIRBOX, V.AIRBOX_LID, P, 6),
  lidScrews: pointsAt(
    AIRBOX_SCREWS.map(([x, y]) => [x, y, V.AIRBOX_H] as Point3),
    P,
  ),
  lidRings: joinPaths(AIRBOX_SCREWS.map(([x, y]) => circleOn([x, y], 2.2, V.AIRBOX_H, 14))),
  snorkel: box(V.SNORKEL, V.SNORKEL_Z, V.SNORKEL_TOP - V.SNORKEL_Z, 5, 0.6),
  mouth: planOutline(insetPlan(V.SNORKEL, 3.5), V.SNORKEL_TOP, P, 5),
  // The element behind the inspection window: pleats, which is what anyone recognises a filter by.
  window: faceRect(AIRBOX_FACE, PLEAT_FROM - 3, PLEAT_TO + 3, 11, 33),
  recess: faceRect(AIRBOX_FACE - 1.5, PLEAT_FROM, PLEAT_TO, 13, 31),
  pleats: joinPaths(
    Array.from({ length: 10 }, (_, index) => {
      const x = PLEAT_FROM + ((index + 0.5) / 10) * (PLEAT_TO - PLEAT_FROM);
      return line([x, AIRBOX_FACE - 1.5, 13.6], [x, AIRBOX_FACE - 1.5, 30.4]);
    }),
  ),
};

// ── Boot and clamps ─────────────────────────────────────────────────────────────────────────
const bandAt = (x: number, width: number, grow: number) =>
  box(
    {
      x,
      y: V.BOOT.y - grow,
      w: width,
      d: V.BOOT.d + grow * 2,
      r: V.BOOT.r + grow,
    },
    V.BOOT_Z - grow,
    V.BOOT_H + grow * 2,
    10,
  );

const CLAMP_X = [V.BOOT.x + 1, V.BOOT.x + V.BOOT.w - 5];

export const BOOT_ART = {
  duct: box(V.BOOT, V.BOOT_Z, V.BOOT_H, 10),
  // Three corrugations: a rubber boot has to flex as the engine shakes on its mounts.
  bands: [-84, -78, -72].map((x) => bandAt(x, 4, 1.2)),
  clamps: CLAMP_X.map((x) => bandAt(x, 5, 2.2)),
  // The tightening boss: without it a band around a hose is just a band.
  bosses: CLAMP_X.map((x) =>
    box({ x: x - 0.5, y: V.BOOT.y + 6, w: 6, d: 7, r: 1.5 }, V.BOOT_Z + V.BOOT_H + 2.2, 5, 3),
  ),
  clampScrews: pointsAt(
    CLAMP_X.map((x) => [x + 2.5, V.BOOT.y + 9.5, V.BOOT_Z + V.BOOT_H + 7.2] as Point3),
    P,
  ),
};

// ── Carburettor ─────────────────────────────────────────────────────────────────────────────
const CARB_FACE = V.CARB.y + V.CARB.d;
const CAP_SCREWS: Point3[] = [
  [V.BOWL[0] - 9, 0, V.CARB_TOP + V.CAP_H],
  [V.BOWL[0] + 9, 0, V.CARB_TOP + V.CAP_H],
];

export const CARB_ART = {
  plinth: box({ x: -56, y: -11, w: 30, d: 22, r: 3 }, 0, 2, 3),
  bowl: puck(BOWL, V.BOWL_R, 2, V.BOWL_H, 40, 0.6),
  bowlBand: sideArc(BOWL[0], BOWL[1], V.BOWL_R, 11, P, 28),
  // The drain screw, which is the whole point of "lavado de carburador": the bowl comes off here.
  drain: sideRing([BOWL[0], BOWL[1] + V.BOWL_R, 6], 2.6, 'y', P),
  body: box(V.CARB, V.CARB_Z, V.CARB_H, 6, 0.8),
  bodySeam: sideSeam(V.CARB, V.CARB_Z + 25, P, 6),
  outlet: sideRing([V.CARB.x + V.CARB.w, 0, V.TRACT_Z], V.VENTURI_R, 'x', P),
  mixtureBoss: box({ x: -58, y: CARB_FACE - 4, w: 9, d: 7, r: 2 }, 22, 8, 3),
  mixtureScrew: pointsAt([[-53.5, CARB_FACE + 2, 30]], P),
  guide: box({ x: V.BOWL[0] - 3.5, y: CARB_FACE - 1, w: 7, d: 4, r: 1.4 }, 44, 5, 3),
  cap: puck(BOWL, V.CAP_R, V.CARB_TOP, V.CAP_H, 36, 0.6),
  capRing: circleOn(BOWL, V.CAP_R - 3.5, V.CARB_TOP + V.CAP_H, 28),
  capScrews: pointsAt(CAP_SCREWS, P),
  stem: puck(BOWL, V.SLIDE_R, V.SLIDE_Z, V.SLIDE_H, 24, 0.4),
  stemRing: circleOn(BOWL, V.SLIDE_R, V.SLIDE_Z + V.SLIDE_H, 20),
};

// ── Manifold ────────────────────────────────────────────────────────────────────────────────
const flangeAt = (x: number) =>
  box(
    { x, y: V.MANIFOLD.y - 3, w: 4, d: V.MANIFOLD.d + 6, r: V.MANIFOLD.r + 3 },
    V.MANIFOLD_Z - 3,
    V.MANIFOLD_H + 6,
    8,
  );

export const MANIFOLD_ART = {
  duct: box(V.MANIFOLD, V.MANIFOLD_Z, V.MANIFOLD_H, 8),
  flanges: [V.MANIFOLD.x, V.MANIFOLD.x + V.MANIFOLD.w - 4].map(flangeAt),
  studs: pointsAt(
    [V.MANIFOLD.x + 2, V.MANIFOLD.x + V.MANIFOLD.w - 2].flatMap((x) => [
      [x, V.MANIFOLD.y + 2, V.MANIFOLD_Z + V.MANIFOLD_H + 3] as Point3,
      [x, V.MANIFOLD.y + V.MANIFOLD.d - 2, V.MANIFOLD_Z + V.MANIFOLD_H + 3] as Point3,
    ]),
    P,
  ),
};

// ── Cylinder head ───────────────────────────────────────────────────────────────────────────
const FIN_PLAN = insetPlan(V.HEAD, -V.FIN_OUT);
const HEAD_FACE = V.HEAD.y + V.HEAD.d;
const COVER_BOLTS = corners(V.HEAD, 9);
const WINDOW_STEPS = 36;
const windowRing = (radius: number, y: number) =>
  pathOf(
    pointsAt(
      Array.from({ length: WINDOW_STEPS }, (_, step) => {
        const angle = (step / WINDOW_STEPS) * Math.PI * 2;
        return [
          V.CHAMBER[0] + radius * Math.cos(angle),
          y,
          V.CHAMBER[2] + radius * Math.sin(angle),
        ] as Point3;
      }),
      P,
    ),
    true,
  );

export const HEAD_ART = {
  // Cooling fins: the one feature that says "air-cooled single" before anything else is read.
  fins: Array.from({ length: V.FINS }, (_, index) =>
    box(FIN_PLAN, V.HEAD_Z + index * V.FIN_PITCH, V.FIN_H, 6, 0.4),
  ),
  spacers: Array.from({ length: V.FINS }, (_, index) =>
    box(V.HEAD, V.HEAD_Z + index * V.FIN_PITCH + V.FIN_H, V.FIN_PITCH - V.FIN_H, 6),
  ),
  cover: box(V.HEAD, V.HEAD_TOP, V.COVER_H, 6, 1),
  coverSeam: sideSeam(V.HEAD, V.HEAD_TOP + 3, P, 6),
  coverBolts: pointsAt(
    COVER_BOLTS.map(([x, y]) => [x, y, V.COVER_TOP] as Point3),
    P,
  ),
  boltRings: joinPaths(COVER_BOLTS.map(([x, y]) => circleOn([x, y], 2.6, V.COVER_TOP, 14))),
  window: sideRing([V.CHAMBER[0], HEAD_FACE, V.CHAMBER[2]], V.WINDOW_R, 'y', P, WINDOW_STEPS),
  hole: windowRing(V.WINDOW_R - 1.6, HEAD_FACE - 1.6),
  wall: sideRing(
    [V.CHAMBER[0], HEAD_FACE - 1.6, V.CHAMBER[2]],
    V.WINDOW_R - 1.6,
    'y',
    P,
    WINDOW_STEPS,
  ),
};

/** What the window looks in on: the plug's tip, where the spark crosses. */
const GAP_Y = HEAD_FACE - 1.6;
export const CHAMBER_ART = {
  centre: line([V.CHAMBER[0], GAP_Y, V.CHAMBER[2] + 9], [V.CHAMBER[0], GAP_Y, V.CHAMBER[2] + 1.6]),
  strap: joinPaths([
    line([V.CHAMBER[0] + 5, GAP_Y, V.CHAMBER[2] + 7], [V.CHAMBER[0] + 5, GAP_Y, V.CHAMBER[2] - 1]),
    line(
      [V.CHAMBER[0] + 5, GAP_Y, V.CHAMBER[2] - 1],
      [V.CHAMBER[0] - 0.6, GAP_Y, V.CHAMBER[2] - 1],
    ),
  ]),
  gap: line([V.CHAMBER[0], GAP_Y, V.CHAMBER[2] + 1.6], [V.CHAMBER[0], GAP_Y, V.CHAMBER[2] - 1]),
};

// ── Spark plug ──────────────────────────────────────────────────────────────────────────────
const PLUG_Z = V.COVER_TOP;
export const PLUG_ART = {
  washer: puck(PLUG, 7.8, PLUG_Z, 1.2, 18),
  hex: extrude(hexRing(PLUG, V.PLUG_HEX_R), PLUG_Z + 1.2, 6, P, { convex: true }),
  hexSeam: joinPaths(
    hexRing(PLUG, V.PLUG_HEX_R).map(([x, y]) => line([x, y, PLUG_Z + 1.2], [x, y, PLUG_Z + 7.2])),
  ),
  body: puck(PLUG, V.PLUG_BODY_R, PLUG_Z + 7.2, 5, 24),
  insulator: puck(PLUG, 4.2, PLUG_Z + 12.2, 12, 24, 0.4),
  ribs: joinPaths(
    [3.5, 6.5, 9.5].map((up) => sideArc(PLUG[0], PLUG[1], 4.2, PLUG_Z + 12.2 + up, P, 18)),
  ),
  terminal: puck(PLUG, 2.6, PLUG_Z + 24.2, 4, 16),
  cap: puck(PLUG, V.PLUG_CAP_R, PLUG_Z + 22, 10, 26, 0.5),
  capRibs: joinPaths(
    [3, 6].map((up) => sideArc(PLUG[0], PLUG[1], V.PLUG_CAP_R, PLUG_Z + 22 + up, P, 20)),
  ),
};

export const LEAD_AT = {
  from: at([PLUG[0], PLUG[1], PLUG_Z + 32]),
  to: at([V.COIL.x + 17, V.COIL.y + 11, V.COIL_H + 6]),
  via: [at([70, -16, PLUG_Z + 12]), at([98, -40, 34])] as Flat[],
};

// ── Ignition coil ───────────────────────────────────────────────────────────────────────────
const COIL_CENTRE: Plane = [V.COIL.x + 17, V.COIL.y + 11];
export const COIL_ART = {
  body: box(V.COIL, 0, V.COIL_H, 3, 0.6),
  laminations: joinPaths([5, 8, 11, 14].map((z) => sideSeam(V.COIL, z, P, 3))),
  post: puck(COIL_CENTRE, 4, V.COIL_H, 6, 18, 0.4),
  screws: pointsAt(
    [
      [V.COIL.x + 4, V.COIL.y + V.COIL.d - 4, V.COIL_H] as Point3,
      [V.COIL.x + V.COIL.w - 4, V.COIL.y + V.COIL.d - 4, V.COIL_H] as Point3,
    ],
    P,
  ),
};

// ── Tachometer ──────────────────────────────────────────────────────────────────────────────
const FACE_R = V.DIAL_R - 4.5;
const TICKS = radialTicks(
  DIAL[0],
  DIAL[1],
  FACE_R,
  33,
  4,
  V.DIAL_TOP,
  [2.4, 4.6],
  P,
  DIAL_FROM,
  DIAL_SPAN,
);

export const DIAL_ART = {
  stand: puck(DIAL, V.DIAL_STAND_R, 0, V.DIAL_STAND_H, 24, 0.6),
  standRing: circleOn(DIAL, V.DIAL_STAND_R - 2.5, V.DIAL_STAND_H, 20),
  puck: puck(DIAL, V.DIAL_R, V.DIAL_STAND_H, V.DIAL_H, 56, 1),
  knurl: knurl(DIAL[0], DIAL[1], V.DIAL_R, V.DIAL_STAND_H + 1, V.DIAL_TOP - 1.4, 40, P),
  bezel: circleOn(DIAL, V.DIAL_R - 2, V.DIAL_TOP, 48),
  face: circleOn(DIAL, FACE_R, V.DIAL_TOP, 48),
  minor: TICKS.minor,
  major: TICKS.major,
  hub: puck(DIAL, 2.4, V.DIAL_TOP, 1.2, 14),
  label: topMatrix([DIAL[0], DIAL[1] + 9], V.DIAL_TOP, P),
};

// ── Throttle ────────────────────────────────────────────────────────────────────────────────
/** The throttle's travel, as the collar's two end stops. */
export const STOP_ANGLES: [number, number] = [(130 * Math.PI) / 180, (230 * Math.PI) / 180];

const COLLAR_Z = V.KNOB_POST_H - 2.5;
export const KNOB_ART = {
  bracket: box({ x: KNOB[0] - 9, y: KNOB[1] - 9, w: 18, d: 18, r: 3 }, 0, 3, 3),
  bracketScrews: pointsAt(
    [[KNOB[0] - 6, KNOB[1] + 6, 3] as Point3, [KNOB[0] + 6, KNOB[1] + 6, 3] as Point3],
    P,
  ),
  post: puck(KNOB, V.KNOB_POST_R, 3, COLLAR_Z - 3, 18),
  // A fixed collar under the knob: without it the index mark would have nothing to read against.
  collar: puck(KNOB, V.KNOB_R + 2.5, COLLAR_Z, 2.5, 32, 0.4),
  stops: joinPaths(
    [0, 1].map((end) => {
      const angle = STOP_ANGLES[end] ?? 0;
      const from: Plane = [
        KNOB[0] + (V.KNOB_R - 0.5) * Math.sin(angle),
        KNOB[1] - (V.KNOB_R - 0.5) * Math.cos(angle),
      ];
      const to: Plane = [
        KNOB[0] + (V.KNOB_R + 2.2) * Math.sin(angle),
        KNOB[1] - (V.KNOB_R + 2.2) * Math.cos(angle),
      ];
      return lineOnTop(from, to, COLLAR_Z + 2.5, P);
    }),
  ),
  knob: puck(KNOB, V.KNOB_R, V.KNOB_POST_H, V.KNOB_H, 40, 0.6),
  knurl: knurl(KNOB[0], KNOB[1], V.KNOB_R, V.KNOB_POST_H + 1, V.KNOB_TOP - 1.2, 28, P),
  crown: circleOn(KNOB, V.KNOB_R - 3.5, V.KNOB_TOP, 28),
};

// ── The air's path ──────────────────────────────────────────────────────────────────────────
export const TRACT = pathOf(
  pointsAt(
    [
      [-157, 0, V.SNORKEL_TOP],
      [-157, 0, 38],
      [-122, 0, V.TRACT_Z],
      [-78, 0, V.TRACT_Z],
      [-41, 0, V.TRACT_Z],
      [0, 0, V.TRACT_Z],
      [30, 2, 32],
      [V.CHAMBER[0], 14, V.CHAMBER[2] + 5],
      [V.CHAMBER[0], HEAD_FACE - 2, V.CHAMBER[2] + 3],
    ] as Point3[],
    P,
  ),
);
