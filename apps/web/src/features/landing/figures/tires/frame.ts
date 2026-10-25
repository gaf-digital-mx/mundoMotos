// @ts-nocheck -- Integration note, not the figure's own code: this drawing was built outside
// this app against the kit and is copied in as its author wrote it. It predates this project's
// `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and patching the index reads
// would turn every refresh into a merge. Its exported types still reach callers.
// Paths for the parts that move or change shape, rebuilt per frame on the client.
import { pathOf, translateAlong, type Flat, type Point3, type SolidPaths } from "../../../../shared/iso/iso-kit";
import * as Lathe from "../../../../shared/iso/lathe.mjs";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const G = Lathe as any;
import * as Tube from "../../../../shared/iso/tube.mjs";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { tubePieces, tubeSvg } = Tube as any;
import { HOSE_DIR, HOSE_START, VALVE_DIR, VALVE_TIP, angleOfPsi, facePoint } from "./geometry";
import type { Pose } from "./model";
import { circleFlat, sidePrism, surfaceAt, topBeadZ, tyrePaths } from "./shapes";
import {
  ARM_IN,
  ARM_OUT,
  BEAD_R,
  BREAKER_REST,
  BREAKER_U,
  FLANGE_IN_LO,
  FLANGE_R,
  GAUGE_R,
  HEIGHT,
  IRON,
  IRON_REST_TIP,
  LIFT,
  P,
  PIVOT_Z,
  RIM_TOP,
  SHOE,
  SHOE_R,
  WIDTH,
  at,
  at3,
} from "./view";

const RAD = Math.PI / 180;
const tenth = (value: number) => Math.round(value * 10) / 10;

type UZ = [number, number];
const rotate = ([a, b]: UZ, angle: number): UZ => [a * Math.cos(angle) - b * Math.sin(angle), a * Math.sin(angle) + b * Math.cos(angle)];
const plus = (a: UZ, b: UZ): UZ => [a[0] + b[0], a[1] + b[1]];
const scale = (a: UZ, k: number): UZ => [a[0] * k, a[1] * k];
const side3 = ([u, z]: UZ, w: number): Point3 => at3(u, w, z);

// ── Bead breaker: a straight lever on a pin, shoe hanging from its inner end ──
// Inner arm direction (toward the wheel) at angle θ above level: d = (−cos θ, sin θ); the
// shoe hangs along n = (sin θ, −cos θ).
export function shoeBottom(theta: number): UZ {
  const d: UZ = [-Math.cos(theta), Math.sin(theta)];
  const n: UZ = [Math.sin(theta), -Math.cos(theta)];
  return plus(plus([BREAKER_U, PIVOT_Z], scale(d, ARM_IN)), scale(n, SHOE));
}

// The angle at which the shoe rests on the tyre's upper surface.
export function contactAngle(drop: number, over: number, lift: number) {
  const surface = surfaceAt(SHOE_R, drop, over) + lift * LIFT;
  let lo = -20 * RAD;
  let hi = BREAKER_REST * RAD;
  for (let index = 0; index < 30; index++) {
    const mid = (lo + hi) / 2;
    if (shoeBottom(mid)[1] < surface) lo = mid;
    else hi = mid;
  }
  return hi;
}

export function breakerAngle(pose: Pose) {
  const want = (BREAKER_REST - (BREAKER_REST + 6) * pose.breaker) * RAD;
  return Math.max(want, contactAngle(pose.drop, pose.over, pose.lift));
}

function breakerPaths(theta: number) {
  const d: UZ = [-Math.cos(theta), Math.sin(theta)];
  const n: UZ = [Math.sin(theta), -Math.cos(theta)];
  const pivot: UZ = [BREAKER_U, PIVOT_Z];
  const local = (a: number, b: number): UZ => plus(pivot, plus(scale(d, a), scale(n, -b)));
  const arm = sidePrism([local(-ARM_OUT, -2.8), local(ARM_IN + 3, -2.8), local(ARM_IN + 3, 2.8), local(-ARM_OUT, 2.8)], -3.5, 3.5);
  const end = local(ARM_IN, 0);
  const shoeAt = (a: number, b: number): UZ => plus(end, plus(scale(d, a), scale(n, b)));
  const shoe = sidePrism([shoeAt(-4.5, 1), shoeAt(5, 1), shoeAt(4, SHOE - 3), shoeAt(1, SHOE), shoeAt(-2.5, SHOE - 1)], -10, 10);
  const tongue = sidePrism([shoeAt(-3.4, -3), shoeAt(4, -3), shoeAt(4, 1.2), shoeAt(-3.4, 1.2)], -4.8, 4.8);
  const gripFrom = local(-ARM_OUT + 22, 0);
  const gripTo = local(-ARM_OUT - 1, 0);
  const axis = G.unit3(G.sub3(at3(gripTo[0], 0, gripTo[1]), at3(gripFrom[0], 0, gripFrom[1])));
  const F = G.frameAlong(at3(gripFrom[0], 0, gripFrom[1]), axis);
  const grip = G.solidOf(
    [
      [0, 3.6],
      [21.4, 3.6],
      [22, 3, 1],
      [23, 1.6],
    ],
    F,
    P,
    { steps: 40 },
  ) as SolidPaths;
  const ribs = [4, 7, 10, 13, 16].map((s) => G.arcOf(F, s, 3.6, P) as string).join("");
  const bolts = [side3(shoeAt(0.5, -1), 4.9), side3(local(ARM_IN - 8, 0), 3.6)].map((p) => at(p));
  return { arm, shoe, tongue, grip, ribs, bolts };
}

