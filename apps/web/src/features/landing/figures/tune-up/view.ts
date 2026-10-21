import { boxCorners, fitProjection, iso, type Plan, type Point3 } from '@/shared/iso/iso-kit';

/**
 * The bench's world: x runs with the air (left to right), y into the depth, z up, in units of
 * about a millimetre of a real 150 cc single. Everything else in the figure is placed from here.
 */
export const WIDTH = 660;
export const HEIGHT = 400;
const AZIMUTH = 50;

export const BASE: Plan = { x: -168, y: -68, w: 336, d: 136, r: 8 };
export const BASE_H = 9;
export const FOOT_H = 5;

/** The height the intake runs at, from the airbox to the inlet port. */
export const TRACT_Z = 33;

export const AIRBOX: Plan = { x: -152, y: -34, w: 60, d: 68, r: 5 };
export const AIRBOX_H = 50;
export const AIRBOX_LID = 40;
/** The intake snorkel, which stands clear of the lid so the air's way in is visible. */
export const SNORKEL: Plan = { x: -170, y: -14, w: 26, d: 28, r: 5 };
export const SNORKEL_Z = 30;
export const SNORKEL_TOP = 60;

export const BOOT: Plan = { x: -92, y: -13, w: 28, d: 26, r: 8 };
export const BOOT_Z = TRACT_Z - 13;
export const BOOT_H = 26;

export const CARB: Plan = { x: -64, y: -22, w: 46, d: 44, r: 6 };
export const CARB_Z = 14;
export const CARB_H = 40;
export const CARB_TOP = CARB_Z + CARB_H;
export const BOWL: Point3 = [-41, 0, 2];
export const BOWL_R = 17;
export const BOWL_H = 12;
export const CAP_R = 13;
export const CAP_H = 5;
export const SLIDE_R = 5;
/** The slide's stem at idle; opening the throttle lifts it by `LIFT`. */
export const SLIDE_Z = CARB_TOP + CAP_H;
export const SLIDE_H = 7;
export const LIFT = 15;
export const VENTURI_R = 9;

export const MANIFOLD: Plan = { x: -18, y: -12, w: 36, d: 24, r: 7 };
export const MANIFOLD_Z = TRACT_Z - 12;
export const MANIFOLD_H = 24;

export const HEAD: Plan = { x: 18, y: -30, w: 76, d: 60, r: 6 };
export const HEAD_Z = 4;
export const FINS = 6;
export const FIN_PITCH = 7;
export const FIN_H = 3;
export const FIN_OUT = 5;
export const HEAD_TOP = HEAD_Z + FINS * FIN_PITCH;
export const COVER_H = 18;
export const COVER_TOP = HEAD_TOP + COVER_H;
/**
 * The combustion chamber, directly under the plug, and the window cut in the head's near face to
 * look into it. It sits in the head casting above the barrel's fins, which is where it is on the
 * engine too.
 */
export const CHAMBER: Point3 = [56, HEAD.y + HEAD.d, HEAD_TOP + 9];
export const WINDOW_R = 8.5;

export const PLUG: Point3 = [56, 0, COVER_TOP];
export const PLUG_HEX_R = 7;
export const PLUG_BODY_R = 5;
export const PLUG_CAP_R = 6;

export const COIL: Plan = { x: 104, y: -58, w: 34, d: 22, r: 3 };
export const COIL_H = 18;

export const DIAL: Point3 = [118, 40, 0];
export const DIAL_STAND_R = 10;
export const DIAL_STAND_H = 14;
export const DIAL_R = 22;
export const DIAL_H = 8;
export const DIAL_TOP = DIAL_STAND_H + DIAL_H;
/** The sweep: 0 rpm points down-left, the top of the scale down-right. */
export const DIAL_FROM = (-120 * Math.PI) / 180;
export const DIAL_SPAN = (240 * Math.PI) / 180;

export const KNOB: Point3 = [-41, 52, 0];
export const KNOB_POST_R = 4;
export const KNOB_POST_H = 20;
export const KNOB_R = 11;
export const KNOB_H = 10;
export const KNOB_TOP = KNOB_POST_H + KNOB_H;

export const PLATE: Plan = { x: -150, y: 44, w: 60, d: 14, r: 2 };

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    ...boxCorners(AIRBOX, 0, AIRBOX_H),
    ...boxCorners(HEAD, HEAD_Z, COVER_TOP),
    [PLUG[0], PLUG[1], PLUG[2] + 32],
    [DIAL[0], DIAL[1], DIAL_TOP],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
