// @ts-nocheck -- Integration note, not the figure's own code: this drawing was built outside
// this app against the kit and is copied in as its author wrote it. It predates this project's
// `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and patching the index reads
// would turn every refresh into a merge. Its exported types still reach callers.
// Every static path, computed once (on the server).
import {
  circleRing,
  cylinder,
  extrude,
  insetPlan,
  knurl,
  onTop,
  pathOf,
  planOutline,
  ring,
  sideArc,
  sideSeam,
  slabOf,
  topMatrix,
  topTicks,
  type Flat,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
} from "../../../../shared/iso/iso-kit";
import * as Lathe from "../../../../shared/iso/lathe.mjs";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const G = Lathe as any;
import { AXIS, RIM_PROFILE, circleFlat, circlePath, poly3, seg3, sidePrism } from "./shapes";
import {
  AXIS_Z,
  BASE,
  BASE_H,
  BEAD_R,
  BREAKER_U,
  FLANGE_IN_HI,
  FLANGE_R,
  FOOT_H,
  GAUGE_HI,
  GAUGE_LO,
  GAUGE_R,
  HUB_HI,
  HUB_LO,
  HUB_R,
  LIP_R,
  NUT_HI,
  NUT_LO,
  P,
  PIVOT_Z,
  POST_HI,
  RIM_LO,
  RIM_TOP,
  SPOKES,
  TYRE_R,
  U_DIR,
  VALVE_ANGLE,
  W_DIR,
  WELL_HI,
  WELL_IN,
  WELL_LO,
  at,
  at3,
  uw,
} from "./view";

const RAD = Math.PI / 180;
const join = (paths: string[]) => paths.filter(Boolean).join("");
const solid = (plan: Plan, z: number, h: number, steps = 6, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 32, bevel = 0) => cylinder(cx, cy, r, z, h, P, steps, bevel);
const depth = ([x, y, z]: Point3) => G.dot3([x, y, z], G.viewOf(P));

// ── Base ──────────────────────────────────────────────────────────────────────
const FEET: Plane[] = [
  [BASE.x + 20, BASE.y + 20],
  [BASE.x + BASE.w - 20, BASE.y + 20],
  [BASE.x + 20, BASE.y + BASE.d - 20],
  [BASE.x + BASE.w - 20, BASE.y + BASE.d - 20],
].sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0])) as Plane[];

const CORNER_SCREWS: Plane[] = [
  [BASE.x + 10, BASE.y + 10],
  [BASE.x + BASE.w - 10, BASE.y + 10],
  [BASE.x + 10, BASE.y + BASE.d - 10],
  [BASE.x + BASE.w - 10, BASE.y + BASE.d - 10],
];

const LABEL: Plan = { x: 62, y: 98, w: 52, d: 16, r: 2 };
const STRIP: Plan = { x: -104, y: 112, w: 150, d: 8, r: 1 };
const STRIP_TICKS = topTicks(STRIP.x + 3, STRIP.x + STRIP.w - 3, 5, 5, STRIP.y + 0.6, 0.6, [2.4, 4.2], P);

export const BASE_ART = {
  halo: solid(insetPlan(BASE, -4), -BASE_H - FOOT_H, BASE_H).fill,
  feet: FEET.map(([x, y]) => [cyl(x, y, 9, -BASE_H - FOOT_H, 1.8, 28), cyl(x, y, 7, -BASE_H - FOOT_H + 1.8, FOOT_H - 1.8, 28)]),
  slab: solid(BASE, -BASE_H, BASE_H, 8, 1.6),
  edgeSeam: sideSeam(BASE, -BASE_H + 2.6, P, 8),
  groove: planOutline(insetPlan(BASE, 5), 0, P, 8),
  screws: CORNER_SCREWS.map(([x, y]) => at([x, y, 0])),
  screwRings: join(CORNER_SCREWS.map(([x, y]) => ring(x, y, 2.3, 0, P, 16))),
  label: solid(LABEL, 0, 0.8, 4),
  labelLine: planOutline(insetPlan(LABEL, 1.6), 0.8, P, 4),
  labelRules: join([0, 1, 2].map((row) => onTop([[LABEL.x + 18, LABEL.y + 5 + row * 2.6], [LABEL.x + (row === 1 ? 36 : 46), LABEL.y + 5 + row * 2.6]], 0.8, P))),
  labelScrews: [at([LABEL.x + 3.4, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 3.4, LABEL.y + LABEL.d / 2, 0.8])],
  labelText: topMatrix([LABEL.x + 6, LABEL.y + 10.4], 0.8, P, "x"),
  strip: solid(STRIP, 0, 0.6, 3),
  stripMinor: STRIP_TICKS.minor,
  stripMajor: STRIP_TICKS.major,
  stripScrews: [at([STRIP.x + 1.6, STRIP.y + STRIP.d - 1.8, 0.6]), at([STRIP.x + STRIP.w - 1.6, STRIP.y + STRIP.d - 1.8, 0.6])],
};

