// Types for moving.mjs, for the same reason as `model.d.mts`: integration glue, not part of the
// figure, which is copied in as its author wrote it.
import type { Vec3 } from './model.mjs';

/** The five path groups the kit paints a solid from. */
export interface SolidPaths {
  fill: string;
  outline: string;
  crease: string;
  top: string;
  shades: string[];
}

export const ROD_HALF: number;
export const BIG_END: number;
export const SMALL_END: number;
export const PIN_R: number;
export const WEB: { y0: number; y1: number; r: number };

export function pinAt(deg: number): Vec3;
export function rodPaths(deg: number): {
  paths: SolidPaths;
  bearing: string;
  capLine: string;
  rib: string;
  big: Vec3;
  small: Vec3;
  u: Vec3;
};
export function counterweightPath(deg: number): string;
export function pinPaths(deg: number): SolidPaths;
export function springPaths(id: string, lift: number): { back: string; front: string; s1: number };
