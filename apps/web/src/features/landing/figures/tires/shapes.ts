// @ts-nocheck -- Integration note, not the figure's own code: this drawing was built outside
// this app against the kit and is copied in as its author wrote it. It predates this project's
// `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and patching the index reads
// would turn every refresh into a merge. Its exported types still reach callers.
// Shared shape builders, used both by the static art (server) and by the parts
// that are rebuilt per frame (client).
import { pathOf, type Flat, type Point3, type SolidPaths } from "../../../../shared/iso/iso-kit";
import * as Lathe from "../../../../shared/iso/lathe.mjs";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const G = Lathe as any;
import {
  AWAY,
  AXIS_Z,
  BEAD_R,
  FLANGE_IN_HI,
  FLANGE_IN_LO,
  FLANGE_R,
  LIP_R,
  P,
  RIM_LO,
  RIM_TOP,
  TYRE_HI,
  TYRE_LO,
  TYRE_R,
  U_DIR,
  WELL_HI,
  WELL_LO,
  WELL_R,
  at,
  at3,
} from "./view";

export type Knot = [number, number] | [number, number, number];

export const AXIS = G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
export const lifted = (dz: number) => G.frameOf([0, 0, dz], [0, 0, 1], [1, 0, 0], [0, 1, 0]);

// A frame whose (u, v) plane is the vertical plane w = w0, with u to the right
// of the screen and v up; s runs away from the viewer (right-handed).
export const sideFrame = (w0 = 0) => G.frameOf(at3(0, w0, 0), AWAY, U_DIR, [0, 0, 1]);

// A prism in the vertical plane through the axis, drawn from w0 to w1 (w toward the viewer).
export function sidePrism(polygon: Array<[number, number]>, w0: number, w1: number): SolidPaths {
  return G.prismOf(sideFrame(0), polygon, -w1, -w0, P) as SolidPaths;
}

// The ellipse a horizontal circle projects to, as screen points.
export function circleFlat(r: number, z: number, count = 96): Flat[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return at([r * Math.cos(angle), r * Math.sin(angle), z]);
  });
}

export const circlePath = (r: number, z: number, count = 96) => pathOf(circleFlat(r, z, count), true);

// Rim outside, closed to the axis: flanges, bead seats and the drop centre.
export const RIM_PROFILE: Knot[] = [
  [RIM_LO, FLANGE_R],
  [FLANGE_IN_LO, FLANGE_R],
  [FLANGE_IN_LO, BEAD_R],
  [WELL_LO - 3, BEAD_R],
  [WELL_LO, WELL_R],
  [WELL_HI, WELL_R],
  [WELL_HI + 3, BEAD_R],
  [FLANGE_IN_HI, BEAD_R],
  [FLANGE_IN_HI, FLANGE_R],
  [RIM_TOP, FLANGE_R],
];

// Tyre cross-section, from the lower bead heel round the outside to the upper bead.
// The upper half follows the top bead: `drop` pushes it toward the drop centre,
// `over` lifts it onto the flange.
const LOWER: Knot[] = [
  [FLANGE_IN_LO + 0.4, BEAD_R],
  [FLANGE_IN_LO + 0.1, FLANGE_R - 0.4],
  [41.6, 81.4, 1],
  [38.8, 87.6, 1],
  [TYRE_LO, 94],
  [39.4, 100.2, 1],
  [43.6, 104, 1],
  [50, TYRE_R, 1],
];

export function topBeadZ(drop: number, over: number) {
  const seated = FLANGE_IN_HI - 0.4;
  const sunk = seated - 9;
  const down = seated + (sunk - seated) * drop;
  return down + (RIM_TOP - 0.8 - down) * over;
}

const weightAt = (r: number) => {
  const t = Math.min(1, Math.max(0, (r - BEAD_R) / (TYRE_R - 4 - BEAD_R)));
  return 1 - t * t * (3 - 2 * t);
};

export function tyreMeridian(drop: number, over: number): Knot[] {
  const shift = topBeadZ(drop, over) - (FLANGE_IN_HI - 0.4);
  const upper = LOWER.slice()
    .reverse()
    .map(([z, r, soft]): Knot => {
      const mirrored = 2 * AXIS_Z - z;
      const moved = mirrored + shift * weightAt(r);
      return soft ? [moved, r, 1] : [moved, r];
    });
  return [...LOWER, [56, TYRE_R, 1], [AXIS_Z, TYRE_R + 0.2, 1], [80, TYRE_R, 1], ...upper];
}

// Height of the tyre's upper surface at radius r (for the breaker shoe to rest on).
export function surfaceAt(r: number, drop: number, over: number) {
  const knots = tyreMeridian(drop, over).filter(([z]) => z > AXIS_Z);
  let best = TYRE_HI;
  for (let index = 0; index < knots.length - 1; index++) {
    const [z0, r0] = knots[index]!;
    const [z1, r1] = knots[index + 1]!;
    if ((r - r0) * (r - r1) <= 0 && r0 !== r1) {
      best = z0 + ((z1 - z0) * (r - r0)) / (r1 - r0);
      break;
    }
  }
  return best;
}

export function tyrePaths(drop: number, over: number, dz: number) {
  return G.lathe(tyreMeridian(drop, over), lifted(dz), P, { steps: 120 }) as SolidPaths;
}

// The see-through hole of a tyre (or rim): inside both of its bead circles.
export function holeOf(r: number, z0: number, z1: number) {
  const top = circleFlat(r, z1);
  const bottom = circleFlat(r, z0);
  return { top, bottom };
}

// Outline of the region inside both ellipses, as one closed path: the near arc of the
// upper circle and the far arc of the lower one.
export function lensPath(r: number, z0: number, z1: number, count = 120) {
  const centreTop = at([0, 0, z1]);
  const centreLow = at([0, 0, z0]);
  const points: Flat[] = [];
  const inside = (p: Flat, centre: Flat) => {
    const a = r * Math.sqrt(1.6) * P.scale;
    const b = a * Math.sin((38 * Math.PI) / 180);
    return ((p[0] - centre[0]) / a) ** 2 + ((p[1] - centre[1]) / b) ** 2 <= 1 + 1e-9;
  };
  const top = circleFlat(r, z1, count);
  const low = circleFlat(r, z0, count);
  for (const p of top) if (inside(p, centreLow)) points.push(p);
  for (const p of low) if (inside(p, centreTop)) points.push(p);
  if (points.length < 3) return "";
  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  points.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  return pathOf(points, true);
}

// Everything below the screen line through the projected centre of height z.
export function belowPath(z: number, width: number, height: number) {
  const y = at([0, 0, z])[1];
  return `M-50 ${y.toFixed(1)}H${width + 50}V${height + 50}H-50Z`;
}

export const LIP = circlePath(LIP_R, RIM_TOP, 120);

// A line in 3D, projected.
export const seg3 = (a: Point3, b: Point3) => pathOf([at(a), at(b)]);
export const poly3 = (points: Point3[], closed = false) => pathOf(points.map((point) => at(point)), closed);