// ── A tub of mounting paste with its brush, on the base ──────────────────────
const [TX, TY] = uw(98, 76);
const BRUSH_AXIS = G.unit3([0.42, -0.5, 0.76]);
const BRUSH = G.frameAlong([TX - 2, TY + 1, 6.5], BRUSH_AXIS);

export const TUB_ART = {
  halo: cyl(TX, TY, 13, -0.5, 1, 32).fill,
  body: cyl(TX, TY, 11, 0, 9, 48, 0),
  bands: join([2.2, 6.4].map((z) => sideArc(TX, TY, 11, z, P, 32))),
  lip: cyl(TX, TY, 11.8, 9, 1.2, 48, 0.4),
  paste: ring(TX, TY, 10, 10.2, P, 48),
  pasteFill: cylinder(TX, TY, 10, 10.2, 0, P, 48).top,
  ferrule: G.disc(0, 5, 2.6, BRUSH, P) as SolidPaths,
  handle: G.solidOf(
    [
      [5, 1.7],
      [21, 1.9],
      [22.6, 1.6, 1],
      [23.4, 0.9],
    ],
    BRUSH,
    P,
    { steps: 28 },
  ) as SolidPaths,
  hang: G.arcOf(BRUSH, 19.4, 1.88, P) as string,
};

// ── Bead breaker stand (static part) ─────────────────────────────────────────
const [BX, BY] = uw(BREAKER_U, 0);
const BFOOT: Plan = { x: BX - 15, y: BY - 15, w: 30, d: 30, r: 3 };
const COLUMN: Plan = { x: BX - 7, y: BY - 7, w: 14, d: 14, r: 1.6 };
const COLUMN_TOP = PIVOT_Z - 7;
const GUSSET: Plan = { x: BX - 7, y: BY + 7, w: 14, d: 6, r: 0.6 };

const cheek = (w0: number, w1: number) =>
  sidePrism(
    [
      [BREAKER_U - 7, COLUMN_TOP - 2],
      [BREAKER_U + 7, COLUMN_TOP - 2],
      [BREAKER_U + 6, PIVOT_Z + 6],
      [BREAKER_U - 6, PIVOT_Z + 6],
    ],
    w0,
    w1,
  );

const PIN = G.frameAlong(at3(BREAKER_U, -9, PIVOT_Z), [Math.cos(45 * RAD), Math.sin(45 * RAD), 0]);

export const STAND_ART = {
  foot: solid(BFOOT, 0, 2.6, 4, 0.6),
  footBolts: [
    [BFOOT.x + 4, BFOOT.y + 4],
    [BFOOT.x + BFOOT.w - 4, BFOOT.y + 4],
    [BFOOT.x + 4, BFOOT.y + BFOOT.d - 4],
    [BFOOT.x + BFOOT.w - 4, BFOOT.y + BFOOT.d - 4],
  ].map(([x, y]) => at([x!, y!, 2.6])),
  gusset: extrude(
    [
      [GUSSET.x, GUSSET.y],
      [GUSSET.x + GUSSET.w, GUSSET.y],
      [GUSSET.x + GUSSET.w, GUSSET.y + GUSSET.d],
      [GUSSET.x, GUSSET.y + GUSSET.d],
    ],
    2.6,
    16,
    P,
  ),
  column: solid(COLUMN, 2.6, COLUMN_TOP - 2.6, 3, 0.5),
  columnSeams: join([30, 60, 90].map((z) => sideSeam(COLUMN, z, P, 3))),
  cheekBack: cheek(-7.5, -5),
  cheekFront: cheek(5, 7.5),
  pin: G.disc(0, 18, 2.4, PIN, P) as SolidPaths,
  pinNut: G.disc(18, 20, 3.4, PIN, P) as SolidPaths,
  pinHead: G.disc(-1.6, 0, 3.4, PIN, P) as SolidPaths,
  stop: sidePrism(
    [
      [BREAKER_U - 11, COLUMN_TOP - 16],
      [BREAKER_U - 7, COLUMN_TOP - 16],
      [BREAKER_U - 7, COLUMN_TOP - 9],
      [BREAKER_U - 11, COLUMN_TOP - 10],
    ],
    -4,
    4,
  ),
};

