// Types for model.mjs. The module itself is the figure's own, copied in as its author wrote it;
// this file is integration glue, because this project's TypeScript runs with `allowJs: false`
// and `figure.tsx` and `live.tsx` import from it.
export type Vec3 = [number, number, number];

export const BORE: number;
export const STROKE: number;
export const ROD: number;
export const PIN_TO_CROWN: number;
export const SKIRT: number;
export const COMPRESSION: number;
export const R_BORE: number;
export const CRANK_R: number;
export const Z0: number;
export const CASE_TOP: number;
export const DECK: number;
export const HEAD_TOP: number;

export const TIMING: {
  ivo: number;
  ivc: number;
  evo: number;
  evc: number;
  spark: number;
  lift: number;
};
export const VALVE_TILT: number;
export const VALVES: Record<'intake' | 'exhaust', { x: number; r: number; side: number }>;

export function crankAt(deg: number): {
  pin: [number, number];
  piston: number;
  rod: number;
  crown: number;
};
export function intakeLift(deg: number): number;
export function exhaustLift(deg: number): number;
export function strokeOf(deg: number): { name: string; what: string; from: number };
export function gasAt(deg: number): {
  crown: number;
  volume: number;
  fresh: number;
  flame: number;
  front: number;
  burnt: number;
  intakeFlow: number;
  exhaustFlow: number;
  spark: number;
};

export const PARTS: readonly { id: string; name: string; say: string }[];
export const LIFT: Record<string, number>;
export const STAGGER: readonly string[];
export const SPRING: { stagger: number; stiffness: number; damping: number; substeps: number };
export const RPM_SHOWN: number;

export function readoutOf(state: {
  moving: boolean;
  apart: boolean;
  running: boolean;
  deg: number;
  part: string | null;
}): string;