// ── Tyre iron: rest on the base → spoon over the flange → pried down ─────────
const FULCRUM: UZ = [-FLANGE_R, RIM_TOP];
const IN_TIP: UZ = [-FLANGE_R + 3.2, RIM_TOP + 1.6];
const IN_ANGLE = 118 * RAD;
const PRY = 50 * RAD;
const CONTROL: UZ = [-128, 122];

export function ironPose(v: number): { tip: UZ; angle: number } {
  if (v <= 1) {
    const t = Math.max(0, v);
    const a = scale(IRON_REST_TIP, (1 - t) * (1 - t));
    const b = scale(CONTROL, 2 * t * (1 - t));
    const c = scale(IN_TIP, t * t);
    return { tip: plus(plus(a, b), c), angle: Math.PI + (IN_ANGLE - Math.PI) * (t * t * (3 - 2 * t)) };
  }
  const k = Math.min(1, v - 1) * PRY;
  const tip = plus(FULCRUM, rotate([IN_TIP[0] - FULCRUM[0], IN_TIP[1] - FULCRUM[1]], k));
  return { tip, angle: IN_ANGLE + k };
}

function ironPaths(v: number) {
  const { tip, angle } = ironPose(v);
  const d: UZ = [Math.cos(angle), Math.sin(angle)];
  const n: UZ = [-d[1], d[0]];
  const local = (a: number, b: number): UZ => plus(tip, plus(scale(d, a), scale(n, b)));
  // the spoon bends 24° toward the wheel side of the shaft
  const bend = -24 * RAD;
  const sd = rotate(d, bend);
  const sn = rotate(n, bend);
  const spoonAt = (a: number, b: number): UZ => plus(local(9, 0), plus(scale(sd, a - 9), scale(sn, b)));
  const spoon = sidePrism([spoonAt(0, -1.1), spoonAt(9.4, -1.2), spoonAt(9.4, 1.2), spoonAt(0.8, 1.4)], -4.6, 4.6);
  const shaft = sidePrism([local(9, -1.2), local(IRON - 22, -1.2), local(IRON - 22, 1.2), local(9, 1.2)], -3.4, 3.4);
  const from = local(IRON - 23, 0);
  const to = local(IRON, 0);
  const F = G.frameAlong(at3(from[0], 0, from[1]), G.unit3(G.sub3(at3(to[0], 0, to[1]), at3(from[0], 0, from[1]))));
  const grip = G.solidOf(
    [
      [0, 3.2],
      [22, 3.2],
      [23, 2.6, 1],
      [23.6, 1.4],
    ],
    F,
    P,
    { steps: 40 },
  ) as SolidPaths;
  const ribs = [3, 6, 9, 12, 15, 18].map((s) => G.arcOf(F, s, 3.2, P) as string).join("");
  const rest = v < 0.02;
  return { spoon, shaft, grip, ribs, rest };
}

// ── Gauge needle ─────────────────────────────────────────────────────────────
export function needleOf(psi: number) {
  const angle = angleOfPsi(psi);
  const point = (along: number, across: number): Point3 => {
    const r = Math.hypot(along, across);
    const t = Math.atan2(across, along);
    return facePoint(r, angle + t, 117.15);
  };
  return pathOf([point(GAUGE_R - 4.2, 0), point(0, 0.8), point(-3.2, 0.4), point(-3.2, -0.4), point(0, -0.8)].map((p) => at(p)), true);
}

// ── Hose from the gauge fitting to the valve chuck ───────────────────────────
const HOSE_R = 1.5;
const hoseRoute = (): Point3[] => {
  const out = G.add3(HOSE_START, G.mul3(HOSE_DIR, 5));
  const drop: Point3 = [out[0] + HOSE_DIR[0] * 6, out[1] + HOSE_DIR[1] * 6, out[2] - 10];
  const chuckEnd = VALVE_TIP;
  const above = G.add3(chuckEnd, G.mul3(VALVE_DIR, 7));
  return G.fillet([HOSE_START, out, drop, above, chuckEnd], 5, 8, { P, tube: HOSE_R }) as Point3[];
};