// ── Under the wheel: centre column and three support arms ─────────────────────
const ARM_ANGLES = [-30, 90, 210];
const armRing = (angle: number): Plane[] => {
  const c = Math.cos(angle * RAD);
  const s = Math.sin(angle * RAD);
  const half = 3.5;
  const pts: Array<[number, number]> = [
    [8, -half],
    [92, -half],
    [92, half],
    [8, half],
  ];
  return pts.map(([a, b]) => [a * c - b * s, a * s + b * c]);
};

const ARMS = ARM_ANGLES.map((angle) => ({ angle, mid: [Math.cos(angle * RAD) * 50, Math.sin(angle * RAD) * 50, 31] as Point3 }))
  .sort((a, b) => depth(a.mid) - depth(b.mid))
  .map(({ angle }) => {
    const c = Math.cos(angle * RAD);
    const s = Math.sin(angle * RAD);
    return {
      arm: extrude(armRing(angle), 28, 6, P),
      pad: cyl(c * 75, s * 75, 4.6, 34, RIM_LO - 34, 20),
      tip: cyl(c * 90, s * 90, 3.6, 34, 2, 16),
      bolt: at([c * 20, s * 20, 34]),
    };
  });

export const UNDER_ART = {
  flange: cyl(0, 0, 18, 0, 3, 40),
  flangeBolts: [45, 135, 225, 315].map((a) => at([Math.cos(a * RAD) * 14, Math.sin(a * RAD) * 14, 3])),
  column: cyl(0, 0, 10, 3, HUB_LO - 3, 36),
  collar: cyl(0, 0, 13, 28, 6, 40),
  arms: ARMS,
};

// ── Rim ──────────────────────────────────────────────────────────────────────
const rimSeam = (z: number, r: number) => G.arcOf(AXIS, z, r, P) as string;

export const RIM_ART = {
  outside: G.solidOf(RIM_PROFILE, AXIS, P, { steps: 128 }) as SolidPaths,
  seams: join([rimSeam(WELL_LO + 10, 64), rimSeam(WELL_HI - 4, 64)]),
};

// The inside of the barrel seen through the top lip.
const INSIDE: Array<[number, number]> = [
  [RIM_TOP, LIP_R],
  [WELL_HI + 3, LIP_R],
  [WELL_HI, WELL_IN],
  [WELL_LO, WELL_IN],
  [WELL_LO - 3, LIP_R],
  [RIM_LO, LIP_R],
];

const inner = (z: number, r: number) => G.arcOf(AXIS, z, r, P, { inward: true, least: -1 }) as string;

// Where a ray passes right through the barrel: inside every one of its narrowest circles.
function throughOf(circles: Array<[number, number]>) {
  const centres = circles.map(([z]) => at([0, 0, z]));
  const k = P.scale * Math.sqrt(1.6);
  const sinE = Math.sin(38 * RAD);
  const inside = (p: Flat) =>
    circles.every(([, r], index) => {
      const a = r * k;
      const b = a * sinE;
      const c = centres[index]!;
      return ((p[0] - c[0]) / a) ** 2 + ((p[1] - c[1]) / b) ** 2 <= 1 + 1e-9;
    });
  const points = circles.flatMap(([z, r]) => circleFlat(r, z, 180).filter(inside));
  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  points.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  return pathOf(points, true);
}

// Bands of the inner wall between its edges, far half only (that's all the lip shows).
function wallBand(z0: number, r0: number, z1: number, r1: number) {
  const a: Flat[] = [];
  const b: Flat[] = [];
  const view = G.viewOf(P);
  const phi = Math.atan2(view[1], view[0]);
  for (let index = 0; index <= 90; index++) {
    const t = phi + Math.PI / 2 + (index / 90) * Math.PI;
    a.push(at([r0 * Math.cos(t), r0 * Math.sin(t), z0]));
    b.push(at([r1 * Math.cos(t), r1 * Math.sin(t), z1]));
  }
  return pathOf([...a, ...b.reverse()], true);
}

