// Types for gl.mjs, so TypeScript callers get checked arguments.
type Uniform = number | number[] | Float32Array;
export interface GlCamera {
  origin: number[];
  k: number;
  cam: number[];
}
export interface GlLayer {
  gl: WebGLRenderingContext;
  extensions: string[];
  set(values: Record<string, Uniform>): void;
  draw(values: Record<string, Uniform>, time: number): void;
  clear(): void;
}
export const GLSL_ISO: string;
export const GLSL_TURN: string;
export function glslPose(name: string, prefix?: string): string;
export function glCamera(projection: {
  origin: number[];
  scale: number;
  azimuth?: number;
  elevation?: number;
}): GlCamera;
export function glLayer(options: {
  canvas: HTMLCanvasElement;
  fragment: string;
  view: [number, number];
  camera: GlCamera;
  uniforms?: string[];
  fixed?: Record<string, Uniform>;
  extensions?: string[];
  maxRatio?: number;
  onError?: (message: string) => void;
}): GlLayer | null;
export function smooth(a: number, b: number, x: number): number;
export function burst(age: number, rise: number, fall: number): number;
export function settle(
  state: { x: number; v: number },
  target: number,
  dt: number,
  seconds: number,
  calm?: boolean,
): boolean;