export const HOSE = (() => {
  const pieces = tubePieces(hoseRoute(), HOSE_R, P, { maxLength: 80 }) as Array<{ mid: Point3 }>;
  return pieces.map((piece) => tubeSvg(piece, { tone: "mid" }) as string).join("");
})();

// ── Tyre ─────────────────────────────────────────────────────────────────────
const LOW_BEAD = FLANGE_IN_LO + 0.4;
const RIM_LINE_R = 83;
const ellipseInside = (r: number, z: number) => {
  const centre = at([0, 0, z]);
  const a = r * Math.sqrt(1.6) * P.scale;
  const b = a * Math.sin(38 * RAD);
  return (p: Flat) => ((p[0] - centre[0]) / a) ** 2 + ((p[1] - centre[1]) / b) ** 2 <= 1 + 1e-9;
};

function lens(r: number, z0: number, z1: number) {
  const inLow = ellipseInside(r, z0);
  const inTop = ellipseInside(r, z1);
  const top = circleFlat(r, z1, 160);
  const low = circleFlat(r, z0, 160);
  const points = [...top.filter(inLow), ...low.filter(inTop)];
  if (points.length < 3) return { fill: "", near: "", far: "" };
  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  points.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  const ordered = (list: Flat[]) => [...list].sort((a, b) => a[0] - b[0]);
  return { fill: pathOf(points, true), near: pathOf(ordered(top.filter(inLow))), far: pathOf(ordered(low.filter(inTop))) };
}

// Everything below the line through the projected centre of height z, minus the lower
// half of the ellipse of radius r at that height.
export function belowOutside(r: number, z: number) {
  const centre = at([0, 0, z]);
  const half = circleFlat(r, z, 180)
    .filter(([, y]) => y >= centre[1] - 1e-6)
    .sort((a, b) => a[0] - b[0]);
  const a = r * Math.sqrt(1.6) * P.scale;
  const lower = [[centre[0] - a, centre[1]] as Flat, ...half, [centre[0] + a, centre[1]] as Flat];
  return `M-60 ${tenth(centre[1])}H${WIDTH + 60}V${HEIGHT + 60}H-60Z` + pathOf(lower, true);
}

// The far half of the tyre's inside, between its two beads: what shows through a lifted tyre.
function innerWall(z0: number, z1: number) {
  const a: Flat[] = [];
  const b: Flat[] = [];
  const view = G.viewOf(P);
  const phi = Math.atan2(view[1], view[0]);
  for (let index = 0; index <= 96; index++) {
    const t = phi + Math.PI / 2 + (index / 96) * Math.PI;
    a.push(at([BEAD_R * Math.cos(t), BEAD_R * Math.sin(t), z0]));
    b.push(at([BEAD_R * Math.cos(t), BEAD_R * Math.sin(t), z1]));
  }
  return pathOf([...a, ...b.reverse()], true);
}

export interface TyreFrame {
  paths: SolidPaths;
  line: string;
  inner: string;
  hole: string;
  near: string;
  far: string;
  front: string;
}

export function tyreOf(drop: number, over: number): TyreFrame {
  const top = topBeadZ(drop, over);
  const { fill, near, far } = lens(BEAD_R, LOW_BEAD, top);
  // the moulded rim line: even all round above the flange once the bead has seated
  const line = pathOf(circleFlat(RIM_LINE_R, surfaceAt(RIM_LINE_R, drop, over) + 0.05, 140), true);
  return { paths: tyrePaths(drop, over, 0), line, inner: innerWall(LOW_BEAD, top), hole: fill, near, far, front: belowOutside(BEAD_R, top) };
}

export const liftOf = (lift: number) => translateAlong(P, [0, 0, lift * LIFT]);

export interface Frame {
  tyre: TyreFrame | null;
  lift: string;
  needle: string;
  breaker: ReturnType<typeof breakerPaths>;
  iron: ReturnType<typeof ironPaths>;
}

export function frameOf(pose: Pose, last: { drop: number; over: number } | null): Frame {
  const rebuild = !last || Math.abs(last.drop - pose.drop) > 0.004 || Math.abs(last.over - pose.over) > 0.004;
  return {
    tyre: rebuild ? tyreOf(pose.drop, pose.over) : null,
    lift: liftOf(pose.lift),
    needle: needleOf(pose.psi),
    breaker: breakerPaths(breakerAngle(pose)),
    iron: ironPaths(pose.lever),
  };
}