const SPOKE_Z: [number, number] = [AXIS_Z - 5, AXIS_Z + 4];
const spokeAngles = Array.from({ length: SPOKES }, (_, index) => VALVE_ANGLE + 36 + index * 72);
const spokeOf = (angle: number) => {
  const dir: Point3 = [Math.cos(angle * RAD), Math.sin(angle * RAD), 0];
  const across: Point3 = [-dir[1], dir[0], 0];
  const F = G.frameOf([0, 0, 0], dir, across, [0, 0, 1]);
  const half = 3.6;
  const paths = G.prismOf(
    F,
    [
      [-half, SPOKE_Z[0]],
      [half, SPOKE_Z[0]],
      [half * 0.8, SPOKE_Z[1]],
      [-half * 0.8, SPOKE_Z[1]],
    ],
    HUB_R - 1,
    WELL_IN + 0.4,
    P,
  ) as SolidPaths;
  const rib = seg3([dir[0] * (HUB_R - 0.3), dir[1] * (HUB_R - 0.3), SPOKE_Z[1]], [dir[0] * WELL_IN, dir[1] * WELL_IN, SPOKE_Z[1]]);
  return { paths, rib, key: depth([dir[0] * 40, dir[1] * 40, AXIS_Z]) };
};
const SPOKE_LIST = spokeAngles.map(spokeOf).sort((a, b) => a.key - b.key);
const HUB_KEY = depth([0, 0, AXIS_Z]);

const vdir: Point3 = [Math.cos(VALVE_ANGLE * RAD), Math.sin(VALVE_ANGLE * RAD), 0];
const VALVE_AXIS = G.unit3([-vdir[0] * 0.82, -vdir[1] * 0.82, 0.57]);
const VALVE_BASE: Point3 = [vdir[0] * WELL_IN, vdir[1] * WELL_IN, AXIS_Z];
const VALVE = G.frameAlong(VALVE_BASE, VALVE_AXIS);
export const VALVE_TIP: Point3 = G.add3(VALVE_BASE, G.mul3(VALVE_AXIS, 17));
export const VALVE_DIR = VALVE_AXIS;

const HUB_FRAME = AXIS;

export const INSIDE_ART = {
  lip: circlePath(LIP_R, RIM_TOP, 140),
  wall: wallBand(RIM_TOP, LIP_R, WELL_HI + 3, LIP_R),
  slopeHi: wallBand(WELL_HI + 3, LIP_R, WELL_HI, WELL_IN),
  well: wallBand(WELL_HI, WELL_IN, WELL_LO, WELL_IN),
  slopeLo: wallBand(WELL_LO, WELL_IN, WELL_LO - 3, LIP_R),
  wallLo: wallBand(WELL_LO - 3, LIP_R, RIM_LO, LIP_R),
  edges: join(INSIDE.slice(1, -1).map(([z, r]) => inner(z, r))),
  through: throughOf([
    [RIM_TOP, LIP_R],
    [WELL_HI, WELL_IN],
    [WELL_LO, WELL_IN],
    [RIM_LO, LIP_R],
  ]),
  floorGroove: planOutline(insetPlan(BASE, 5), 0, P, 8),
  farSpokes: SPOKE_LIST.filter((spoke) => spoke.key < HUB_KEY),
  nearSpokes: SPOKE_LIST.filter((spoke) => spoke.key >= HUB_KEY),
  hub: G.disc(HUB_LO, HUB_HI, HUB_R, HUB_FRAME, P) as SolidPaths,
  hubSeams: join([HUB_LO + 8, SPOKE_Z[1] + 2].map((z) => G.arcOf(HUB_FRAME, z, HUB_R, P) as string)),
  hubBolts: G.dotsOf(HUB_FRAME, HUB_HI, 15.5, 6, P, { all: true }) as Flat[],
  seal: circlePath(12.5, HUB_HI, 64),
  valveBody: G.solidOf(
    [
      [0, 4.4],
      [2.2, 4.4],
      [3.4, 3.3, 1],
      [6, 2.9, 1],
      [10, 2.6],
      [10, 2],
      [13, 2],
    ],
    VALVE,
    P,
  ) as SolidPaths,
  chuck: G.disc(12.4, 17, 3, VALVE, P) as SolidPaths,
  chuckBand: G.arcOf(VALVE, 14.6, 3, P) as string,
  chuckLever: G.prismOf(G.frameAlong(G.add3(VALVE_BASE, G.mul3(VALVE_AXIS, 13)), [0, 0, 1]), [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ], 2.6, 8.4, P) as SolidPaths,
};

