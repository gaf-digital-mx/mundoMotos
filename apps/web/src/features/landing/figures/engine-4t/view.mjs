// The camera and the frames every part is placed in, shared by the build and the live figure.
import * as k from "../../../../shared/iso/iso-kit.mjs";
import * as G from "../../../../shared/iso/lathe.mjs";
import { Z0, DECK, HEAD_TOP, CASE_TOP, LIFT, VALVES, VALVE_TILT } from "./model.mjs";

export const W = 820;
export const H = 1060;
export const AZIMUTH = 62;
export const ELEVATION = 24;
export const PLATE = { x: -170, y: -120, w: 340, d: 230, r: 9 };

export const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -22, 0),
    [-150, 0, HEAD_TOP + LIFT.head + 10],
    [150, 0, DECK + 120 + LIFT.valves],
    [0, -40, DECK + 100 + LIFT.valves],
  ],
  W,
  H,
  { pad: 26, azimuth: AZIMUTH, elevation: ELEVATION },
);
export const at = (point) => k.iso(point, P);
export const X = [1, 0, 0];
export const Y = [0, 1, 0];
export const Z = [0, 0, 1];

// the crank turns about +y; the cutaway plane is y = 0
export const CRANK_F = G.frameOf([0, 0, Z0], Y, X, Z);
const rad = (deg) => (deg * Math.PI) / 180;
export const valveAxis = (side) => [side * Math.sin(rad(VALVE_TILT)), 0, Math.cos(rad(VALVE_TILT))];
export const VALVE_SEAT_Z = DECK + 7;
export const valveFrame = (id) => {
  const v = VALVES[id];
  const a = valveAxis(v.side);
  return G.frameOf([v.x, 0, VALVE_SEAT_Z], a, Y, G.cross3(a, Y));
};
// where each valve's spring sits on the head top, measured along its axis
export const springSeat = (id) => (HEAD_TOP - VALVE_SEAT_Z) / valveAxis(VALVES[id].side)[2];
export const RETAINER_S = (id) => springSeat(id) + 34;
export { CASE_TOP };
