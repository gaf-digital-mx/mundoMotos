import {
  lineOnTop,
  pathOf,
  pointsAt,
  translateAlong,
  type Plane,
  type Point3,
} from '@/shared/iso/iso-kit';

import { clamp, IDLE_RPM, sweepAt } from './engine';
import { STOP_ANGLES } from './geometry';
import { P } from './view';
import * as V from './view';

/** Everything in the drawing that changes while the throttle moves. */
export type Frame = {
  /** Transform for the carburettor's slide stem. */
  slide: string;
  cable: string;
  index: string;
  needle: string;
};

const KNOB: Plane = [V.KNOB[0], V.KNOB[1]];
const STEM: Plane = [V.BOWL[0], V.BOWL[1]];
const FACE_R = V.DIAL_R - 4.5;

/** Dial angles run clockwise from straight back, which is what `radialTicks` lays the scale on. */
const onDial = (angle: number, radius: number): Plane => [
  V.DIAL[0] + radius * Math.sin(angle),
  V.DIAL[1] - radius * Math.cos(angle),
];

const onKnob = (angle: number, radius: number): Plane => [
  KNOB[0] + radius * Math.sin(angle),
  KNOB[1] - radius * Math.cos(angle),
];

export const liftAt = (throttle: number) => clamp(throttle) * V.LIFT;

export function frameOf(throttle: number, rpm: number): Frame {
  const open = clamp(throttle);
  const lift = liftAt(open);
  const stemTop = V.SLIDE_Z + V.SLIDE_H + lift;
  const [shut, wide] = STOP_ANGLES;
  const knobAngle = shut + (wide - shut) * open;
  const needle = V.DIAL_FROM + V.DIAL_SPAN * sweepAt(rpm);

  return {
    slide: translateAlong(P, [0, 0, lift]),
    // The cable leaves the knob's rim at a nipple, runs up behind it, is tied to the lug on the
    // carburettor's face and turns over the cap into the slide. Cables are tied to the engine,
    // never strung through the air.
    cable: pathOf(
      pointsAt(
        [
          [...onKnob(knobAngle + Math.PI, V.KNOB_R), V.KNOB_POST_H + V.KNOB_H / 2],
          [KNOB[0], KNOB[1] - 6, V.KNOB_TOP + 8],
          [KNOB[0], V.CARB.y + V.CARB.d + 2.5, 40],
          [KNOB[0], V.CARB.y + V.CARB.d + 1.5, 49],
          [KNOB[0], V.CARB.y + V.CARB.d - 6, stemTop + 5],
          [STEM[0], STEM[1], stemTop + 1],
        ] as Point3[],
        P,
      ),
    ),
    index: lineOnTop(onKnob(knobAngle, 3), onKnob(knobAngle, V.KNOB_R - 1), V.KNOB_TOP, P),
    needle: lineOnTop(
      onDial(needle + Math.PI, 5),
      onDial(needle, FACE_R - 1.5),
      V.DIAL_TOP + 1.2,
      P,
    ),
  };
}

/** The resting pose: throttle shut, engine idling. Rendered before the loop starts. */
export const REST = frameOf(0, IDLE_RPM);