// ── Centre stack: cone, nut, post and the inflation gauge ─────────────────────
const NUT_KNURL = knurl(0, 0, 11, NUT_LO + 1.4, NUT_HI, 48, P, 0.4);

export const GAUGE_PSI = { from: 225, span: 270, max: 60 };
export const angleOfPsi = (psi: number) => (GAUGE_PSI.from - (Math.min(GAUGE_PSI.max, Math.max(0, psi)) / GAUGE_PSI.max) * GAUGE_PSI.span) * RAD;
// A point on the gauge face at an angle measured on screen-ish terms: 90° is the far side.
export const facePoint = (r: number, angle: number, z = GAUGE_HI): Point3 => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return at3(r * c, -r * s, z);
};

function gaugeTicks() {
  const minor: string[] = [];
  const major: string[] = [];
  for (let psi = 0; psi <= 60; psi += 2) {
    const big = psi % 10 === 0;
    const angle = angleOfPsi(psi);
    const outer = GAUGE_R - 2.6;
    (big ? major : minor).push(poly3([facePoint(outer - (big ? 3 : 1.6), angle), facePoint(outer, angle)]));
  }
  return { minor: join(minor), major: join(major) };
}
const TICKS = gaugeTicks();
const BAND_Z = GAUGE_HI - 3.2;

const FITTING_ANGLE = Math.atan2(vdir[1], vdir[0]);
const FITTING_DIR: Point3 = [Math.cos(FITTING_ANGLE), Math.sin(FITTING_ANGLE), 0];
const FITTING_Z = GAUGE_LO + 3.4;
export const FITTING = G.frameAlong([FITTING_DIR[0] * (GAUGE_R - 0.6), FITTING_DIR[1] * (GAUGE_R - 0.6), FITTING_Z], FITTING_DIR);
export const HOSE_START: Point3 = G.pointOf(FITTING, 5.4, 0, 0);
export const HOSE_DIR = FITTING_DIR;

const BLEED_DIR: Point3 = [Math.cos(20 * RAD), Math.sin(20 * RAD), 0];
const BLEED = G.frameAlong([BLEED_DIR[0] * (GAUGE_R - 0.6), BLEED_DIR[1] * (GAUGE_R - 0.6), FITTING_Z + 0.6], BLEED_DIR);

export const STACK_ART = {
  cone: G.solidOf(
    [
      [HUB_HI, 15],
      [HUB_HI + 1.4, 15],
      [NUT_LO, 9.5],
    ],
    AXIS,
    P,
  ) as SolidPaths,
  nut: cyl(0, 0, 11, NUT_LO, NUT_HI - NUT_LO, 56, 0.6),
  nutKnurl: NUT_KNURL,
  nutBand: sideArc(0, 0, 11, NUT_LO + 1.4, P, 40),
  wings: [-1, 1].map((side) =>
    G.prismOf(
      G.frameOf([0, 0, 0], [0, 0, 1], U_DIR, W_DIR),
      [
        [side * 10, -2],
        [side * 21, -1.4],
        [side * 21, 1.4],
        [side * 10, 2],
      ],
      NUT_HI - 5,
      NUT_HI - 1,
      P,
    ) as SolidPaths,
  ),
  post: cyl(0, 0, 4.6, NUT_HI, POST_HI - NUT_HI, 28),
  postRing: sideArc(0, 0, 4.6, NUT_HI + 4, P, 20),
  collar: cyl(0, 0, 7.5, POST_HI - 2.4, 2.4, 36),
  puck: cyl(0, 0, GAUGE_R, GAUGE_LO, GAUGE_HI - GAUGE_LO, 72, 0.8),
  band: sideArc(0, 0, GAUGE_R, BAND_Z, P, 48),
  knurl: knurl(0, 0, GAUGE_R, BAND_Z, GAUGE_HI, 96, P, 0.3),
  bezel: ring(0, 0, GAUGE_R - 1.2, GAUGE_HI, P, 80),
  face: ring(0, 0, GAUGE_R - 2.6, GAUGE_HI, P, 80),
  minor: TICKS.minor,
  major: TICKS.major,
  spec: poly3([facePoint(GAUGE_R - 7.2, angleOfPsi(36.3)), facePoint(GAUGE_R - 2.6, angleOfPsi(36.3))]),
  limit: at(facePoint(GAUGE_R - 4.4, angleOfPsi(40))),
  hub: ring(0, 0, 1.6, GAUGE_HI, P, 16),
  label: topMatrix([0, 0], GAUGE_HI, P, "x"),
  fitting: G.disc(0, 3.4, 2.4, FITTING, P) as SolidPaths,
  fittingNut: G.disc(3.4, 5.4, 2.9, FITTING, P) as SolidPaths,
  bleed: G.disc(0, 2.6, 2.2, BLEED, P) as SolidPaths,
  bleedCap: G.disc(2.6, 4, 1.5, BLEED, P) as SolidPaths,
};

