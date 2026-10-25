// @ts-nocheck -- Integration note, not the figure's own code: this drawing was built outside
// this app against the kit and is copied in as its author wrote it. It predates this project's
// `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and patching the index reads
// would turn every refresh into a merge. Its exported types still reach callers.
import { fitProjection, iso, type Flat, type Point3, type Projection } from "../../../../shared/iso/iso-kit";

// World units are 3 mm. x and y on the floor, z up. The wheel's axis is the z axis.
// u runs to the right of the screen and w toward the viewer, both on the floor.

export const WIDTH = 600;
export const HEIGHT = 470;
export const AZIMUTH = 45;
export const ELEVATION = 38;

const A = (AZIMUTH * Math.PI) / 180;
export const SIN_A = Math.sin(A);
export const COS_A = Math.cos(A);

export const uw = (u: number, w: number): [number, number] => [u * SIN_A + w * COS_A, -u * COS_A + w * SIN_A];
export const at3 = (u: number, w: number, z: number): Point3 => [...uw(u, w), z];

export const U_DIR: Point3 = [SIN_A, -COS_A, 0];
export const W_DIR: Point3 = [COS_A, SIN_A, 0];
export const AWAY: Point3 = [-COS_A, -SIN_A, 0];

// Base plate on four feet.
export const BASE = { x: -132, y: -132, w: 264, d: 264, r: 10 };
export const BASE_H = 9;
export const FOOT_H = 6;

// Rim, 5.50 × 17: bead seat Ø 431.8 mm, 139.7 mm between the flanges.
export const AXIS_Z = 68;
export const BEAD_R = 72; // 215.9 mm
export const FLANGE_R = 78;
export const FLANGE_T = 2.4;
export const RIM_HALF = 23.3;
export const FLANGE_IN_LO = AXIS_Z - RIM_HALF; // 44.7
export const FLANGE_IN_HI = AXIS_Z + RIM_HALF; // 91.3
export const RIM_LO = FLANGE_IN_LO - FLANGE_T; // 42.3
export const RIM_TOP = FLANGE_IN_HI + FLANGE_T; // 93.7
export const LIP_R = 70.5; // inside of the barrel at the bead seat
export const WELL_R = 64; // drop centre, outside
export const WELL_IN = 62.5; // drop centre, inside
export const WELL_LO = 58;
export const WELL_HI = 78;

// Tyre, 180/55: 99 mm sidewall, Ø 629.8 mm outside, 180 mm wide.
export const TYRE_R = 105;
export const TYRE_LO = AXIS_Z - 30; // 38
export const TYRE_HI = AXIS_Z + 30; // 98
export const LIFT = 56;

// Hub, clamp cone, nut, post and the inflation gauge on top.
export const HUB_R = 20;
export const HUB_LO = 50;
export const HUB_HI = 84;
export const NUT_LO = 90;
export const NUT_HI = 97;
export const POST_HI = 108;
export const GAUGE_R = 16;
export const GAUGE_LO = POST_HI;
export const GAUGE_HI = 117;

// Valve between two spokes on the far side of the drop centre.
export const VALVE_ANGLE = 153; // degrees in the floor plane: left of the hub, a little behind it
export const SPOKES = 5;

// Bead breaker, in the plane w = 0 to the right of the wheel.
export const BREAKER_U = 152;
export const PIVOT_Z = 112;
export const ARM_IN = 64; // pivot to the shoe
export const ARM_OUT = 50; // pivot to the handle end
export const SHOE = 15;
export const SHOE_R = BREAKER_U - ARM_IN; // 88, where the shoe meets the sidewall
export const BREAKER_REST = 55; // degrees above level, raised clear of a lifted tyre

// Tyre iron, in the plane w = 0 to the left of the wheel.
export const IRON = 72;
export const IRON_REST_TIP: [number, number] = [-101, 1.3];

const rimPoints = (z: number, r: number, count = 16): Point3[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return [r * Math.cos(angle), r * Math.sin(angle), z];
  });

const corners = ({ x, y, w, d }: typeof BASE, z0: number, z1: number): Point3[] => {
  const out: Point3[] = [];
  for (const px of [x, x + w]) for (const py of [y, y + d]) for (const z of [z0, z1]) out.push([px, py, z]);
  return out;
};

export const P: Projection = fitProjection(
  [
    ...corners(BASE, -BASE_H - FOOT_H, 0),
    ...rimPoints(TYRE_HI + LIFT, TYRE_R),
    at3(BREAKER_U + ARM_OUT + 4, 0, PIVOT_Z - 46),
    at3(BREAKER_U + ARM_OUT + 6, 0, PIVOT_Z + 8),
  ],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: AZIMUTH, elevation: ELEVATION },
);

export const at = (point: Point3): Flat => iso(point, P);
export const fine = (value: number) => Math.round(value * 100) / 100;