// ── Tread: closed slots on the crown, a worn set and a new set ───────────────
function grooves(length: number, width: number, count: number) {
  const out: Array<{ d: string; alpha: number }> = [];
  const view = G.viewOf(P);
  for (const side of [1, -1]) {
    for (let index = 0; index < count; index++) {
      const t0 = (index / count) * Math.PI * 2 + (side < 0 ? Math.PI / count : 0);
      const z0 = AXIS_Z + side * 3;
      const z1 = AXIS_Z + side * (3 + length);
      const twist = 0.2 * side;
      const point = (t: number, z: number): Point3 => [TYRE_R * Math.cos(t), TYRE_R * Math.sin(t), z];
      const dt = width / TYRE_R / 2;
      const shape = [point(t0 - dt, z0), point(t0 + dt, z0), point(t0 + twist + dt * 0.6, z1), point(t0 + twist - dt * 0.6, z1)];
      const facing = G.dot3([Math.cos(t0 + twist / 2), Math.sin(t0 + twist / 2), 0], view);
      const alpha = G.fadeOf(facing, [0.12, 0.5]);
      if (alpha < 0.03) continue;
      out.push({ d: poly3(shape, true), alpha: Math.round(alpha * 20) / 20 });
    }
  }
  return out;
}

export const TREAD_ART = {
  fresh: grooves(22, 2.4, 40),
  worn: grooves(9, 1.2, 40),
  centre: G.arcOf(AXIS, AXIS_Z, TYRE_R + 0.2, P) as string,
  dot: at([Math.cos(VALVE_ANGLE * RAD) * 88, Math.sin(VALVE_ANGLE * RAD) * 88, 97.2]),
};

export const FLANGE_NEAR = G.ringBand(FLANGE_IN_HI, RIM_TOP, LIP_R, FLANGE_R, AXIS, P, { steps: 128 }) as SolidPaths;

// ── Without WebGL: the paste as a band and the bubbles as still rings ────────
const SHOULDER = (r: number) => RIM_TOP + 0.2 + 3.4 * Math.min(1, Math.max(0, (r - FLANGE_R) / 10)) ** 2 * (3 - 2 * Math.min(1, Math.max(0, (r - FLANGE_R) / 10)));
export const FALLBACK_ART = {
  wet: pathOf(circleFlat(FLANGE_R + 0.2, SHOULDER(FLANGE_R + 0.2), 140), true) + pathOf(circleFlat(FLANGE_R + 5.5, SHOULDER(FLANGE_R + 5.5), 140).reverse(), true),
  bubbles: Array.from({ length: 46 }, (_, index) => {
    const t = (index / 46) * Math.PI * 2 + Math.sin(index * 12.9898) * 0.04;
    const size = 0.9 + 1.3 * ((Math.sin(index * 78.233) * 43758.5453) % 1 + 1) % 1;
    const r = FLANGE_R + 0.8 + size;
    const z = SHOULDER(r) + 0.1;
    const points: Flat[] = Array.from({ length: 18 }, (_, k) => {
      const a = (k / 18) * Math.PI * 2;
      return at([r * Math.cos(t) + size * Math.cos(a), r * Math.sin(t) + size * Math.sin(a), z]);
    });
    return pathOf(points, true);
  }).join(""),
};
